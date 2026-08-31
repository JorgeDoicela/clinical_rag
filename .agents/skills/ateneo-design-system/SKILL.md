---
name: ateneo-design-system
description: Activa esta skill para tareas de diseño UI/UX, modificación de estilos visuales, paleta de colores, tipografía, componentes analíticos y maquetación de la aplicación cliente Ateneo+ (React + Vite PWA).
---

# Sistema de Diseño Visual y Arquitectura UI/UX de Ateneo+

Esta habilidad define las directrices oficiales de diseño, tokens cromáticos, tipografía, componentes analíticos y reglas de interfaz gráfica para **Ateneo+** (React + Vite PWA).

---

## 1. Principios de Experiencia de Usuario (UX)

La interfaz gráfica de Ateneo+ implementa el paradigma **"Clínico Minimalista, Precisión Diagnóstica & IA de Vanguardia"**:

* **Entorno de Lectura Médica Prolongada:** Superficies neutras frías (`slate-50`, `bg-white`) con contraste tipográfico riguroso para prevenir fatiga visual en análisis de casos clínicos extensos.
* **Prohibición Estricta de Emojis:** Queda prohibido el uso de caracteres emoji en cualquier componente o mensaje de la interfaz gráfica para mantener un tono estrictamente académico e institucional.
* **Iconografía e Imágenes Planas (Sin Fondos Ni Cajas Sintéticas):**
  - **Queda estrictamente prohibido envolver iconos o logos dentro de cajas con color de fondo (`bg-*-50`, `bg-*-100`), marcos circulares (`rounded-full`), bordes artificiales o contenedores decorativos.**
  - Todos los iconos (`lucide-react`) deben renderizarse planos, limpios y transparentes directamente sobre la superficie o al lado del texto.
  - Los logos e imagotipos (`/ateneo.png`) deben colocarse directamente sobre el lienzo sin marcos ni tarjetas de fondo.
* **Aprovechamiento del Espacio Horizontal (Widescreen Fluid Layout):**
  - Las vistas principales y el Navbar utilizan un ancho holgado de alto aprovechamiento (`w-full max-w-[1680px] mx-auto px-4 sm:px-8 lg:px-12`).
  - Las cuadrículas de tarjetas de casos y dashboards se distribuyen en 3 columnas en pantallas grandes (`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6`), evitando márgenes vacíos excesivos en monitores panorámicos.
* **Disposición Split-Screen (Antiapilamiento):** Diseño de pantalla dividida en 2 columnas principales en la vista de resolución de casos:
  - **Columna Izquierda (50%):** Enunciado del caso clínico, preámbulo, imagen médica o galería multi-estudio (Rx, ECG, Labs) e indicación de la GPC de referencia.
  - **Columna Derecha (50%):** Pregunta evaluativa, área de redacción en texto libre, dictado por voz, zona de carga de archivos (drag & drop) y botón de envío/dictamen.

---

## 2. Identidad de Marca y Paleta de Colores (Ateneo+)

### 2.1 Imagotipo Oficial y Gradiente de Marca
El imagotipo oficial de **Ateneo+** (`/ateneo.png`) fusiona la letra **A**, el estetoscopio clínico y la cruz médica **+**.

* **Gradiente Tricolor Primario:** `linear-gradient(135deg, #06b6d4 0%, #2563eb 50%, #7c3aed 100%)`
  - **Cyan Clínico (`#06b6d4` / `cyan-500`):** Extremo izquierdo del trazo "A" y escaneo multimodal.
  - **Azul Royal (`#2563eb` / `blue-600`):** Centro del trazado y autoridad médica principal.
  - **Indigo / Violeta IA (`#6366f1` / `#7c3aed`):** Campana del estetoscopio, cruz "+" y razonamiento por IA/RAG.
* **Estilo del Título de Marca:**
  ```jsx
  <h1 className="font-heading font-black tracking-tight text-slate-900">
    ATENEO<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600">+</span>
  </h1>
  ```
