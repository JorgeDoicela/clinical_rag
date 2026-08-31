# Especificación del Sistema de Diseño Visual y Arquitectura UI/UX (Ateneo)

Este documento establece la especificación técnica oficial del sistema de diseño visual, tokens cromáticos, tipografía, componentes de visualización analítica y reglas de interfaz de usuario (UI/UX) de la aplicación cliente **Ateneo RAG** (React + Vite PWA).

---

## 1. Principios de Experiencia de Usuario (UX)

La interfaz gráfica de Ateneo implementa el paradigma **"Clínico Minimalista & Alta Precisión"**:

* **Entorno de Lectura Médica Prolongada:** Aplicación de superficies neutras frías (`slate-50`, `bg-white`) con un contraste tipográfico riguroso para prevenir fatiga visual en análisis de casos clínicos extensos.
* **Prohibición Estricta de Emojis:** Queda prohibido el uso de caracteres emoji en cualquier componente o mensaje de la interfaz gráfica para mantener un tono estrictamente académico e institucional.
* **Iconografía Vectorial Plana:** Se utiliza exclusivamente la librería `lucide-react`. Los iconos se renderizan planos, sin bordes circulares sintéticos, sombreados artificiales ni contenedores estridentes.
* **Disposición Split-Screen (Antiapilamiento):** Diseño de pantalla dividida en 2 columnas principales en la vista de resolución de casos ([../frontend/src/pages/CaseSolve.jsx](../frontend/src/pages/CaseSolve.jsx)):
  - **Columna Izquierda (50%):** Enunciado del caso clínico, preámbulo, imagen médica estática e indicación de la GPC de referencia.
  - **Columna Derecha (50%):** Pregunta evaluativa, área de redacción en texto libre, zona de carga de archivos (drag & drop) y botón de envío.

---

## 2. Paleta de Colores y Tokens Estructurales

### 2.1 Colores Base del Sistema
* **Fondo Principal de Aplicación:** `#f8fafc` (`slate-50`)
* **Superficie de Tarjetas y Modales:** `#ffffff` (`bg-white`)
* **Texto Primario / Títulos:** `#0f172a` (`slate-900`)
* **Texto Secundario / Leyendas:** `#475569` (`slate-600`)
* **Bordes Divisorios e Inactivos:** `#e2e8f0` (`border-slate-200`)

### 2.2 Identidad Cromática de Marca
* **Azul Cobalto Clínico (Primario):** `#0284c7` (`sky-600`)
* **Estado Hover / Interactivo:** `#0369a1` (`sky-700`)
* **Fondo Sutil Destacado:** `#f0f9ff` (`sky-50`)

### 2.3 Identidad Cromática por Rol de Usuario (RBAC)
| Rol de Usuario | Color Principal | Clases Tailwind CSS para Badges | Icono Vectorial Lucide |
| :--- | :--- | :--- | :--- |
| **Alumno** | Azul Celeste (`sky-600`) | `bg-sky-50 text-sky-800 border-sky-200` | `GraduationCap` |
| **Docente** | Verde Esmeralda (`emerald-600`) | `bg-emerald-50 text-emerald-800 border-emerald-200` | `UserCheck` |
| **Administrador** | Púrpura Imperial (`purple-600`) | `bg-purple-50 text-purple-800 border-purple-200` | `ShieldCheck` |

### 2.4 Semántica de Evaluación Formativa RAG
* **Aciertos Clínicos:** Verde Esmeralda (`emerald-600` / Contenedor `bg-emerald-50/70 border-emerald-200`)
* **Omisiones Formativas:** Ámbar Formativo (`amber-600` / Contenedor `bg-amber-50/70 border-amber-200`)
* **Cita Normativa Oficial MSP:** Azul Índigo (`indigo-600` / Contenedor `bg-indigo-50/70 border-indigo-200`)

---

## 3. Tipografía y Jerarquía Visual

* **Cuerpo de Texto, Párrafos y Tablas:** `Inter` (Google Fonts) — Tipografía sans-serif optimizada para lectura técnica médica y alta densidad de caracteres.
* **Títulos, Cabeceras y Tarjetas:** `Plus Jakarta Sans` (Google Fonts) — Fuente geométrica institucional de alta visibilidad.
* **Citas Normativas e IDs Vectoriales:** `Monospace` — Aplicado en IDs de fragmentos vectoriales (`chunk_id`) y código normativo.

---

## 4. Componentes de Visualización Analítica (Recharts)

La interfaz incluye cuatro componentes principales basados en la librería `recharts`:

1. **`SkillRadarChart.jsx` ([../frontend/src/components/SkillRadarChart.jsx](../frontend/src/components/SkillRadarChart.jsx)):** Renderiza un gráfico de radar pentagonal (`ResponsiveContainer` + `RadarChart`) trazando la puntuación de desempeño (0 a 100) en los 4 ejes clínicos estandarizados: **Diagnóstico**, **Tratamiento**, **Prevención** y **Seguimiento**.
2. **`ReasoningTrends.jsx` ([../frontend/src/components/ReasoningTrends.jsx](../frontend/src/components/ReasoningTrends.jsx)):** Renderiza un gráfico de áreas y líneas (`AreaChart`) que ilustra la evolución longitudinal del puntaje del estudiante a lo largo del tiempo agrupado por GPC.
3. **`CoordinatorAnalytics.jsx` ([../frontend/src/components/CoordinatorAnalytics.jsx](../frontend/src/components/CoordinatorAnalytics.jsx)):** Panel B2B para directores académicos que muestra el ranking de brechas colectivas institucionales mediante barras horizontales (`BarChart`).
4. **`FeedbackCard.jsx` ([../frontend/src/components/FeedbackCard.jsx](../frontend/src/components/FeedbackCard.jsx)):** Renderiza la tarjeta de retroalimentación cualitativa/cuantitativa con aciertos, omisiones, cita normativa y competencias deficientes.

---

## 5. Configuración de Progressive Web App (PWA) ([../frontend/vite.config.js](../frontend/vite.config.js))

La aplicación web está empaquetada como PWA mediante `vite-plugin-pwa`:
* **Manifiesto Web:** `name: 'Ateneo - Evaluación de Razonamiento Clínico'`, `short_name: 'Ateneo RAG'`.
* **Modo de Display:** `standalone`, orientación preferencial `portrait`.
* **Color de Tema e Interfaz:** `#0f172a` (`slate-900`).
* **Estrategia de Registro del Service Worker:** `autoUpdate`.
