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
        R_Eval["/api/evaluate"]
        R_History["/api/history"]
        R_Adaptive["/api/adaptive"]
    end

    subgraph Domain_Services [Capa de Servicios de Dominio (Modules)]
        S_Auth["AuthService"]
        S_Cases["CaseService"]
        S_Eval["EvaluationService"]
        S_History["AnalyticsHistoryService"]
        S_Adaptive["AdaptiveCurriculumService"]
    end

    subgraph Repositories [Capa de Repositorios & Adaptadores]
        Repo_History["HistoryRepository (SQLAlchemy)"]
        Repo_Cases["CaseRepository (JSON / DB)"]
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

    S_Eval --> S_Cases
    S_Eval --> S_History
    S_Eval --> Gateway_LLM
    S_Eval --> Retriever_RAG

    S_History --> Repo_History
    S_Cases --> Repo_Cases

    Repo_History --> DB_Engine
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
│   ├── database.py                     # Motor SQLAlchemy, SessionLocal, modo WAL
│   ├── llm_gateway.py                  # ResilientLLMGateway con Circuit Breaker
│   └── security.py                     # JWT, password hashing y contexto RBAC
│
├── modules/                            # Dominios de negocio desacoplados
│   ├── analytics_history/              # Historial, métricas de cohorte e IBF
│   │   ├── models.py                   # Entidad EvaluationHistoryModel
│   │   ├── repository.py               # HistoryRepository
│   │   ├── service.py                  # AnalyticsHistoryService
│   │   └── dependencies.py             # get_analytics_service()
│   │
│   ├── cases/                          # Catálogo clínico y paraclínicos
│   │   ├── repository.py               # CaseRepository (con caché en memoria)
│   │   ├── service.py                  # CaseService
│   │   └── dependencies.py             # get_case_service()
│   │
│   ├── adaptive/                       # Motor KST, BKT y currículo ZDP
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
│   │   └── dependencies.py             # get_collaboration_service()
│   │
│   └── auth/                           # Identidad y emisión de credenciales
│       ├── service.py                  # AuthService
│       └── dependencies.py             # get_auth_service()
│
├── routers/                            # Endpoints HTTP delegadores ultradelgados
│   ├── auth.py
│   ├── cases.py
│   ├── evaluation.py
│   ├── history.py
│   ├── adaptive.py
│   └── collaboration.py
│
├── models/                             # Capa de compatibilidad y esquemas DTO
│   ├── schemas.py                      # Modelos Pydantic de Request/Response
│   ├── history_db.py                   # Facade hacia modules.analytics_history
│   └── clinical_case.py                # Facade hacia modules.cases
│
├── rag/                                # Pipeline RAG híbrido (BGE-M3 + BM25)
├── tests/                              # Suites de integración y validación científica
└── main.py                             # Ensamblador de la aplicación y ciclo de vida
```

---

## 4. Especificación de Persistencia Agnóstica (`core/database.py`)

La capa de base de datos discrimina automáticamente entre entornos de desarrollo y producción:

| Parámetro | Entorno SQLite (Local / Docker Inicial) | Entorno PostgreSQL (Producción / Escala) |
| :--- | :--- | :--- |
| **Cadena de Conexión** | `sqlite:///./data/history.db` | `postgresql+psycopg2://user:pass@host:5432/ateneo` |
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