* **Renderizado del Imagotipo:**
  El imagotipo `/ateneo.png` se renderiza limpio y plano directamente sobre la superficie, sin cajas de fondo, sombras sintéticas ni contenedores adicionales.
  ```jsx
  <img src="/ateneo.png" alt="Ateneo+" className="w-12 h-12 object-contain mb-4" />
  ```

### 2.2 Colores Base y Superficies
* **Lienzo / Fondo Principal (Canvas de Alto Contraste):** `#f0f4f9` (Gris-azulado frío Material 3) en portales, login y vistas modales.
* **Fondo Secundario de Vistas Internas:** `#f8fafc` (`slate-50`).
* **Superficie de Tarjetas Principales:** `#ffffff` (`bg-white`) con esquinas amplias `rounded-[28px]`, sin borde exterior (`border-0` / sin líneas perimetrales) descansando directamente sobre el lienzo `#f0f4f9` para un contraste puro y limpio.
* **Texto Primario / Títulos (On-Surface):** `#1f1f1f` / `#0f172a` (`slate-900`).
* **Texto Secundario / Leyendas (On-Surface Variant):** `#444746` / `#475569` (`slate-600`).
* **Barra de Desplazamiento Estilizada (Minimal Scrollbar):** Barra delgada (`8px`), track transparente y thumb tipo píldora `#c4c7c5` (hover `#747775`) sin flechas de scroll del navegador, eliminando el scrollbar tosco predeterminado del sistema operativo.
* **Campos de Entrada Outlined Floating Label (`FloatingOutlinedInput`):** Inputs con etiqueta animada flotante. En reposo la etiqueta está dentro del campo (`top-4 text-base text-[#444746]`), y al hacer foco o contener texto flota sobre el borde superior (`-top-2 text-xs text-[#0b57d0] bg-white px-1 font-medium`). Borde en reposo `border-[#747775] hover:border-[#1f1f1f] rounded-[4px]` y borde en foco `border-2 border-[#0b57d0]`.
* **Distribución de Tarjetas Horizontales (Patrón Google Accounts):**
  - Contenedor: `w-full max-w-[1040px] bg-white rounded-[28px] p-8 sm:p-12 min-h-[390px] flex flex-col justify-between`.
  - Grid: `grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-stretch`.
  - Columna Izquierda (5 cols): Logo plano `/ateneo.png`, Título `h1` (`32px` regular `400`), subtítulo y pie institucional abajo (`justify-between`).
  - Columna Derecha (7 cols): Padding superior `pt-4 md:pt-14` para alinear con el título izquierdo, campos flotantes, enlace de ayuda y fila inferior con botón píldora *"Siguiente"* / *"Ingresar"*.
  - Chip de Cuenta Seleccionada: Píldora interactiva `inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-300` para cambiar de cuenta.

### 2.3 Identidad Cromática por Rol de Usuario (RBAC) y Pestañas Planas
* **Prohibición de Cajas Anidadas ("Caja dentro de Caja"):** Queda prohibido meter botones dentro de contenedores grises tipo pill (`bg-slate-100 p-1 border rounded-xl` con botones `bg-white border`).
* **Estilo de Pestañas Autorizado:** Usar pestañas planas con línea de subrayado activa (`border-b-2`) o enlaces limpios con cambio de color de texto.

| Rol de Usuario | Color de Acento | Clases Tailwind para Pestañas Activas (Underline) | Icono Lucide |
| :--- | :--- | :--- | :--- |
| **Alumno** | Cyan Clínico (`#06b6d4`) | `border-cyan-600 text-cyan-700 font-semibold` | `GraduationCap` |
| **Docente** | Azul Royal (`#2563eb`) | `border-blue-600 text-blue-700 font-semibold` | `Stethoscope` |
| **Administrador** | Indigo/Violeta (`#6366f1`) | `border-indigo-600 text-indigo-700 font-semibold` | `Shield` |

