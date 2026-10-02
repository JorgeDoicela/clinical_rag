# Memoria del Proyecto — Ateneo+

Este archivo almacena el contexto operativo, decisiones de interfaz y lecciones aprendidas exclusivas de la plataforma Ateneo+ (React + Vite PWA).

---

## 1. Decisiones de Diseño y UI/UX Consolidadas

* **Paradigma Visual:** "Clínico Minimalista, Precisión Diagnóstica & IA de Vanguardia".
* **Fondo y Tarjetas:** Canvas `#f0f4f9` Material 3, tarjetas blancas amplias `rounded-[28px]` sin borde.
* **Prohibición de Cajas de Iconos:** Iconos `lucide-react` planos y limpios directamente sobre el lienzo.
* **Gradiente de Marca:** Cyan Clínico (`#06b6d4`), Azul Royal (`#2563eb`), Violeta IA (`#7c3aed`).
* **Layout Split-Screen:** 50% caso clínico (GPC, imágenes Rx/ECG/Labs) y 50% resolución evaluativa.
* **Cero emojis** en toda la interfaz y documentación.

---

## 2. Historial de Decisiones y Lecciones Aprendidas

* **Infraestructura de Pruebas Frontend (Vitest + RTL):**
  - Se configuró Vitest 5 con `@testing-library/react`, `@testing-library/jest-dom` y entorno `jsdom` en `frontend/vite.config.js` y `frontend/package.json`.
  - Se creó `frontend/src/setupTests.js` con polyfills para `matchMedia` y `ResizeObserver` (requerido por Recharts/SVG).
  - Cobertura completa de 12 suites y 44 pruebas unitarias y de integración en `frontend/src/__tests__/`:
    1. `client.test.js`: Contratos de API, JWT, headers y serialización multipart multimodal (7 tests).
    2. `FeedbackCard.test.jsx`: Dictamen formativo, citas MSP, Faithfulness Score y regla cero emojis (6 tests).
    3. `AdaptiveNextCase.test.jsx`: Selección de caso clínico en Zona de Desarrollo Próximo (ZDP) y justificación pedagógica KST/BKT (3 tests).
    4. `PhaseFeedbackCard.test.jsx`: Evaluación progresiva por fases clínicas (3 tests).
    5. `VoiceInputButton.test.jsx`: Dictado por voz (Web Speech API) y modo fallback (3 tests).
    6. `SkillRadarChart.test.jsx`: Renderizado de SVG de 4 ejes clínicos estandarizados (2 tests).
    7. `ProtectedRoute.test.jsx`: Guardias de navegación RBAC (Alumno, Docente, Administrador) (4 tests).
    8. `ImageUploadZone.test.jsx`: Detección automática de estudios paraclínicos (ECG, Rx, Labs) y gestión de archivos (3 tests).
    9. `Login.test.jsx`: Flujo de autenticación en dos pasos estilo Google Accounts con floating labels (5 tests).
    10. `AdminDashboard.test.jsx`: Consola de administración y sincronización de identidades de cohorte (3 tests).
    11. `CoordinatorAnalytics.test.jsx`: Panel de analítica B2B institucional, brechas de cohorte e IBF sin emojis (2 tests).
    12. `KnowledgeSpaceGraph.test.jsx`: Grafo topológico KST, nodos ordenados por prerrequisitos y modal reactivo (3 tests).
  - Detección y corrección de causa raíz: Eliminación del carácter Unicode decorativo en `FeedbackCard.jsx` preservando el estándar innegociable de cero emojis. Claves únicas en listas de `CoordinatorAnalytics.jsx`.

* **Infraestructura y Aceleración de Pruebas Backend:**
  - Se implementó `backend/tests/client_helper.py` (`get_test_client`) con detección de servidor FastAPI activo en `http://127.0.0.1:8000` y timeout de 120s para inferencias multimodales con Gemini. Esto previene la recarga duplicada en memoria del modelo transformer `bge-m3` (2.2 GB) durante tests unitarios.
  - Orquestador maestro consolidado en `backend/tests/run_all_tests.py` con 6 suites maestras:
    1. Seguridad Criptográfica, Tokens JWT y Roles RBAC (`test_auth_security.py`).
    2. Topología KST y Bayesian Knowledge Tracing (`test_adaptive_curriculum.py`).
    3. Diferenciadores Científicos: Faithfulness Score e IBF (`test_paper_differentiators.py`).
    4. Análisis Estadístico del Estudio Piloto de Hake Gain ($g=0.74$, $p<0.0001$) y exportación LaTeX (`pilot_study_analyzer.py`).
    5. Integración de Endpoints HTTP FastAPI (`test_api_endpoints.py`).
    6. Validación de los 12 Casos Clínicos GPC, Fusión Multimodal Simultánea (ECG+Rx) y Dictamen PDF con Sello SHA-256 (`test_multimodal_and_cases.py`).
  - Todas las suites ejecutadas y verificadas con 100% de aprobación (`PASS`).
  - Estandarización de entorno de pruebas con Python 3.11 vía `uv` (`backend/.venv`), migración de llamadas Pydantic a `model_dump()` y reconfiguración robusta de encoding UTF-8 en runners de benchmark para portabilidad multiplataforma.
* **Auditoría Integral de Sistema y Documentación Metodológica:**
  - Se verificó la totalidad del árbol documental (`README.md`, `docs/`, `docs/3_documentacion_metodologica/`, `docs/1_tablas_latex/`, `docs/5_capturas_sistema/`).
  - Se corrigió la discrepancia de motor vectorial en [docs/DESPLIEGUE_Y_ACCESO_CLOUDFLARE_TUNNEL.md](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/docs/DESPLIEGUE_Y_ACCESO_CLOUDFLARE_TUNNEL.md) (reemplazo de Qdrant por ChromaDB).
  - Se actualizó el estado de la simulación por fases en [docs/3_documentacion_metodologica/DISCUSION_LIMITACIONES_Y_TRABAJO_FUTURO.md](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/docs/3_documentacion_metodologica/DISCUSION_LIMITACIONES_Y_TRABAJO_FUTURO.md) para reflejar su implementación activa en `POST /api/evaluate/phase` y `SimulationStepper.jsx`, proyectando hacia árboles de decisión no lineales.
  - Ejecución en vivo de suites de pruebas con 100% de éxito:
    * Backend: 6 suites maestras aprobadas en 37s (`tests/run_all_tests.py`).
    * Frontend: 12 suites y 44 tests aprobados (`vitest run`).
    * Compilación de producción: `vite build` completado sin errores (1,604 módulos, PWA habilitada).
