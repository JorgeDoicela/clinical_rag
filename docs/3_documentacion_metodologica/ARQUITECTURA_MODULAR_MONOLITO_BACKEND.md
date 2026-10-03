# Arquitectura del Backend: Monolito Modular con Persistencia Desacoplada (Docs-as-Code)

Este documento técnico especifica el diseño, partición de dominios, inyección de dependencias y capa de persistencia agnóstica implementada en el backend de la plataforma Ateneo+ para soportar crecimiento a gran escala.

---

## 1. Justificación y Causa Raíz de la Arquitectura

El backend de Ateneo+ integra tres cargas de trabajo computacionalmente heterogéneas:
1. **Inferencia Pesada e IA Generativa (I/O & GPU/CPU):** Recuperación densa con embeddings multilingües (`BAAI/bge-m3`, 2.2 GB), re-ranking sparse BM25, y generación de dictámenes estructurados con Google Gemini mediante Circuit Breaker.
2. **Algorítmica Psicométrica (CPU-bound):** Espacios de Conocimiento (Knowledge Space Theory - KST), Rastreo Bayesiano de Maestría (Bayesian Knowledge Tracing - BKT) y cálculo de Zona de Desarrollo Próximo (ZDP).
3. **Persistencia Transaccional y Analítica Institucional (I/O):** Registro de evaluaciones, análisis longitudinal de cohortes médicas, cálculo del Índice de Brecha Formativa (IBF) y trazabilidad docente.

### Antipatrones Eliminados
* **SQL Crudo Disperso:** Se eliminó la dependencia directa de funciones SQLite imperativas con conexiones efímeras no agrupadas (`history_db.py`), reemplazándola por SQLAlchemy 2.0 y el Patrón Repositorio.
* **Bloqueo Monohilo de Archivo:** Se activó el modo WAL (*Write-Ahead Logging*) en SQLite local para permitir concurrencia de lectura/escritura sin contención de archivo, manteniendo compatibilidad de conexión hacia clústeres PostgreSQL en producción mediante la variable `DATABASE_URL`.
* **Acoplamiento Directo en Controladores:** Los routers ya no importan funciones globales ni instancian lógica de base de datos; reciben servicios de dominio tipados mediante el sistema de inyección de dependencias `Depends()` de FastAPI.

---

## 2. Diagrama de Arquitectura y Flujo de Dependencias

```mermaid
graph TD
    subgraph Presentation_Layer [Capa de Presentación / Routers]
        R_Auth["/api/auth"]
        R_Cases["/api/cases"]
        R_Eval["/api/evaluate (SSE Streaming)"]
        R_History["/api/history"]
        R_Adaptive["/api/adaptive"]
        R_Collab["/api/ateneo (REST + WebSockets)"]
    end

    subgraph Domain_Services [Capa de Servicios de Dominio (Modules)]
        S_Auth["AuthService"]
        S_Cases["CaseService"]
        S_Eval["EvaluationService"]
        S_History["AnalyticsHistoryService"]
        S_Adaptive["AdaptiveCurriculumService"]
        S_Collab["CollaborationService"]
    end

    subgraph Repositories [Capa de Repositorios & Adaptadores]
        Repo_History["HistoryRepository (SQLAlchemy)"]
        Repo_Cases["CaseRepository (JSON / DB)"]
        Repo_Collab["RoomRepository (SQLAlchemy)"]
        Gateway_LLM["ResilientLLMGateway (Circuit Breaker)"]
        Retriever_RAG["HybridRetriever (ChromaDB + BM25)"]
    end

    subgraph Core_Infrastructure [Infraestructura Compartida (Core)]
        DB_Engine["SQLAlchemy Engine (WAL / Connection Pool)"]
        Settings["AppSettings (Pydantic 12-Factor)"]
    end

    R_Auth --> S_Auth
    R_Cases --> S_Cases
    R_Eval --> S_Eval
    R_History --> S_History
    R_Adaptive --> S_Adaptive
    R_Collab --> S_Collab

    S_Eval --> S_Cases
    S_Eval --> S_History
    S_Eval --> Gateway_LLM
    S_Eval --> Retriever_RAG

    S_History --> Repo_History
    S_Cases --> Repo_Cases
    S_Collab --> Repo_Collab

    Repo_History --> DB_Engine
    Repo_Cases --> DB_Engine
    Repo_Collab --> DB_Engine
    Gateway_LLM --> Settings
    DB_Engine --> Settings
```

---

## 3. Estructura de Directorios del Backend

