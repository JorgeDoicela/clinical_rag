# Arquitectura Modular del Frontend: Feature-Driven Vertical Slices y Core Shared (Docs-as-Code)

Este documento técnico especifica la arquitectura, partición de módulos de dominio, desacoplamiento mediante controladores custom hooks, sistema de diseño clínico y optimización de rendimiento PWA implementados en el cliente web de Ateneo+.

---

## 1. Justificación y Causa Raíz de la Arquitectura

El cliente de Ateneo+ es una aplicación de página única progresiva (*Progressive Web App - PWA*) desarrollada con React 18, Vite y Tailwind CSS, concebida para entrenamiento clínico simulado y analítica del aprendizaje médico.

### 1.1 Limitaciones del Paradigma Monolítico Anterior
Con anterioridad a esta refactorización, el frontend presentaba tres acoplamientos críticos:
1. **Acoplamiento de Estado Masivo en Vistas:** Páginas como `CaseSolve.jsx` acumulaban simultáneamente 14 variables de estado reactivo (`useState`), orquestando concurrencia de audio (Web Speech API), lectura de archivos multimodales (Data Transfer API), temporizadores por fase, transiciones del stepper y polling de evaluación. Esto impedía la prueba aislada de la lógica clínica y producía re-renderizados innecesarios del lienzo split-screen.
2. **Dispersión de Llamadas HTTP Directas:** Se realizaban invocaciones a `fetch()` sin abstracción común en componentes de página, duplicando lógica de cabeceras de autorización Bearer JWT, serialización multipart/form-data y resolución de URLs para túneles remotos (Cloudflare Tunnel).
3. **Carga Monolítica de Bundle (Sin Code-Splitting):** La totalidad de los módulos administrativos (`AdminDashboard`), docentes (`TeacherDashboard`, `CoordinatorAnalytics`), de investigación (`ScientificBenchmarkView`) y salas sincrónicas (`AteneoRoom`) se agrupaban en el bundle inicial de arranque, aumentando el tiempo de carga en dispositivos móviles hospitalarios.

### 1.2 Solución Arquitectónica: Feature-Driven Slices con ViewModel Hooks
Se adoptó una arquitectura basada en **Vertical Slices orientados a Dominio Clínico** complementados por una capa transversal compartida (**Core Shared**), donde:
* Cada subdominio clínico es autónomo y encapsula sus propios contratos de API, controladores de estado en forma de custom hooks y componentes de presentación.
* Los componentes de interfaz gráfica (UI) son puramente declarativos y reciben datos y despachadores desde los custom hooks que actúan como ViewModels.
* Se establece retrocompatibilidad transparente mediante fachadas en `src/pages/` y `src/components/`, garantizando que ninguna suite de pruebas automatizadas ni importación existente se rompa.

---

## 2. Principios de Diseño y Jerarquía Visual Médica

La interfaz de usuario implementa el sistema de diseño clínico normativo de Ateneo+ regido por los siguientes criterios inmutables:

* **Paleta de Precisión Institucional:** Lienzo base Material 3 en color gris médico `#f0f4f9` (`bg-slate-50`), tarjetas clínicas elevadas en blanco puro `#ffffff` con radio de curvatura amplio (`rounded-[28px]`), y gradiente institucional tricolor Cyan Clínico (`#06b6d4`), Azul Royal (`#2563eb`) y Violeta IA (`#7c3aed`).
* **Iconografía Plana y Transparente:** Prohibición absoluta de envolver iconos de la librería `lucide-react` en cajas con fondos artificiales (`bg-blue-50`, `bg-slate-100`) o bordes perimetrales circulares. Los iconos se renderizan directamente con su color semántico (`text-cyan-600`, `text-blue-600`, etc.).
* **Campos Flotantes Outlined (Google Accounts Pattern):** Entradas de texto implementadas mediante `FloatingLabelInput`, donde la etiqueta descansa centrada y se anima hacia el borde superior reduciendo su escala tipográfica al recibir foco o contener texto.
* **Prohibición Total de Emojis:** Ningún elemento visual, badge, modal, mensaje de error o dictamen de retroalimentación contiene caracteres decorativos Unicode (emojis).

---

## 3. Diagrama de Arquitectura del Frontend