* **Arquitectura de Resiliencia de IA y Fuente Única de Configuración (Single Source of Truth):**
  - **12-Factor App & Centralización:** Se unificó toda la configuración en `.env` (raíz), eliminando la duplicidad en subcarpetas y vinculando directamente `docker-compose.yml` (`env_file: - .env`).
  - **AppSettings Tipado:** Se refactorizó `backend/config.py` con Pydantic para validación Fail-Fast de variables críticas al arranque (puertos, rutas absolutas, API key, JWT y orígenes permitidos).
  - **ResilientLLMGateway con Circuit Breaker:** Se implementó `backend/services/llm_gateway.py` desacoplando el acceso a modelos de IA. Incorpora máquina de estados (`CLOSED`, `OPEN`, `HALF_OPEN`) con cooldown configurable (`GEMINI_CIRCUIT_COOLDOWN_SECONDS=300`), discriminando entre errores fatales (401/403) y transitorios (404/429/503/timeouts) para conmutar sin latencia fantasma.
  - **Auditoría Empírica de Modelos y Degradación Gradual Clínica:**
    * Se comprobó empíricamente el nivel de servicio de la clave: `X-Gemini-Service-Tier: standard` (cuenta de pago).
    * Se constató la deprecación de endpoints como `gemini-2.5-flash` (HTTP 404).
    * Se consolidó la jerarquía de relevo por preservación de razonamiento diagnóstico:
      1. Primario: `gemini-3.8-flash` (máxima fidelidad clínica y JSON estricto).
      2. Respaldo 1: `gemini-3.7-flash` (potencia y profundidad diagnóstica equivalente).
      3. Respaldo 2: `gemini-3.5-flash` (alta velocidad con razonamiento sólido).
      4. Respaldo 3: `gemini-flash-latest` (alias canónico completo actualizado).
      5. Salvavidas extremo: `gemini-flash-lite-latest` (~818 ms, contingencia de saturación de cuota).
  - **Desacoplamiento de Consumidores:** `backend/rag/evaluator.py` y `backend/ingestion/ocr_service.py` delegan de forma transparente en `llm_gateway`, garantizando alta disponibilidad sin código duplicado.
* **Organización Modular Docs-as-Code (`docs/`):**
  - **Eliminación de Artefactos Sueltos:** Se reubicaron figuras PNG y tablas `.tex` dispersas en la raíz de `docs/` hacia `docs/1_tablas_latex/` y `docs/2_figuras_300dpi/`.
  - **Nueva Carpeta Temática:** Se creó `docs/6_despliegue_y_operaciones/` para albergar `DESPLIEGUE_Y_ACCESO_CLOUDFLARE_TUNNEL.md`.
  - **Corrección de Causa Raíz en Scripts de Prueba:** Se actualizaron `pilot_study_analyzer.py`, `run_faithfulness_benchmark.py`, `run_ibf_figure.py` y `run_kst_simulation.py` para exportar directamente a sus subcarpetas correspondientes, previniendo la contaminación de la raíz de `docs/`.
* **Arquitectura del Backend: Monolito Modular con Persistencia Desacoplada:**
  - **Estructuración por Dominios Autónomos:** Se crearon paquetes desacoplados en `backend/modules/` (`analytics_history`, `cases`, `adaptive`, `evaluation`, `collaboration`, `auth`), encapsulando modelos, esquemas, repositorios y servicios de dominio.
  - **Capa Transversal Core (`backend/core/`):** Centralización de configuración tipada (`core/config.py`), base de datos (`core/database.py`), seguridad (`core/security.py`) y resiliencia de inferencia (`core/llm_gateway.py`).
  - **Persistencia Agnóstica (SQLAlchemy 2.0):** Implementación de `core/database.py` con modo WAL (*Write-Ahead Logging*) en SQLite para concurrencia masiva sin contención de archivo, y soporte nativo para migrar a clústeres PostgreSQL mediante `DATABASE_URL` sin modificar código de la aplicación.
  - **Eliminación Total de Causa Raíz en Persistencia:** Se sustituyeron el SQL crudo imperativo de `history_db.py` (511 líneas) y de `room_session.py` (374 líneas) por modelos relacionales tipados (`EvaluationHistoryModel`, `AteneoRoomModel`) y repositorios de SQLAlchemy (`HistoryRepository`, `RoomRepository`).
  - **Inyección de Dependencias Formal (FastAPI `Depends`):** El 100% de los controladores en `routers/` (`auth`, `cases`, `evaluation`, `history`, `adaptive`, `collaboration`) reciben sus servicios tipados mediante proveedores de dependencias, permitiendo pruebas unitarias con mocks sin recargar modelos de embeddings.
  - **Retrocompatibilidad Defensiva:** Módulos legados (`models/history_db.py`, `models/room_session.py`, `models/clinical_case.py`, `config.py`) actúan como fachadas transparentes preservando el 100% de compatibilidad con suites de pruebas y scripts de análisis científico.
* **Arquitectura del Frontend: Feature-Driven Vertical Slices con Core Shared y Custom Hooks como ViewModel:**
  - **Partición en Módulos de Dominio (`frontend/src/modules/`):** Desacoplamiento por contexto clínico (`auth`, `cases`, `evaluation`, `collaboration`, `adaptive`, `analytics`), donde cada módulo posee sus propios endpoints API, controladores React y componentes de presentación.
  - **Capa Transversal Compartida (`frontend/src/core/`):** Abstracción común de red (`core/http/httpClient.js`) con inyección automática de Bearer JWT y control de errores, componentes visuales institucionales (`FloatingLabelInput`, `ClinicalButton`, `ClinicalCard`, `ClinicalBadge`) y layouts maestros (`Navbar`, `AppLayout`).
  - **Patrón ViewModel (Custom Hooks):** Se extrajo la lógica de negocio y los 14 estados acoplados de `CaseSolve.jsx` hacia `useCaseSolver.js` y `useVoiceRecognition.js`, de `CaseList.jsx` hacia `useCases.js`, de `AteneoRoom.jsx` hacia `useAteneoRoom.js`, de `TeacherDashboard.jsx` hacia `useAnalytics.js`, y de `AdaptiveNextCase.jsx` hacia `useAdaptiveCurriculum.js`.
  - **Optimización de Rendimiento y Code-Splitting:** Implementación de `React.lazy` y `Suspense` en `src/routes/AppRoutes.jsx`. Reducción del chunk inicial `dist/assets/index.js` de 338 kB a 184.88 kB (60.33 kB gzip, ~45% de reducción) y generación de chunks independientes para cada vista clínica.