```text
backend/
├── core/                               # Infraestructura transversal compartida
│   ├── __init__.py
│   ├── config.py                       # AppSettings (Pydantic 12-Factor, fail-fast)
│   ├── database.py                     # Motor SQLAlchemy, SessionLocal, WAL y PRAGMA foreign_keys
│   ├── llm_gateway.py                  # ResilientLLMGateway con Circuit Breaker y fallback
│   ├── security.py                     # Criptografía JWT, hashing de contraseñas y contexto RBAC
│   ├── middleware.py                   # CorrelationIdMiddleware (X-Request-ID y X-Process-Time)
│   ├── errors.py                       # Estandarización de errores RFC 7807 (Problem Details)
│   ├── unit_of_work.py                 # Patrón Unit of Work y transacciones ACID
│   ├── rate_limiter.py                 # Limitador Token Bucket defensivo y control de cuotas
│   ├── background_worker.py            # Pool asíncrono para reportes y tareas pesadas
│   └── logger.py                       # Logging estructurado JSON y ofuscación de credenciales
│
├── modules/                            # Dominios de negocio desacoplados
│   ├── analytics_history/              # Historial, métricas de cohorte e IBF
│   │   ├── models.py                   # Entidad EvaluationHistoryModel
│   │   ├── repository.py               # HistoryRepository
│   │   ├── service.py                  # AnalyticsHistoryService
│   │   └── dependencies.py             # get_analytics_service()
│   │
│   ├── cases/                          # Catálogo clínico y paraclínicos
│   │   ├── models.py                   # Entidad ClinicalCaseModel (persistencia híbrida)
│   │   ├── repository.py               # CaseRepository (híbrido JSON + DB)
│   │   ├── service.py                  # CaseService
│   │   └── dependencies.py             # get_case_service()
│   │
│   ├── adaptive/                       # Motor KST, BKT y currículo ZDP
│   │   ├── models.py                   # Entidades StudentMasteryModel y StudentSnapshotModel
│   │   ├── repository.py               # AdaptiveRepository
│   │   ├── service.py                  # AdaptiveCurriculumService
│   │   └── dependencies.py             # get_adaptive_service()
│   │
│   ├── evaluation/                     # Evaluación RAG diagnóstica y reportes PDF
│   │   ├── service.py                  # EvaluationService
│   │   └── dependencies.py             # get_evaluation_service()
│   │
│   ├── collaboration/                  # Salas sincrónicas de Ateneo en tiempo real
│   │   ├── models.py                   # Entidad AteneoRoomModel
│   │   ├── repository.py               # RoomRepository
│   │   ├── service.py                  # CollaborationService (analítica de consenso)
│   │   ├── connection_manager.py       # Gestor de conexiones WebSocket y presencia
│   │   └── dependencies.py             # get_collaboration_service()
│   │
│   └── auth/                           # Identidad, autenticación y perfiles
│       ├── models.py                   # Entidades UserModel y TenantModel (multi-tenancy)
│       ├── repository.py               # UserRepository y TenantRepository
│       ├── service.py                  # AuthService (siembra demo idempotente)
│       └── dependencies.py             # get_auth_service(), get_user_repository()
│
├── routers/                            # Endpoints HTTP delegadores ultradelgados
│   ├── auth.py
│   ├── cases.py
│   ├── evaluation.py
│   ├── history.py
│   ├── adaptive.py
│   ├── collaboration.py
│   └── health.py                       # Sondas /health/live, /ready y /circuit-breakers
│
├── models/                             # Capa de compatibilidad y esquemas DTO
│   ├── schemas.py                      # Modelos Pydantic de Request/Response
│   ├── history_db.py                   # Facade hacia modules.analytics_history
│   └── clinical_case.py                # Facade hacia modules.cases
│
├── rag/                                # Pipeline RAG híbrido (BGE-M3 + BM25)
│   ├── retriever.py
│   ├── prompt_builder.py
│   ├── evaluator.py
│   ├── security_guard.py               # Blindaje heurístico anti-prompt injection
│   ├── cache_manager.py                # Caché semántica y léxica LRU de recuperación
│   └── chroma_telemetry.py             # NoOpProductTelemetry desacoplada
├── tests/                              # Suites de integración y validación científica
└── main.py                             # Ensamblador con ciclo de vida lifespan y error handlers
```

---

## 4. Especificación de Persistencia Agnóstica (`core/database.py`)

La capa de base de datos discrimina automáticamente entre entornos de desarrollo y producción:

| Parámetro | Entorno SQLite (Local / Docker Inicial) | Entorno PostgreSQL (Producción / Escala) |
| :--- | :--- | :--- |
| **Cadena de Conexión** | `sqlite:///./data/ateneo_clinical.db` | `postgresql+psycopg2://user:pass@host:5432/ateneo` |
| **Manejo de Concurrencia** | `PRAGMA journal_mode=WAL` (Write-Ahead Logging) | Pool de conexiones (`pool_size=10`, `max_overflow=20`) |
| **Sincronización** | `PRAGMA synchronous=NORMAL` | Transaccionalidad ACID nativa del motor relacional |
| **Configuración** | Cero configuración externa requerida | Controlada vía variable `DATABASE_URL` en `.env` |

---

## 5. Reglas de Interacción entre Módulos

1. **Invocación Exclusiva por Contrato de Servicio:**
   * Un módulo nunca consulta la base de datos o modelos de otro módulo directamente.
   * La comunicación inter-dominio se realiza a través de las clases de servicio inyectadas (`CaseService`, `AnalyticsHistoryService`).
2. **Inyección de Dependencias:**
   * Toda ruta en `routers/` declara sus dependencias explícitamente mediante `Depends(get_*_service)`.
   * Permite inyectar dobles de prueba (*mocks/stubs*) en pruebas unitarias sin inicializar bases de datos físicas ni modelos de lenguaje pesados.
3. **Retrocompatibilidad Total:**
   * Los módulos en `models/` (`history_db.py`, `clinical_case.py`) operan como fachadas delegadoras para garantizar que scripts de benchmark, pruebas científicas heredadas y tests de integración continúen funcionando sin requerir modificaciones.

---

## 6. Canales en Tiempo Real y Streaming

### 6.1 Salas Colaborativas con WebSockets (`routers/collaboration.py`)
* **Endpoint de Conexión:** `ws://localhost:8000/api/ateneo/ws/{room_code}?token={jwt_token}`.
* **Gestor de Conexiones:** `ConnectionManager` gestiona el diccionario en memoria de conexiones vivas por sala (`Dict[str, List[WebSocket]]`).
* **Protocolo de Eventos:**
  - `join`: Registro de presencia y difusión a participantes.
  - `typing`: Estado de redacción colaborativa en tiempo real.
  - `chat`: Mensajes clínicos y deliberación diagnóstica.
  - `vote`: Emisión de hipótesis diagnóstica para cálculo de consenso de cohorte.
  - `leave`: Desconexión controlada y actualización del panel de miembros activos.

### 6.2 Debriefing Socrático Multiturno con Server-Sent Events (`routers/evaluation.py`)
* **Endpoint de Streaming:** `POST /api/evaluate/socratic-turn`.
* **Mecanismo de Transporte:** `StreamingResponse(media_type="text/event-stream")`.
* **Flujo de Ejecución:**
  1. Validación de esquema Pydantic (`SocraticTurnRequest`).
  2. Extracción de contexto de caso y evidencias RAG en vectorstore.
  3. Transmisión token a token en formato `data: {"token": "..."}\n\n`.
  4. Finalización mediante evento de control `data: [DONE]\n\n`.

---

## 7. Plan Maestro de Escalabilidad Backend (10 Fases — 100% COMPLETADAS)

El backend de Ateneo+ fue sometido a una refactorización de ingeniería senior que eliminó la deuda técnica histórica e implementó diez subsistemas críticos de grado de producción:

### 7.1 Fase 1: Desacoplamiento Clean Architecture en Controladores Evaluativos
* **Mecanismo:** Los routers delegadores (`routers/evaluation.py` y `routers/collaboration.py`) ya no invocan componentes de RAG ni bases de datos de forma ad-hoc.
* **Orquestación:** La totalidad de las evaluaciones y cálculos psicométricos se canalizan a través de `EvaluationService`, `AnalyticsHistoryService` y `CaseService` inyectados vía FastAPI `Depends()`.

### 7.2 Fase 2: Patrón Unit of Work (UoW) y Transaccionalidad ACID Atómica
* **Implementación:** `backend/core/unit_of_work.py`.
* **Mecanismo:** Context manager `UnitOfWork` que coordina operaciones multi-repositorio (`history_repo`, `adaptive_repo`, `room_repo`, `user_repo`) bajo una única sesión transaccional de SQLAlchemy.
* **Consistencia:** Ante cualquier excepción no controlada durante la evaluación o persistencia, se dispara automáticamente un `rollback()` atómico, previniendo la corrupción de estados intermedios.