```mermaid
graph TD
    subgraph Routing_Layer [Capa de Enrutamiento y Code-Splitting]
        Router["AppRoutes (React.lazy + Suspense)"]
        Guard["ProtectedRoute (RBAC: Alumno, Docente, Admin)"]
    end

    subgraph Feature_Modules [Módulos de Dominio Clínico (modules/)]
        subgraph Mod_Cases [Casos Clínicos (cases/)]
            CasePage["CaseList"]
            CaseHook["useCases"]
            CaseApi["casesApi"]
            CaseCard["CaseCard"]
            CaseTabs["CaseFilterTabs"]
        end

        subgraph Mod_Eval [Evaluación y Simulación (evaluation/)]
            EvalPage["CaseSolve"]
            SolverHook["useCaseSolver"]
            VoiceHook["useVoiceRecognition"]
            EvalApi["evaluationApi"]
            Stepper["SimulationStepper"]
            UploadZone["ImageUploadZone"]
            VoiceBtn["VoiceInputButton"]
            FeedCard["FeedbackCard / PhaseFeedbackCard"]
        end

        subgraph Mod_Collab [Colaboración Sincrónica (collaboration/)]
            RoomPage["AteneoRoom"]
            RoomHook["useAteneoRoom"]
            CollabApi["collaborationApi"]
        end

        subgraph Mod_Adaptive [Currículo Adaptativo (adaptive/)]
            AdaptiveHook["useAdaptiveCurriculum"]
            AdaptiveApi["adaptiveApi"]
            NextCard["AdaptiveNextCase"]
            GraphKST["KnowledgeSpaceGraph"]
        end

        subgraph Mod_Analytics [Analítica Docente e Investigación (analytics/)]
            TeacherPage["TeacherDashboard"]
            AdminPage["AdminDashboard"]
            BenchmarkPage["ScientificBenchmarkView"]
            AnalyticsHook["useAnalytics"]
            AnalyticsApi["analyticsApi"]
            Radar["SkillRadarChart"]
            Trends["ReasoningTrends"]
            Coord["CoordinatorAnalytics"]
        end

        subgraph Mod_Auth [Autenticación (auth/)]
            LoginPage["Login"]
            AuthApi["authApi"]
        end
    end

    subgraph Core_Shared [Capa Transversal Compartida (core/)]
        HTTP["httpClient (Fetch Wrapper + Bearer JWT)"]
        UI_Components["FloatingLabelInput | ClinicalButton | ClinicalCard | ClinicalBadge"]
        Layouts["AppLayout | Navbar"]
    end

    Router --> Guard
    Guard --> CasePage
    Guard --> EvalPage
    Guard --> RoomPage
    Guard --> TeacherPage
    Guard --> AdminPage
    Guard --> BenchmarkPage
    Router --> LoginPage

    CasePage --> CaseHook
    CaseHook --> CaseApi
    CaseApi --> HTTP

    EvalPage --> SolverHook
    SolverHook --> VoiceHook
    SolverHook --> EvalApi
    EvalApi --> HTTP

    RoomPage --> RoomHook
    RoomHook --> CollabApi
    CollabApi --> HTTP

    TeacherPage --> AnalyticsHook
    AnalyticsHook --> AnalyticsApi
    AnalyticsApi --> HTTP
```

---

## 4. Estructura de Directorios del Código Fuente