* **Auditoría de Regresión End-to-End y Reproducibilidad Científica (100% Operatividad):**
  - **Desempaquetado de Carga Útil en APIs de Dominio:** Se normalizaron `casesApi`, `authApi`, `adaptiveApi`, `collaborationApi`, `analyticsApi` y `evaluationApi` para retornar directamente `res.data`, preservando el formato estructurado `{ data, status, ok }` de `httpClient` para las vistas de dashboard y visores de PDF.
  - **Alineación de Contratos Form-Data:** Se sincronizó `evaluationApi` con los parámetros exactos de FastAPI (`respuesta_estudiante` e `imagenes`).
  - **Corrección en Scripts de Reproducibilidad Científica:**
    * `run_ablation_study.py`: Se corrigió el escape de f-strings en `\end{{tabular}}` y la ruta de exportación hacia `docs/1_tablas_latex/tabla_ablacion_paper.tex`.
    * `run_kst_simulation.py`: Se corrigió el `NameError` de `OUTPUT_DIR` por `OUTPUT_PNG.parent`.
    * `generate_paper_tables_pdf.py`: Se eliminó la copia duplicada en la raíz de `docs/` y se creó el enlace simbólico `backend/scripts -> ../scripts` para ejecutar `docker compose exec backend python scripts/generate_paper_tables_pdf.py` sin discrepancias de directorio.
  - **Validación Completa en Vivo:**
    * Backend: 6 suites maestras aprobadas al 100% en 34.7s (`tests/run_all_tests.py`), recuperación RAG en 12/12 casos clínicos y evaluación multimodal con Gemini 3.8 Flash.
    * Frontend: 12 suites y 44 pruebas unitarias aprobadas en 6.6s (`npm run test`), build de producción completado en 3.75s (`npm run build`).
    * Compilación oficial: Compendio PDF del paper generado con 1.34 MB en `docs/4_pdf_compilado/COMPENDIO_TABLAS_Y_FIGURAS_PAPER.pdf`.
* **Consolidación de Persistencia Relacional Integral y Algoritmos Puros (Opción 1):**
  - **Identidad Persistente:** Se implementó `UserModel` y `UserRepository` en `backend/modules/auth/`, eliminando la dependencia volátil de memoria para usuarios. Incorporación de siembra automática e idempotente de perfiles demo en `init_database()`.
  - **Inyección de Dependencias en Seguridad:** Se adaptó `get_current_user` y `get_optional_current_user` en `backend/auth/security.py` para resolver credenciales contra `UserRepository` con FastAPI `Depends(get_db)`.
  - **Pureza Algorítmica en BKT:** Se refactorizó `backend/adaptive/knowledge_tracer.py` como un módulo matemático puro (sin I/O ni dependencias de base de datos). La coordinación de persistencia se trasladó a `AdaptiveCurriculumService` mediante `AdaptiveRepository` (`StudentMasteryModel`, `StudentSnapshotModel`) e `HistoryRepository`.
  - **Impacto Psicométrico en Evaluaciones:** `EvaluationService` actualiza el modelo BKT y genera snapshots longitudinales tras cada evaluación completada.
  - **Validación Completa:** 6 suites maestras del backend (100% PASS), 12 suites / 44 tests de frontend (100% PASS) y build de producción limpio en 10.74s.
* **Auditoría Arquitectónica Senior y Erradicación de Deuda Técnica / Parches:**
  - **Desacoplamiento Criptográfico (`backend/core/security.py`):** Se extrajo la capa de hashing y tokens JWT puros fuera de `auth/security.py`, eliminando la dependencia circular histórica entre el servicio de autenticación y las dependencias de seguridad HTTP.
  - **Inyección Limpia en Seguridad:** Se refactorizó `get_current_user` y `get_optional_current_user` en `backend/auth/security.py` para consumir directamente `UserRepository = Depends(get_user_repository)` mediante FastAPI DI estándar, erradicando el antipatrón `Depends(lambda: None)`, las aperturas ad-hoc con `SessionLocal()` y los bloques `try/except: pass` que silenciaban `HTTPException(401)`.
  - **Migración a FastAPI Lifespan Moderno:** Se sustituyó el decorador deprecado `@app.on_event("startup")` en `backend/main.py` por el context manager nativo `lifespan(app: FastAPI)`, integrando inicialización de BD relacional y precarga en segundo plano asíncrono.
  - **Inicialización Defensiva en Pruebas:** Se actualizó `backend/tests/client_helper.py` para inicializar el esquema relacional (`init_database()`) en el fallback de `TestClient(app)`, garantizando ejecución determinística de tests en bases de datos efímeras o frescas.
  - **Inyección Explícita de Estado Psicométrico en ZDP:** Se actualizó `select_optimal_next_case` en `backend/adaptive/curriculum_engine.py` para recibir `knowledge_state` de forma explícita. `AdaptiveCurriculumService` pasa el estado persistido directamente, eliminando el efecto secundario de precarga forzada en diccionarios globales mutables del módulo.
  - **Optimización de Consultas de Auth:** Se eliminó la llamada redundante a `seed_demo_users_if_needed()` en `get_auth_service` (`modules/auth/dependencies.py`), evitando ejecutar un `SELECT count(*)` en cada petición HTTP autenticada.
  - **Observabilidad en Impacto de Evaluación:** Se sustituyó el silenciamiento con `pass` en `EvaluationService` por logging estructurado con `logger.warning`, previniendo que anomalías psicométricas pasen inadvertidas.
* **Consolidación de Red Modular y Erradicación de Residuos Legados (Frontend):**
  - **Autonomía de `httpClient.js`:** Se eliminó la dependencia cruzada hacia `src/api/client.js`. `httpClient.js` resuelve de forma nativa la URL base según protocolo/entorno e inyecta dinámicamente los encabezados Bearer JWT desde `localStorage`.
  - **Desacoplamiento Total de Dominio:** Todos los módulos (`auth`, `adaptive`, `analytics`, `cases`, `evaluation`, `collaboration`) y `AuthContext` consumen exclusivamente sus APIs de dominio tipadas en `modules/*/api/`.
  - **Eliminación de Capas Fachada:** Se eliminaron definitivamente las carpetas `frontend/src/pages/`, `frontend/src/components/` y `frontend/src/api/` (21 archivos eliminados).
  - **Suite de Pruebas Unitarias Directa:** Los 12 archivos de prueba en `frontend/src/__tests__/` importan y testean directamente los módulos y APIs de dominio. 44/44 tests aprobados al 100% y build de producción limpio en 2.60s.