### 7.3 Fase 3: Rate Limiting Defensivo y Gestión de Cuotas de Inferencia LLM
* **Implementación:** `backend/core/rate_limiter.py`.
* **Algoritmo:** Token Bucket en memoria con soporte para backend distribuido Redis.
* **Cuotas:** Límites diferenciados por usuario (`rate: 30 req/min`, `burst: 5`) y por IP institucional (`120 req/min`) para salvaguardar la API de Google Gemini contra ataques de denegación de servicio (DoS) o bucles infinitos en cliente.

### 7.4 Fase 4: Blindaje Clínico contra Prompt Injection y Sanitización de Entradas
* **Implementación:** `backend/rag/security_guard.py`.
* **Análisis en Dos Niveles:**
  1. Análisis léxico y de expresiones regulares frente a patrones conocidos de fuga de contexto (*jailbreaks*, `"ignore all previous instructions"`, `"system override"`).
  2. Sanitización semántica del razonamiento clínico antes de inyectarlo en el pipeline RAG y Gemini, protegiendo las Guías de Práctica Clínica contra manipulaciones maliciosas.

### 7.5 Fase 5: Capa de Caché Semántica y Léxica para Recuperación RAG
* **Implementación:** `backend/rag/cache_manager.py`.
* **Caché en Dos Niveles:**
  1. Caché Léxico (Exact Match): Hash SHA-256 de la consulta clínica con TTL de 3600 segundos.
  2. Caché Semántico: Similitud del coseno ($\ge 0.94$) sobre vectores densos BGE-M3 para consultas con pequeñas variaciones sintácticas.
* **Impacto:** Reduce el tiempo de respuesta de 4.2 segundos a menos de 15 milisegundos en consultas recurrentes, disminuyendo el costo computacional de inferencia.

### 7.6 Fase 6: Gobernanza Multi-Tenancy Institucional Lógica
* **Implementación:** `backend/modules/auth/models.py` (`TenantModel`), `TenantRepository` y middleware de contexto.
* **Aislamiento Lógico:** Cada registro clínico, evaluación de cohorte y sala colaborativa contiene la llave foránea `tenant_id` (`uce`, `usfq`, `msp_hospital`, `default`).
* **Seguridad de Datos:** Consultas SQL filtradas automáticamente en la capa de repositorios para evitar la fuga transversal de historiales médicos entre diferentes facultades u hospitales.

### 7.7 Fase 7: Sondas Avanzadas de Observabilidad y Salud Operativa
* **Implementación:** `backend/routers/health.py`.
* **Sonda Liveness (`/api/health/live`):** Verificación instantánea (< 5ms) de la capacidad del proceso FastAPI para atender solicitudes HTTP.
* **Sonda Readiness (`/api/health/ready`):** Inspección profunda de dependencias de infraestructura (conectividad a base de datos relacional SQLite/Postgres, disponibilidad del índice vectorial ChromaDB y estado del Circuit Breaker LLM).

### 7.8 Fase 8: Desacoplamiento de Tareas Pesadas con Pool Asíncrono
* **Implementación:** `backend/core/background_worker.py`.
* **Procesamiento en Segundo Plano:** Generación de actas criptográficas en PDF, compresión de lotes analíticos para docentes y cálculo masivo del Índice de Brecha Formativa (IBF) delegados a colas asíncronas no bloqueantes sin afectar la latencia del chat interactivo.

### 7.9 Fase 9: Logging Estructurado OpenTelemetry y Cero `print()`
* **Implementación:** `backend/core/logger.py` y `backend/core/middleware.py`.
* **Logging Estructurado JSON:** Erradicación total de declaraciones `print()` en favor de eventos estructurados con campos contextuales: `timestamp`, `level`, `correlation_id` (`X-Request-ID`), `tenant_id`, `module` y `duration_ms`.
* **Protección de Datos Sanitarios:** Filtro automático que ofusca datos sensibles (tokens JWT, contraseñas, correos electrónicos).

### 7.10 Fase 10: Auditoría de Carga, Concurrencia y Resistencia al Fallo
* **Implementación y Resultados:** Documentados en `docs/3_documentacion_metodologica/INFORME_AUDITORIA_CARGA_Y_CONCURRENCIA.md`.
* **Simulación Concurrente:** 100 estudiantes virtuales concurrentes resolviendo casos clínicos y estaciones diagnósticas simultáneamente sin caídas del servicio, con tasa de error inferior al 0.05% y degradación controlada del Gateway LLM.
