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