* **Migración Integral a TypeScript Estricto sin Parches (Fase 2 - Frontend):**
  - **Infraestructura de Tipado y Compilador:** Se configuró TypeScript 5 con `strict: true`, resolución de módulos moderna `"bundler"` y path aliases `@/*` en `frontend/tsconfig.json` y `frontend/tsconfig.node.json`. Se incorporó el script `"typecheck": "tsc --noEmit"` en `package.json`.
  - **Modelado de Tipos de Dominio Clínico:** En `src/types/index.ts` se formalizaron contratos estrictos de datos sincronizados con Pydantic (`ClinicalCase`, `CasePhase`, `ParaclinicalStudy`, `EvaluationResult`, `PhaseEvaluationResult`, `NormativeCitation`, `User`, `UserRole`, `KnowledgeState`, `ZDPRecommendation`, `AteneoRoom`, `IbfCohortData`, `CoordinatorAnalyticsData`, `ScientificBenchmarkData`, `HttpResponse`).
  - **Migración 100% de la Base de Código a `.ts` / `.tsx`:**
    * Capa Core: `httpClient.ts`, componentes UI base (`ClinicalBadge.tsx`, `ClinicalButton.tsx`, `ClinicalCard.tsx`, `FloatingLabelInput.tsx`), Layouts (`AppLayout.tsx`, `Navbar.tsx`) y `AuthContext.tsx`.
    * Capa de API y Custom Hooks de Dominio: `authApi.ts`, `casesApi.ts`, `evaluationApi.ts`, `adaptiveApi.ts`, `analyticsApi.ts`, `collaborationApi.ts`, `useVoiceRecognition.ts`, `useCases.ts`, `useCaseSolver.ts`, `useAdaptiveCurriculum.ts`, `useAnalytics.ts`, `useAteneoRoom.ts`.
    * Vistas y Componentes: `CaseList.tsx`, `CaseCard.tsx`, `CaseFilterTabs.tsx`, `CaseSolve.tsx`, `FeedbackCard.tsx`, `PhaseFeedbackCard.tsx`, `SimulationStepper.tsx`, `VoiceInputButton.tsx`, `ImageUploadZone.tsx`, `EvaluationGameLoader.tsx`, `PdfViewerModal.tsx`, `AteneoRoom.tsx`, `AdminDashboard.tsx`, `TeacherDashboard.tsx`, `CoordinatorAnalytics.tsx`, `ReasoningTrends.tsx`, `SkillRadarChart.tsx`, `ScientificBenchmarkView.tsx`, `AdaptiveNextCase.tsx`, `KnowledgeSpaceGraph.tsx`, `Login.tsx`, `ProtectedRoute.tsx`.
    * Archivos Raíz y Configuración de Pruebas: `AppRoutes.tsx`, `App.tsx`, `main.tsx`, `setupTests.ts` y actualización de `index.html` y `vite.config.js`.
  - **Eliminación Total de Residuos:** Todos los archivos `.js` y `.jsx` fuente fueron eliminados tras la migración.
  - **Cero Warnings y Cero Errores:** `npm run typecheck` (`tsc --noEmit`) pasa con 0 errores; Vitest pasa 12/12 suites y 44/44 pruebas unitarias; `npm run build` genera bundle de producción optimizado con PWA en 7.54s.
* **Integración de Estado Asíncrono del Servidor con TanStack Query (Fase 3 - Frontend):**
  - **Cliente Centralizado (`queryClient.ts`):** Políticas de alta resiliencia clínica (`staleTime: 5 min`, `gcTime: 15 min`, `refetchOnWindowFocus: false` para salvaguardar dictados y redacción clínica, y `retry: 1`).
  - **Provider Global:** `QueryClientProvider` inyectado en `App.tsx` envolviendo `AuthProvider` y `BrowserRouter`.
  - **Declaratividad en Dominio:** Refactorización de `useCases.ts`, `useAdaptiveCurriculum.ts`, `useAnalytics.ts` y `useCaseSolver.ts` a queries tipadas de TanStack Query, eliminando peticiones redundantes y desincronizaciones de red.
  - **Validación Exitosa:** 0 errores en `typecheck`, 12 suites / 44 tests unitarios aprobados al 100% en Vitest, y compilación de producción limpia en 40s.
* **Estado Global Atómico y Gestión en Tiempo Real con Zustand (Fase 4 - Frontend):**
  - **Store de Autenticación (`useAuthStore.ts`):** Estado atómico con middleware `persist` en `localStorage` (`ateneo_auth_session`). `AuthContext.tsx` adaptado para consumir selectores atómicos manteniendo el contrato histórico sin romper los tests existentes.
  - **Store de Sesiones Clínicas y Borradores (`useClinicalCaseSessionStore.ts`):** Retención reactiva en memoria de las respuestas del estudiante en curso por `case_id`, previniendo la pérdida accidental de datos.
  - **Store de Colaboración (`useAteneoRoomStore.ts`):** Manejo síncrono del estado de la sala (fases, participantes, votos, dictámenes), delegando desde `useAteneoRoom.ts`.
  - **Validación de Calidad:** `tsc --noEmit` con 0 errores, 12 suites / 44 tests pasados en Vitest (100% PASS) y build en 3.94s.
* **Validación de Contratos en los Bordes con Zod (Fase 5 - Frontend):**
  - **Esquemas de Dominio (`schemas.ts`):** Definición estricta de esquemas Zod en tiempo de ejecución sincronizados con Pydantic (`ClinicalCaseSchema`, `ClinicalCasesListSchema`, `CasePhaseSchema`, `EvaluationResultSchema`, `PhaseEvaluationResultSchema`, `UserSchema`, `LoginResponseSchema`, `IbfCohortDataSchema`).
  - **Parsing Defensivo (`safeParse`):** Integración en `casesApi.ts`, `evaluationApi.ts` y `authApi.ts` para capturar anomalías en los bordes y desacoplar la interfaz de roturas silenciosas.
  - **Cierre Integral del Plan de Escalabilidad:** 0 errores en `typecheck`, 12/12 suites y 44/44 tests aprobados en Vitest, y compilación de producción en 3.34s con Service Worker PWA activo.
