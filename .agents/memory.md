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