```jsx
{/* Patrón oficial de pestañas planas */}
<div className="flex items-center gap-6 border-b border-slate-200">
  <button className="pb-2.5 text-sm font-medium flex items-center gap-1.5 border-b-2 border-cyan-600 text-cyan-700 font-semibold -mb-[2px]">
    <GraduationCap className="w-4 h-4" />
    <span>Alumno</span>
  </button>
</div>
```

### 2.4 Botones y Acciones Principales (CTA)
Botón píldora (`rounded-full`) con gradiente tricolor de marca y sombra interactiva:
```jsx
className="py-2.5 px-7 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:via-blue-700 hover:to-indigo-700 text-white font-medium text-sm rounded-full transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
```

### 2.5 Semántica de Evaluación Formativa RAG
* **Aciertos Clínicos:** Verde Esmeralda (`#059669` / Contenedor `bg-emerald-50 border-emerald-200`)
* **Omisiones Formativas:** Ámbar Formativo (`#d97706` / Contenedor `bg-amber-50 border-amber-200`)
* **Cita Normativa Oficial MSP:** Azul Índigo (`#6366f1` / Contenedor `bg-indigo-50 border-indigo-200`)
* **Nivel de Brecha Formativa (IBF):**
  - 🔴 **Crítica (IBF > 0.40):** `#ef4444` (`red-500` / `bg-red-50 text-red-700 border-red-200`)
  - 🟡 **Moderada (0.20 ≤ IBF ≤ 0.40):** `#f59e0b` (`amber-500` / `bg-amber-50 text-amber-700 border-amber-200`)
  - 🟢 **Leve (IBF < 0.20):** `#10b981` (`emerald-500` / `bg-emerald-50 text-emerald-700 border-emerald-200`)

---

## 3. Tipografía y Jerarquía Visual (Estándar Google Material 3)

* **Familia Tipográfica:** `"Google Sans", "Plus Jakarta Sans", Roboto, sans-serif`.
* **Escala Tipográfica Oficial:**
  - **Título Principal (`h1`):** `text-[32px] sm:text-[36px] font-normal text-[#1f1f1f] leading-[1.25] tracking-normal font-heading` *(Nota: Google usa `font-weight: 400` para títulos, aportando elegancia y claridad sin pesadez).*
  - **Subtítulos y Cabeceras Secundarias (`h2`/`h3`):** `text-base sm:text-lg font-normal text-[#1f1f1f] leading-relaxed`.
  - **Cuerpo de Texto y Descripciones:** `text-sm font-normal text-[#444746] leading-relaxed`.
  - **Campos de Formulario (Inputs):** `text-base font-normal text-[#1f1f1f]`.
  - **Botones y CTAs:** `text-sm font-medium text-white`.
  - **Citas Normativas e IDs Vectoriales:** `Monospace` — Aplicado en IDs de fragmentos vectoriales (`chunk_id`), hashes SHA-256 y códigos de GPC.

---

## 4. Componentes de Visualización Analítica (Recharts & SVG)

1. **`SkillRadarChart.jsx`:** Renderiza un gráfico de radar pentagonal (`ResponsiveContainer` + `RadarChart`) con trazo en `#2563eb` y relleno `#06b6d4/20` sobre los 4 ejes clínicos estandarizados: **Diagnóstico**, **Tratamiento**, **Prevención** y **Seguimiento**.
2. **`ReasoningTrends.jsx`:** Renderiza un gráfico de áreas y líneas (`AreaChart`) en tonos Cyan y Azul que ilustra la evolución longitudinal del puntaje del estudiante a lo largo del tiempo agrupado por GPC.
3. **`CoordinatorAnalytics.jsx`:** Panel B2B para directores académicos que muestra el ranking de brechas colectivas institucionales mediante barras horizontales (`BarChart`) y semáforo IBF.
4. **`FeedbackCard.jsx`:** Renderiza la tarjeta de retroalimentación cualitativa/cuantitativa con aciertos, omisiones, cita normativa, score de fidelidad (Faithfulness) y competencias deficientes.
5. **`KnowledgeGraph.jsx`:** Grafo de competencias clínicas SVG interactivo para el motor adaptativo KST con nodos coloreados por nivel de dominio.