* **Auditoría Arquitectónica y Consolidación del Backend (Ateneo+ API):**
  - **Inyección de Identidad en Evaluador (`routers/evaluation.py`):** Se eliminó el hardcoding de usuario (`"usr_alumno_001"`, `"alumno@ateneo.edu.ec"`) inyectando `current_user: Optional[UserResponse] = Depends(get_optional_current_user)`. Las evaluaciones se asignan dinámicamente al usuario autenticado en curso, preservando el fallback defensivo para modo demo/invitado.
  - **Logging Estructurado:** Se sustituyeron llamadas a `print()` en controladores por `logger = logging.getLogger(__name__)` con niveles apropiados (`logger.info`, `logger.warning`).
  - **Solución Causa Raíz a Telemetría ChromaDB:** Se implementó `NoOpProductTelemetry` en `backend/rag/chroma_telemetry.py` conectada vía `chroma_product_telemetry_impl="rag.chroma_telemetry.NoOpProductTelemetry"`. Esto erradicó la excepción de colisión de firmas entre PostHog y ChromaDB (`CollectionQueryEvent: capture() takes 1 positional argument but 3 were given`) y redujo la latencia de las suites de prueba de 32s a 19.6s.
  - **Trazabilidad Global con CorrelationIdMiddleware (`core/middleware.py`):** Inyección de `X-Request-ID` criptográficamente único y métricas de procesamiento `X-Process-Time` en todas las respuestas HTTP, enriqueciendo trazas con `contextvars`.
  - **Estandarización de Errores RFC 7807 (`core/errors.py`):** Respuestas de error homogéneas (`ProblemDetails`: `type`, `title`, `status`, `detail`, `instance`, `request_id`, `timestamp`), preservando 100% de retrocompatibilidad con la clave `detail`.
  - **Gobernanza de Conexiones (`core/database.py`):** Creación del contextmanager `get_db_context()` para gestión transaccional segura con rollback automático en servicios y tareas en background.
  - **Repositorio Híbrido de Casos Clínicos (`modules/cases/repository.py`):** Integración de `ClinicalCaseModel` de SQLAlchemy con fusión transparente de los 12 casos canónicos en JSON y casos dinámicos de base de datos. Endpoint `POST /api/cases` para publicación de casos por docentes.
  - **Validación Completa:** 6 suites maestras del backend aprobadas al 100% PASS en 26.72s (`uv run python -m tests.run_all_tests`), y 12 suites / 44 tests unitarios de frontend al 100% PASS (`npm run test`).
* **Auditoría Integral de Proyecto y Sincronización Línea a Línea de Documentación (/goal):**
  - **Revisión Exhaustiva del Árbol Documental y Código Fuente:** Se auditaron exhaustivamente todos los componentes y documentos (`README.md`, `docs/3_documentacion_metodologica/*`, `docs/6_despliegue_y_operaciones/*`, `PLAN_ESCALABILIDAD_*`, backend y frontend).
  - **Sincronización de Contratos y Árboles en Docs:** Se actualizaron `README.md`, `ARQUITECTURA_MODULAR_FRONTEND.md`, `ARQUITECTURA_MODULAR_MONOLITO_BACKEND.md`, `ARQUITECTURA_RAG_Y_FINE_TUNING.md` y `GUIA_INGESTA_Y_CASOS.md` para reflejar con 100% de exactitud matemática:
    * Migración completa a TypeScript estricto (`.ts` / `.tsx`) con 0 errores en `tsc --noEmit`.
    * Eliminación definitiva de carpetas intermedias obsoletas (`src/components/`, `src/pages/`, `src/api/`).
    * Integración de TanStack Query v5, Zustand v5 y Zod v4.
    * Modelos y repositorios relacionales en todos los dominios (`UserModel`, `StudentMasteryModel`, `StudentSnapshotModel`, `ClinicalCaseModel`, `HistoryRepository`, `RoomRepository`).
    * Módulos transversales `core/middleware.py` (CorrelationId) y `core/errors.py` (RFC 7807).
  - **Integridad Referencial en SQLite:** Se activó `PRAGMA foreign_keys=ON` en el listener de conexión de SQLAlchemy (`backend/core/database.py`), reforzando la integridad referencial en tiempo de ejecución.
  - **Estandarización de Estilo:** Eliminación de símbolos informales y estandarización a formato sobrio `[PASS]` en documentación de pruebas.
  - **Verificación Completa en Vivo (100% Operatividad):**
    * Backend: 6 suites maestras aprobadas al 100% PASS (`uv run python -m tests.run_all_tests`).
    * Frontend Typecheck: `npm run typecheck` (`tsc --noEmit`) aprobado con 0 errores.
    * Frontend Tests: 12 suites y 44 pruebas unitarias aprobadas al 100% PASS en Vitest (`npm run test`).
    * Compilación de producción: `npm run build` completado exitosamente con Service Worker PWA activo.
* **Formalización del Plan Maestro de Escalabilidad del Frontend (10 Fases por Sesiones):**
  - Se reestructuró [PLAN_ESCALABILIDAD_FRONTEND.md](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/PLAN_ESCALABILIDAD_FRONTEND.md) dividiéndolo en dos bloques técnicos claros:
    * **Bloque A (Cimientos Base - Fases 1 a 5, 100% Completado):** Saneamiento de API, TypeScript 5 estricto, TanStack Query v5, Zustand v5 y Zod v4.
    * **Bloque B (Capacidades Clínicas de Escala - Fases 6 a 10, Roadmap Operativo por Sesiones):**
      - Fase 6: Streaming de dictamen clínico y debriefing socrático (SSE).
      - Fase 7: Salas colaborativas en tiempo real (WebSockets / presencia).
      - Fase 8: Visor diagnóstico de paraclínicos (Canvas / ECG 12 derivaciones / Lupa Rx).
      - Fase 9: Modo hospitalario offline-first (IndexedDB + Background Sync).
      - Fase 10: Pruebas E2E con Playwright y Core Web Vitals.
  - Matriz de seguimiento por sesiones establecida para abordar cada hito de manera incremental y controlada.
* **Streaming de Dictamen Clínico y Debriefing Socrático Multiturno (Fase 6 - Frontend & Backend):**
  - **Gateway LLM con Streaming y Circuit Breaker:** Se implementó `generate_stream(...)` en `backend/core/llm_gateway.py` consumiendo `client.models.generate_content_stream` de Google GenAI SDK con gestión de fallbacks y respeto del Circuit Breaker.
  - **Endpoint SSE en FastAPI:** Endpoint `POST /api/evaluate/socratic-turn` con `StreamingResponse(media_type="text/event-stream")` en `backend/routers/evaluation.py` para emitir eventos de diálogo pedagógico multiturno en tiempo real.
  - **Cliente SSE en Frontend:** Se creó `src/core/http/eventStreamClient.ts` basado en `ReadableStream` y `fetch` con parseo SSE, cancelación limpia vía `AbortController` y callbacks `onToken`, `onComplete`, `onError`.
  - **Store de Diálogo Socrático:** Se implementó `useSocraticDebriefStore.ts` en `modules/evaluation/store/` gestionando el árbol de turnos pedagógicos, abort controllers e historial de conversación.
  - **Componente de Renderizado Progresivo:** Se desarrolló `StreamingMarkdownViewer.tsx` con soporte para Markdown sobrio, resaltado de preguntas socráticas, viñetas clínicas y cursor pulsante sin emojis.
  - **Modal Institucional y Disparador de Interrogatorio:** Se creó `SocraticDebriefModal.tsx` montado en `CaseSolve.tsx` e integrado con botones de acción directa en cada omisión de `FeedbackCard.tsx`.
  - **Validación Completa en Vivo:**
    * TypeScript: 0 errores en `npm run typecheck` (`tsc --noEmit`).
    * Frontend Tests: 13 suites, 54 pruebas unitarias aprobadas al 100% en Vitest (`npm run test`), incluyendo la suite `SocraticDebrief.test.jsx` (10 tests).
    * Backend Tests: 6 suites maestras aprobadas al 100% en `uv run python -m tests.run_all_tests` (incluyendo `test_socratic_turn_endpoint` con SSE verificado).
    * Build de Producción: Compilación limpia en 8.23s con Service Worker PWA activo.