```text
frontend/src/
├── core/                                   # Capa transversal compartida (agnóstica de dominio)
│   ├── http/
│   │   └── httpClient.js                   # Cliente HTTP base con Bearer JWT y control de errores
│   ├── ui/
│   │   ├── FloatingLabelInput.jsx          # Input con etiqueta flotante animada
│   │   ├── ClinicalButton.jsx              # Botón institucional con variantes primario/outline
│   │   ├── ClinicalCard.jsx                # Tarjeta blanca redondeada (rounded-[28px])
│   │   └── ClinicalBadge.jsx               # Indicadores de estado planos sin cajas decorativas
│   └── layouts/
│       ├── Navbar.jsx                      # Barra de navegación institucional y perfil
│       └── AppLayout.jsx                   # Layout maestro con contenedor de lienzo #f0f4f9
│
├── modules/                                # Módulos de dominio verticalmente particionados
│   ├── auth/                               # Autenticación y control de acceso RBAC
│   │   ├── api/authApi.js
│   │   ├── components/ProtectedRoute.jsx
│   │   └── pages/Login.jsx
│   ├── cases/                              # Catálogo y filtrado de casos clínicos normativos
│   │   ├── api/casesApi.js
│   │   ├── hooks/useCases.js
│   │   ├── components/CaseCard.jsx
│   │   ├── components/CaseFilterTabs.jsx
│   │   └── pages/CaseList.jsx
│   ├── evaluation/                         # Simulación clínica, voz, paraclínicos y RAG
│   │   ├── api/evaluationApi.js
│   │   ├── hooks/useCaseSolver.js
│   │   ├── hooks/useVoiceRecognition.js
│   │   ├── components/SimulationStepper.jsx
│   │   ├── components/ImageUploadZone.jsx
│   │   ├── components/VoiceInputButton.jsx
│   │   ├── components/EvaluationGameLoader.jsx
│   │   ├── components/PdfViewerModal.jsx
│   │   ├── components/PhaseFeedbackCard.jsx
│   │   ├── components/FeedbackCard.jsx
│   │   └── pages/CaseSolve.jsx
│   ├── collaboration/                      # Salas colaborativas y votación de consenso
│   │   ├── api/collaborationApi.js
│   │   ├── hooks/useAteneoRoom.js
│   │   └── pages/AteneoRoom.jsx
│   ├── adaptive/                           # Algorítmica adaptativa KST, BKT y ZDP
│   │   ├── api/adaptiveApi.js
│   │   ├── hooks/useAdaptiveCurriculum.js
│   │   ├── components/AdaptiveNextCase.jsx
│   │   └── components/KnowledgeSpaceGraph.jsx
│   └── analytics/                          # Analítica B2B, dashboard docente y benchmarks
│       ├── api/analyticsApi.js
│       ├── hooks/useAnalytics.js
│       ├── components/SkillRadarChart.jsx
│       ├── components/ReasoningTrends.jsx
│       ├── components/CoordinatorAnalytics.jsx
│       ├── components/ScientificBenchmarkView.jsx
│       ├── pages/AdminDashboard.jsx
│       └── pages/TeacherDashboard.jsx
│
├── routes/
│   └── AppRoutes.jsx                       # Rutas con lazy loading (React.lazy + Suspense)
├── context/
│   └── AuthContext.jsx                     # Proveedor de estado global de usuario y token
├── pages/                                  # Fachadas de retrocompatibilidad hacia modules/
├── components/                             # Fachadas de retrocompatibilidad hacia modules/
├── App.jsx                                 # Entrada principal con BrowserRouter y AuthProvider
└── main.jsx                                # Montaje del árbol DOM con React 18
```

---

## 5. Catálogo Exhaustivo de Módulos de Dominio

### 5.1 Módulo `auth` (Seguridad y Control de Acceso RBAC)
* **Responsabilidad:** Inicio de sesión en dos pasos estilo Google Workspace, almacenamiento seguro del token JWT en `localStorage`, y protección de rutas según el rol del usuario (`student`, `teacher`, `admin`).
* **Componentes Principales:**
  - `Login.jsx`: Formulario con validación de correo institucional y contraseña mediante `FloatingLabelInput`.
  - `ProtectedRoute.jsx`: Componente guardián que verifica autenticación y nivel de rol autorizado antes de renderizar la vista hija.
* **Cliente API:** `authApi.login(email, password)`, `authApi.logout()`, `authApi.getCurrentUser()`.

### 5.2 Módulo `cases` (Catálogo Clínico)
* **Responsabilidad:** Carga, búsqueda semántica y filtrado por especialidad médica de los 12 casos clínicos GPC del MSP.
* **Hook ViewModel (`useCases`):**
  - Desacopla el estado de búsqueda (`searchQuery`), filtro por categoría (`activeCategory`), estado de carga y recarga asíncrona.
  - Provee la lista computada de categorías únicas deducidas de los casos disponibles.
* **Componentes de Presentación:**
  - `CaseCard.jsx`: Tarjeta con badges de dificultad, especialidad, tiempo estimado y botón de inicio.
  - `CaseFilterTabs.jsx`: Píldoras de filtrado horizontal por especialidad clínica.
* **Cliente API:** `casesApi.getCases()`, `casesApi.getCaseById(id)`.