---

## 5. Arquitectura de Navegación Google Workspace (Master Layout)

La pantalla principal (`http://localhost:5173/` - `CaseList.jsx` y `App.jsx`) implementa el patrón **Google Workspace (Gmail / Drive) 3-Zone Architecture**:

### 5.1 Barra Superior Centralizada (`Navbar` en `App.jsx`)
* **Izquierda:** Imagotipo oficial plano `/ateneo.png` + `ATENEO+` con gradiente tricolor.
* **Centro (Cápsula de Búsqueda Flotante):**
  - Contenedor `max-w-2xl bg-[#eaf1fb] hover:bg-[#e1eaf8] focus-within:bg-white focus-within:shadow-md rounded-full px-4 py-2 flex items-center gap-3 border border-transparent focus-within:border-slate-300`.
  - Icono de lupa `Search`, input reactivo vinculado a query params `?q=...` y botón de filtros `SlidersHorizontal`.
* **Derecha:** Enlace al Benchmark Científico `Award`, botones de acceso a roles y **Avatar Circular de Usuario Material 3** con iniciales (ej. `[ MS ]`), indicador de rol de alumno y popup de perfil / logout.

### 5.2 Barra Lateral de Navegación (`aside` en `CaseList.jsx`)
* **Botón Principal CTA (+ Nueva Simulación):** Botón flotante `bg-white hover:bg-slate-50 rounded-[20px] shadow-sm` con círculo de gradiente tricolor interior `+`.
* **Secciones de Navegación Activa:** Píldoras con estado seleccionado `bg-[#c2e7ff] text-[#001d35] font-semibold rounded-full px-4 py-2.5` para *Casos Clínicos*, *Mi Rendimiento* y *Unirse a Sala en Vivo*.
* **Filtros por Especialidad MSP:** Menú vertical con contadores de casos disponibles (*Urgencias & Infectología*, *Gineco-Obstetricia*, *Medicina Interna*, *Neumología*).

### 5.3 Lienzo Blanco Flotante Central (`main` en `CaseList.jsx`)
* **Superficie:** `bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 min-h-[700px]` descansando sobre `#f0f4f9`.
* **Barra Unificada de 1 Sola Fila (Toolbar + Pestañas):**
  - **Izquierda:** Botón de recarga `RotateCw` + Pestañas con subrayado activo:
    - `[ 📄 Todos los Casos (X) ]` (`border-[#0b57d0] text-[#0b57d0]`)
    - `[ ⚡ Signos de Alarma / Código Rojo (X) ]` (`border-rose-600 text-rose-600`)
    - `[ ✅ Casos Concluidos (X) ]` (`border-emerald-600 text-emerald-600`)
  - **Derecha:** Contador descriptivo `Mostrando X de 10 casos` y alternador de vista `LayoutGrid` / `List`.
* **Banner de Caso Recomendado (Hero Card):** Tarjeta destacada `bg-[#f0f4f9] rounded-[20px] p-6` con badge `Sparkles`, tiempo estimado y botón píldora CTA *"Iniciar Simulación"*.
* **Modos de Visualización:**
  - **Cuadrícula (Grid):** Tarjetas `bg-[#f0f4f9] hover:bg-[#e8f0fe] rounded-[20px] p-5` con resumen clínico, badge GPC y enlace de evaluación formativa.
  - **Lista Compacta (List):** Filas `hover:bg-[#f0f4f9] rounded-xl py-3.5 px-3` con escaneo de 1 línea para alta densidad de información.

---

## 6. Configuración PWA

* **Manifiesto Web:** `name: 'Ateneo+'`, `short_name: 'Ateneo+'`.
* **Modo de Display:** `standalone`, orientación preferencial `portrait`.
* **Color de Tema e Interfaz:** `#ffffff` en barra superior y `#f0f4f9` en lienzo.
* **Estrategia de Registro del Service Worker:** `autoUpdate`.