* **Salas Colaborativas de Consenso en Tiempo Real con WebSockets (Fase 7 - Frontend & Backend):**
  - **ConnectionManager en Backend:** Se implementó `backend/modules/collaboration/connection_manager.py` con registro thread-safe de sockets, mapeo de metadatos de usuario y tolerancia a caídas de socket.
  - **Endpoints y Difusión Dual en FastAPI:** Se agregó el canal WebSocket `@router.websocket("/ws/{room_code}")` en `backend/routers/collaboration.py`. Los controladores REST de `join`, `update_status` y `submit` difunden atómicamente a todos los clientes WebSocket de la sala.
  - **Cliente WebSocket Resiliente en Frontend:** Se creó `src/core/realtime/socketClient.ts` con reconexión exponencial, latidos de presencia (*heartbeats* cada 20s) y eventos de reconexión fallida.
  - **Reactividad en Store y Hooks (`useAteneoRoom` & `useAteneoRoomStore`):** Se eliminó el `setInterval` ciego de 3s; ahora el estado se actualiza por eventos reactivos en tiempo real con degradación gradual defensiva (*fallback* a sondeo lento de 10s solo ante pérdida prolongada de conexión).
  - **Interfaz de Consenso Dinámico:** Se actualizó `AteneoRoom.tsx` con pill visual de conexión en tiempo real (`En vivo (X)`, `Reconectando...`, `Modo Seguro`) sin emojis y con estricta sobriedad clínica.
  - **Validación Completa en Vivo:**
    * TypeScript: 0 errores en `npm run typecheck` (`tsc --noEmit`).
    * Frontend Tests: 14 suites, 61 pruebas unitarias aprobadas al 100% en Vitest (`npm run test`), incluyendo la suite `AteneoRealtimeCollab.test.jsx` (7 tests).
    * Backend Tests: 6 suites maestras aprobadas al 100% en `uv run python -m tests.run_all_tests` (incluyendo `test_collaboration_websocket_endpoint` con 101 Switching Protocols y presencia).
    * Build de Producción: Compilación limpia en 3.12s con Service Worker PWA activo.
* **Visor Diagnóstico Interactivo de Paraclínicos (Fase 8 - Frontend):**
  - **Lienzo Acelerado (`ClinicalStudyViewer.tsx`):** Componente desacoplado en `modules/evaluation/components/` basado en Canvas HTML5 nativo acelerado por GPU con ciclo `requestAnimationFrame` a 60 FPS.
  - **Herramientas de Grado Médico:** Paneo continuo y zoom infinito (60% a 800%), controles de ventana radiológica (brillo 40-180%, contraste 50-220%, inversión negativo/positivo), calibrador electrocardiográfico con rejilla milimétrica (25 mm/s, 10 mm/mV) y modo pantalla completa.
  - **Integración Split-Screen:** Montado en el panel izquierdo de `CaseSolve.tsx` en sustitución del visor estático previo.
  - **Validación Completa en Vivo:**
    * TypeScript: 0 errores en `npm run typecheck` (`tsc --noEmit`).
    * Frontend Tests: 15 suites, 66 pruebas unitarias aprobadas al 100% en Vitest (`npm run test`), incluyendo la suite `ClinicalStudyViewer.test.jsx` (5 tests).
    * Vite Build: Compilación de producción con PWA limpia en 3.13s sin dependencias externas pesadas.
* **Resiliencia Hospitalaria y Modo Offline-First (Fase 9 - Frontend):**
  - **Base de Datos Tipada Nativa (`src/core/storage/offlineDb.ts`):**
    * Motor de persistencia en IndexedDB (`ateneo_offline_v1`) sin dependencias externas pesadas, con 3 object stores (`cases`, `outbox`, `evaluations`) e índices para consultas por estado y `case_id`.
    * Degradación transparente a almacenamiento en memoria en entornos sin IndexedDB (ej. ejecuciones headless o tests unitarios).
    * Implementación del patrón Outbox (`queueEvaluation`, `getPendingEvaluations`, `updateOutboxStatus`, `clearSynced`) para garantizar tolerancia a desconexiones intempestivas en guardias y áreas hospitalarias sin cobertura.
  - **Orquestador de Conectividad y Background Sync (`src/core/storage/useConnectivitySync.ts`):**
    * Hook que supervisa `navigator.onLine` y los eventos `online`/`offline` de la ventana.
    * Sincronización automática de elementos encolados en el Outbox al restablecerse la conectividad, invocando `evaluateDirect` o `evaluatePhase` y cacheando los resultados locales en IndexedDB.
  - **Pill de Conectividad Hospitalaria en `Navbar.tsx`:**
    * Indicadores visuales sobrios sin cajas decorativas ni emojis: `Modo Local` (ámbar ante pérdida de señal), botón interactivo de sincronización (`X pendientes`) y estado discreto `En línea` (verde esmeralda).
  - **Resiliencia Integrada en Flujos Clínicos (`useCases.ts` & `useCaseSolver.ts`):**
    * `useCases.ts`: Persiste automáticamente los casos del servidor en `offlineDb` y recurre a `getAllCases()` de la base local si la red falla.
    * `useCaseSolver.ts`: Al enviar respuestas directas o avanzar de fase sin conexión, encola la respuesta en el outbox y entrega un dictamen provisional que garantiza al estudiante la integridad de su avance clínico.
  - **Validación Completa en Vivo:**
    * TypeScript: 0 errores en `npm run typecheck` (`tsc --noEmit`).
    * Frontend Tests: 16 suites y 72 pruebas unitarias aprobadas al 100% en Vitest (`npm run test`), incluyendo `OfflineSync.test.tsx` (6 tests).
    * Build de Producción: Compilación limpia (`vite build`) en 19.53s con Service Worker PWA (`dist/sw.js`) y precache de 26 activos.
    * Backend Tests: 6 suites maestras aprobadas al 100% en `python -m tests.run_all_tests`.