### 5.3 Módulo `evaluation` (Simulador Clínico Split-Screen y Fusión Multimodal)
* **Responsabilidad:** Orquestar el flujo de resolución de casos clínicos en dos modalidades: directa (evaluación completa en un solo paso) y progresiva por fases clínicas (Fase 1: Anamnesis, Fase 2: Exámenes e Interpretación de Estudios, Fase 3: Tratamiento y Conducta MSP).
* **Hook ViewModel (`useCaseSolver`):**
  - Gestiona el razonamiento clínico del estudiante (`reasoning`), archivos paraclínicos adjuntos (`attachedFiles`), etapa actual de la simulación (`currentPhase`), estados de carga (`isEvaluating`, `isLoadingPdf`) y visualización de resultados (`evaluationResult`, `phaseFeedbacks`).
  - Implementa la lógica para invocar `evaluationApi.evaluateDirect()` o `evaluationApi.evaluatePhase()`, calculando el avance porcentual del caso.
  - Gestiona la visualización previa e interactiva de estudios radiográficos y de laboratorio.
* **Hook de Entrada de Voz (`useVoiceRecognition`):**
  - Encapsula el ciclo de vida del reconocimiento de voz nativo (`webkitSpeechRecognition` / `SpeechRecognition`), configurando el dialecto local ecuatoriano (`es-EC`) con reinicio defensivo ante pausas de dictado y manejo de errores.
* **Componentes de Interfaz:**
  - `SimulationStepper.jsx`: Barra de progreso de fases con estado completado/activo y tiempo transcurrido.
  - `ImageUploadZone.jsx`: Zona de arrastre y selección de estudios diagnósticos con etiquetado automático (Rx, ECG, Labs) y eliminación individual accesible.
  - `VoiceInputButton.jsx`: Botón de control de dictado por voz con indicador de grabación activo.
  - `EvaluationGameLoader.jsx`: Pantalla de carga clínica animada con recomendaciones formativas mientras se ejecuta la inferencia multimodal en el backend.
  - `PhaseFeedbackCard.jsx`: Dictamen estructurado por fase clínica con desglose de hallazgos y botón de transición a la siguiente fase.
  - `FeedbackCard.jsx`: Dictamen final con puntaje global, desglose por competencias, justificación basada en GPC del MSP y verificación criptográfica de fidelidad normativa (*Faithfulness Score*).

### 5.4 Módulo `collaboration` (Ateneo Room Sincrónico)
* **Responsabilidad:** Salas de discusión clínica grupal donde múltiples estudiantes analizan un caso de forma concurrente, emiten votos de hipótesis diagnóstica y visualizan el consenso de la cohorte en tiempo real.
* **Hook ViewModel (`useAteneoRoom`):**
  - Implementa sondeo periódico (*polling*) a intervalos de 3,000 ms sobre `collaborationApi.getRoomStatus()`.
  - Normaliza la distribución de votos de los participantes y calcula el porcentaje de consenso dinámicamente.
  - Provee la función `submitVote(diagnosis)` con retroalimentación optimista inmediata.

### 5.5 Módulo `adaptive` (Motor de Currículo Adaptativo)
* **Responsabilidad:** Integrar la teoría de espacios de conocimiento (*Knowledge Space Theory - KST*) y el rastreo de conocimiento bayesiano (*Bayesian Knowledge Tracing - BKT*) para guiar al estudiante hacia la Zona de Desarrollo Próximo (ZDP).
* **Hook ViewModel (`useAdaptiveCurriculum`):**
  - Recupera la trayectoria de aprendizaje del estudiante, probabilidad de dominio por competencia $P(L)$ y recomendación pedagógica del siguiente caso a resolver.
* **Componentes Visuales:**
  - `AdaptiveNextCase.jsx`: Tarjeta de recomendación con la justificación psicométrica explícita generada por el motor adaptativo.
  - `KnowledgeSpaceGraph.jsx`: Renderizado de la red dirigida topológica de las 7 competencias médicas en SVG nativo, con coloreado según nivel de maestría alcanzado y modal interactivo de detalle.

### 5.6 Módulo `analytics` (Analítica de Aprendizaje y Benchmarking Científico)
* **Responsabilidad:** Monitorización longitudinal del razonamiento clínico individual y por cohortes institucionales, visualización de brechas formativas mediante el Índice de Brecha Formativa (IBF) y consulta de métricas experimentales del paper.
* **Hook ViewModel (`useAnalytics`):**
  - Centraliza la obtención de estadísticas históricas de evaluaciones, métricas del radar de competencias y distribución del IBF institucional.