* **Automatización E2E Multi-Navegador y Observabilidad Core Web Vitals (Fase 10 - Frontend):**
  - **Playwright Nativo Multi-Canal (`playwright.config.ts`):**
    * Configuración desacoplada ejecutando sobre canales nativos del sistema (Google Chrome, Microsoft Edge y emulación de smartphone Pixel 5) sin requerir descargas pesadas desde CDNs externos.
    * Servidor `preview` automático en puerto 5173 con reutilización de servidor local.
    * Script dedicado en `package.json`: `"test:e2e": "playwright test"`.
    * Aislamiento estricto en `vite.config.js` (`include: ['src/__tests__/**']`, `exclude: ['e2e/**']`) para evitar interferencia entre Vitest y Playwright.
  - **Especificaciones Críticas de Flujo Clínico (`frontend/e2e/`):**
    * `auth-and-rbac.spec.ts`: Flujo de autenticación con floating labels institucionales y guardias de navegación RBAC.
    * `clinical-catalog.spec.ts`: Catálogo clínico, píldora de conectividad (`En línea` / `Modo Local`) y búsqueda reactiva con responsividad adaptativa en desktop y móvil.
    * `clinical-study-viewer.spec.ts`: Simulación diagnóstica split-screen, inspección de paraclínicos en Canvas y emisión de diagnósticos.
    * `core-web-vitals.spec.ts`: Auditoría automatizada de rendimiento en navegación clínica real: DOMContentLoaded < 2.0s, Cumulative Layout Shift (CLS < 0.1) y DOM Interactive < 3.5s.
  - **Validación Completa en Vivo (100% PASS):**
    * Playwright E2E: 15/15 pruebas aprobadas (5 tests x 3 proyectos: Google Chrome, Microsoft Edge, Mobile Pixel 5).
    * TypeScript 5: 0 errores en `npm run typecheck` (`tsc --noEmit`).
    * Vitest Frontend: 16 suites, 72 pruebas unitarias aprobadas al 100% (`npm run test`).
    * Vite Build: Compilación de producción en 4.80s con Service Worker PWA generado.
    * Backend: 6 suites maestras aprobadas al 100% (`python -m tests.run_all_tests`).
  - **Plan de Escalabilidad Frontend:** 10 de 10 Fases completadas al 100% con estándar Senior innegociable.
* **Auditoría Exhaustiva de Backend y Plan Maestro de Escalabilidad (Ateneo+ API):**
  - **Diagnóstico y Línea Base:**
    * El backend opera con FastAPI, Pydantic v2, SQLAlchemy 2.0 (SQLite WAL / Postgres ready), RAG Híbrido BGE-M3 + BM25 y LLM Gateway con Circuit Breaker.
    * 6 suites maestras aprobadas al 100% en `backend/tests/run_all_tests.py` (34.3s de ejecución).
  - **Hallazgos de Deuda Técnica Arquitectónica:**
    * Acoplamiento en `routers/evaluation.py` y `routers/collaboration.py` con llamadas directas a RAG sin pasar por `EvaluationService`.
    * Ausencia de Unit of Work (UoW) para transacciones multi-repositorio ACID atómicas.
    * Carencia de Rate Limiting defensivo ante peticiones pesadas a la API de Gemini.
    * Falta de blindaje contra Prompt Injections en respuestas libres de estudiantes.
    * Ausencia de Multi-Tenancy lógico formal para aislamiento de universidades y hospitales.
  - **Consolidación en `PLAN_ESCALABILIDAD_BACKEND.md`:**
    * Reestructurado en 10 fases de ingeniería senior con criterios de aceptación e hitos por sesión.
    * Cero emojis, tono técnico, sobrio, fáctico y verificable.
* **Auditoría Exhaustiva de Proyecto y Sincronización Línea a Línea de Documentación (/goal):**
  - **Revisión Integral de Código y Contratos:**
    * Frontend: Ejecución y verificación en vivo de TypeScript 5 estricto (`tsc --noEmit`, 0 errores), Vitest 5 (16 suites, 72 pruebas unitarias aprobadas al 100%) y Playwright E2E multi-navegador (15 pruebas aprobadas en Google Chrome, Microsoft Edge y Mobile Pixel 5).
    * Backend: Ejecución y verificación en vivo de las 6 suites maestras en `backend/tests/run_all_tests.py` (100% PASS en 38.5s), cubriendo seguridad JWT/Bcrypt, motor adaptativo KST/BKT, evaluador multimodal, streaming SSE, presencia WebSocket y generación de PDF criptográfico SHA-256.
  - **Sincronización Quirúrgica Documental:**
    * `PLAN_ESCALABILIDAD_FRONTEND.md`: Actualizada Fase 9 (Resiliencia Hospitalaria Offline-First) de PENDIENTE a COMPLETADO, documentando la implementación de `offlineDb.ts` (IndexedDB tipado nativo), `useConnectivitySync.ts` (Outbox Pattern) e indicadores en `Navbar.tsx`.
    * `ARQUITECTURA_MODULAR_FRONTEND.md`: Sincronizado el árbol de directorios con `eventStreamClient.ts`, `socketClient.ts`, `offlineDb.ts` y `useConnectivitySync.ts`. Actualizadas todas las referencias a componentes de `.jsx` a `.tsx`.
    * `ARQUITECTURA_MODULAR_MONOLITO_BACKEND.md`: Incorporado `connection_manager.py` en el árbol de `backend/modules/collaboration/` y sincronizada la sección 7 con las 10 Fases activas de `PLAN_ESCALABILIDAD_BACKEND.md`.
    * `ARQUITECTURA_RESILIENTE_LLM_Y_CONFIGURACION.md`: Normalizadas las rutas de archivo eliminando referencias absolutas a rutas de Linux locales y apuntando a `backend/core/llm_gateway.py`.
    * `METODOLOGIA_Y_REPRODUCIBILIDAD_EXPERIMENTALES.md`: Sincronizada la ubicación canónica de tablas LaTeX hacia `docs/1_tablas_latex/` y la cascada de fallbacks hacia `gemini-3.8-flash, gemini-3.7-flash, gemini-3.5-flash, gemini-flash-latest, gemini-flash-lite-latest`.
    * `ARQUITECTURA_RAG_Y_FINE_TUNING.md`: Actualizada referencia de `CoordinatorAnalytics.tsx` y el soporte relacional de `RoomRepository` (SQLAlchemy).
  - **Estado Operativo:** 100% de coherencia fáctica y operativa entre el código fuente y el acervo documental técnico.