* **Componentes Analíticos:**
  - `SkillRadarChart.jsx`: Gráfico de radar SVG estandarizado en los 4 ejes de razonamiento clínico (Diagnóstico, Terapéutica, Paraclínicos, Normativa MSP).
  - `ReasoningTrends.jsx`: Gráfica longitudinal de evolución de calificaciones y latencia de razonamiento.
  - `CoordinatorAnalytics.jsx`: Panel docente B2B con identificación de brechas formativas críticas ($\text{IBF} > 0.40$), moderadas y leves, con alertas automáticas para refuerzo pedagógico.
  - `ScientificBenchmarkView.jsx`: Consola de visualización de métricas científicas publicables (Hit@k, MRR, NDCG, Ganancia de Hake $g=0.74$, $p<0.0001$).

---

## 6. Patrón ViewModel / Custom Hook Controller

La separación entre presentación visual y lógica de negocio se logra mediante el patrón de **Custom Hooks como ViewModels**:

```javascript
// Contrato de separación en CasoSolve.jsx
export default function CaseSolve() {
  const { id } = useParams();
  
  // El hook encapsula la totalidad del estado reactivo, efectos y llamadas de red
  const {
    clinicalCase,
    loading,
    error,
    reasoning,
    setReasoning,
    attachedFiles,
    handleFilesSelected,
    handleRemoveFile,
    isEvaluating,
    evaluationResult,
    handleEvaluateDirect,
    handleEvaluatePhase,
    currentPhase,
    isPhaseSimulation,
    // ...
  } = useCaseSolver(id);

  if (loading) return <EvaluationGameLoader />;
  if (error) return <ErrorMessage message={error} />;

  // La vista es puramente declarativa y mapea estado a componentes UI
  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CaseNarrativePanel clinicalCase={clinicalCase} />
        <CaseResolutionPanel
          reasoning={reasoning}
          onReasoningChange={setReasoning}
          files={attachedFiles}
          onFilesSelected={handleFilesSelected}
          onRemoveFile={handleRemoveFile}
          onEvaluate={handleEvaluateDirect}
        />
      </div>
    </AppLayout>
  );
}
```

> [!NOTE]
> Este desacoplamiento permite que los componentes de presentación se prueben unitariamente con mocks simples de funciones y propiedades, mientras que los hooks se auditan con `@testing-library/react-hooks` sin necesidad de montar jerarquías complejas de DOM.

---

## 7. Enrutamiento, Code-Splitting Dinámico y Rendimiento PWA

### 7.1 Carga Perezosa con `React.lazy` y `Suspense`
Todas las páginas principales se cargan bajo demanda mediante importaciones dinámicas en `AppRoutes.jsx`:

```javascript
const CaseList = lazy(() => import('../modules/cases/pages/CaseList'));
const CaseSolve = lazy(() => import('../modules/evaluation/pages/CaseSolve'));
const AteneoRoom = lazy(() => import('../modules/collaboration/pages/AteneoRoom'));
const TeacherDashboard = lazy(() => import('../modules/analytics/pages/TeacherDashboard'));
const AdminDashboard = lazy(() => import('../modules/analytics/pages/AdminDashboard'));
const ScientificBenchmarkView = lazy(() => import('../modules/analytics/components/ScientificBenchmarkView'));
const Login = lazy(() => import('../modules/auth/pages/Login'));
```

### 7.2 Métricas de Compilación en Producción (`vite build`)
La división en trozos (*code-splitting*) produjo una reducción drástica del paquete de entrada inicial:

| Artefacto Generado | Tamaño (Sin Comprimir) | Tamaño Comprimido (gzip) | Rol del Chunk |
| :--- | :---: | :---: | :--- |
| `dist/assets/index.js` | **184.88 kB** | **60.33 kB** | Núcleo base (React, Router, Core UI, Contexto) |
| `dist/assets/index.css` | **45.11 kB** | **8.67 kB** | Sistema de diseño Tailwind CSS y animaciones |
| `dist/assets/CaseSolve.js` | **44.02 kB** | **12.24 kB** | Simulador clínico multimodal (cargado al abrir caso) |
| `dist/assets/CaseList.js` | **33.91 kB** | **9.37 kB** | Catálogo clínico y recomendador ZDP |
| `dist/assets/TeacherDashboard.js` | **15.08 kB** | **4.48 kB** | Analítica docente e IBF de cohorte |
| `dist/assets/AteneoRoom.js` | **9.13 kB** | **3.16 kB** | Sala de consenso socrático en vivo |
| `dist/assets/ScientificBenchmarkView.js`| **7.76 kB** | **2.65 kB** | Consola de investigación y ablación |
| `dist/assets/AdminDashboard.js` | **6.64 kB** | **2.14 kB** | Consola de administración de usuarios |
| `dist/assets/Login.js` | **4.79 kB** | **2.00 kB** | Formulario de autenticación flotante |
| `dist/sw.js` | PWA Workbox | Precache activo (26 entradas) | Service Worker para funcionamiento offline/móvil |

> [!TIP]
> El chunk inicial disminuyó de 338 kB a 184 kB (~45% de reducción), acelerando el tiempo hasta la interacción (*Time to Interactive - TTI*) en dispositivos de baja potencia en hospitales públicos.

---

## 8. Preparación para la Expansión Científica de la Investigación

La arquitectura implementada fue diseñada para incorporar directamente los siguientes hitos de investigación:

### 8.1 Debriefing Socrático Guiado por RAG
* **Extensión en `modules/evaluation`:** Se añadirá el hook `useSocraticDebriefing.js` y el componente `SocraticDebriefModal.jsx`.
* El hook consumirá el endpoint `POST /api/evaluate/socratic-turn`, manteniendo un árbol de diálogo multironda donde el LLM interroga al estudiante sobre las omisiones detectadas sin revelar la respuesta diagnóstica definitiva.

### 8.2 Experimentos Pedagógicos A/B (Efecto del Debriefing sobre BKT/KST)
* **Extensión en `modules/adaptive`:** El selector de casos integrará el flag experimental del usuario (`ab_group: "control" | "socratic"`).
* Los hooks de evaluación registrarán la tasa de transición de maestría $P(T)$ tras el debriefing frente a la retroalimentación estática, midiendo la aceleración de aprendizaje sin modificar los componentes de visualización.

### 8.3 Estudio de Ablación del Evaluador LLM
* **Extensión en `modules/analytics`:** El componente `ScientificBenchmarkView.jsx` ya cuenta con la estructura para renderizar la comparación multi-modelo (Gemini 3.8 vs. LLaMA 3.3 70B vs. DeepSeek R1) sobre el banco estandarizado de 12 casos.

---

## 9. Validación y Verificación Automatizada

La totalidad de los componentes y contratos de la arquitectura fueron verificados mediante la suite automatizada de Vitest 5 con React Testing Library en `frontend/src/__tests__/`:

```text
 ✓ src/__tests__/AdaptiveNextCase.test.jsx (3 tests)
 ✓ src/__tests__/SkillRadarChart.test.jsx (2 tests)
 ✓ src/__tests__/CoordinatorAnalytics.test.jsx (2 tests)
 ✓ src/__tests__/KnowledgeSpaceGraph.test.jsx (3 tests)
 ✓ src/__tests__/AdminDashboard.test.jsx (3 tests)
 ✓ src/__tests__/FeedbackCard.test.jsx (6 tests)
 ✓ src/__tests__/Login.test.jsx (5 tests)
 ✓ src/__tests__/ProtectedRoute.test.jsx (4 tests)
 ✓ src/__tests__/client.test.js (7 tests)
 ✓ src/__tests__/PhaseFeedbackCard.test.jsx (3 tests)
 ✓ src/__tests__/VoiceInputButton.test.jsx (3 tests)
 ✓ src/__tests__/ImageUploadZone.test.jsx (3 tests)

 Test Files  12 passed (12)
      Tests  44 passed (44)
   Duration  6.46s
```

* **Build en Contenedor Docker:** Compilación de producción con Vite 6 completada exitosamente sin advertencias de resolución de módulos ni errores de tipado.
* **Retrocompatibilidad:** Las fachadas en `src/pages/` y `src/components/` redirigen limpiamente hacia `src/modules/`, garantizando estabilidad absoluta en proyectos derivados.