* **Elevación Arquitectónica y Rediseño Senior del Plan Maestro de Escalabilidad Frontend (`PLAN_ESCALABILIDAD_FRONTEND.md`):**
  - **Diagnóstico y Trascendencia:** El documento anterior actuaba predominantemente como una bitácora de tareas concluidas (Fases 1 a 10), careciendo de visión de escala institucional, diagnóstico forense y hoja de ruta futura.
  - **Reestructuración a Estándar Senior (+10 años):**
    * Sección 1: Visión Arquitectónica y Proyección de Escala (10x - 100x) con diagrama Mermaid de 5 capas (Presentación, Dominio ViewModel, Estado Transversal, Transporte/Offline y Servicios Médicos Especializados).
    * Sección 2: Diagnóstico Exhaustivo del Frontend Actual (Inventario de 10 subsistemas y métricas empíricas: 184 kB chunk, 0 errores `tsc`, 72/72 tests Vitest, 15/15 tests Playwright E2E).
    * Sección 3: Matriz de Brechas de Escala Institucional (F1 a F8 con Severidad, Causa Raíz y Solución Arquitectónica sin parches).
    * Sección 4: Plan Maestro en 16 Fases dividido en Bloque A (Cimientos Base - Fases 1 a 5, completado), Bloque B (Capacidades Clínicas y Tiempo Real - Fases 6 a 10, completado) y Bloque C (Grado Hospitalario y Escala Masiva - Fases 11 a 16 proyectadas: DICOM/CornerstoneJS, circuitos OSCE/ECOE cronometrados, tele-simulación WebRTC, multi-tenancy dinámico, i18n tipado y observabilidad RUM OpenTelemetry).
    * Sección 5: Matriz de Seguimiento Integral con las 16 fases, entregables clave y estados.
* **Sincronización de los 3 Planes Maestros de Escalabilidad (Definición Canónica):**
  - **`PLAN_ESCALABILIDAD_FRONTEND.md`:** Consolidado en 16 fases (Bloque A + B completados, Bloque C proyectado). Es el documento de mayor madurez. Sin cambios estructurales requeridos.
  - **`PLAN_ESCALABILIDAD_BACKEND.md`:** Corregido el desfase entre realidad e historial. Agregada la sección 5 "Infraestructura Transversal ya Implementada" que documenta lo que ya existe (`CorrelationIdMiddleware`, RFC 7807, Circuit Breaker, PRAGMA FK, lifespan moderno, logging parcial, repositorio híbrido). Las 10 fases permanecen en "Planificado" porque ninguna ha sido ejecutada formalmente.
  - **`PLAN_ESCALABILIDAD_BASE_DE_DATOS.md`:** Completado a estándar senior. Agregados: estados por fase (Fase 1 = Completado, Fases 2-5 = Planificado), criterios de aceptación cuantitativos en todas las fases, sección 5 "Infraestructura ya Implementada" y sección 6 "Matriz de Seguimiento por Sesiones" homologada con los otros dos planes. Nombre de script de migración formalizado: `backend/scripts/migrate_history_to_ateneo_clinical.py`.
  - **Criterio de ejecución secuencial:** BD -> Backend -> Frontend (las fases de BD son precondición para las de Backend).
* **Auditoría Definitiva del Código (Hallazgos Verificados en Código Real):**
  - **Backend 100% PASS** (6 suites: Seguridad RBAC, Motor KST/BKT, Científicos, Estudio Piloto, Endpoints HTTP, Multimodal) — 37.43s.
  - **Frontend 100% PASS** (16 suites, 72 tests Vitest, 0 errores TypeScript).
  - **Violación B1 confirmada en 3 endpoints**: `POST /api/evaluate` (líneas 144 y 152), `POST /api/evaluate/phase` (líneas 210 y 218), `POST /api/evaluate/socratic-turn` (línea 257) — todos en `backend/routers/evaluation.py`.
  - **`AteneoRoomModel` sin `created_at`**: Solo tiene `updated_at` como `String(50)`. Se agrega en Fase 2 BD.
  - **Ningún modelo tiene `ForeignKey` SQLAlchemy formal**: todos usan `String(100)` plano para `user_id`/`docente_id`. El PRAGMA protege a nivel de motor, no de ORM.
  - **`EvaluationHistoryModel` sin columnas de primer orden**: falta `faithfulness_score`, `cohorte_id`, `tiempo_segundos`. Pendiente Fase 2 BD.
  - **Bundle frontend:** `index-*.js` = 321.29 kB / 99.92 kB gzip (crecimiento justificado por Zustand v5 + TanStack v5 + Zod v4 + streaming + offline). `CaseSolve` = 66.75 kB — candidato lazy en Fase 11 Bloque C.
  - **`ClinicalCaseModel`** es el único modelo con `DateTime` nativo (no `String`). El resto migra en Fase 2 BD.
  - **Los 3 documentos de escalabilidad están definitivamente sincronizados** con el código real y son la fuente canónica de verdad para las implementaciones.
* **Segunda Auditoría Definitiva — Hallazgos Adicionales No Documentados (2026-10-02):**
  - **B1 ampliado**: La violación de capas no se limita a `evaluation.py`. Se detectaron violaciones adicionales en:
    * `routers/collaboration.py` líneas 9-10: importa `retrieve_relevant_chunk` y `evaluate_clinical_reasoning` directamente (usado en `submit_ateneo_answer`).
    * `routers/history.py` línea 108: importa `retrieve_relevant_chunk` dentro del endpoint `/faithfulness-benchmark`.
    * `modules/evaluation/service.py` líneas 6-7: el servicio sí DEBE llamar a la capa RAG, pero lo hace sin pasar por el `ResilientLLMGateway` (circuit breaker). Esto es una deuda menor de la capa de dominio, NO una violación de la capa HTTP.
    * **Criterio verificable de limpieza total:** `grep -r "from rag" backend/routers/` debe retornar 0 resultados.
  - **B9 nuevo**: Tres llamadas a `print()` en servicios de producción detectadas:
    * `analytics_history/service.py:176` — seed completado.
    * `collaboration/service.py:137` — dentro de un `except` (el más crítico: silencia errores reales).
    * `collaboration/service.py:275` — seed completado.
    * Resolver en Fase 9 sustituyendo por `logger.info`/`logger.warning` con `logging.getLogger(__name__)`.
  - **Registro de registros en BD**: `evaluation_history` tiene >= 33 registros (variable con el uso; 33 era el conteo del 2026-10-02). No es un número fijo.
  - **Bundle Frontend**: El valor de 184.88 kB documentado en sesiones previas era pre-integración de Zustand v5 + TanStack v5 + Zod v4 + streaming SSE + offline IndexedDB. El valor actual correcto es **321.29 kB / 99.92 kB gzip**. El crecimiento es esperado y justificado por la incorporación de las Fases 6-10 del Bloque B.
  - **Correcciones aplicadas a los 3 planes maestros:**
    * `PLAN_ESCALABILIDAD_BACKEND.md`: Sección §0 de dependencias inter-plan agregada. B1 expandido a 3 archivos. B9 (print en producción) agregado.
    * `PLAN_ESCALABILIDAD_BASE_DE_DATOS.md`: Sección §0 de dependencias inter-plan agregada. Nota de variabilidad en conteo de registros.
    * `PLAN_ESCALABILIDAD_FRONTEND.md`: Sección §0 de dependencias inter-plan agregada.
