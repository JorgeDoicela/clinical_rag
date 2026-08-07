# Sistema de Diseño y Guía de Estilo Visual (Ateneo RAG UI/UX)

Este documento define la guía oficial de estilo visual, tokens de diseño y reglas de experiencia de usuario (UX/UI) para la plataforma **Ateneo RAG**.

---

## 1. Filosofía de Diseño: "Clínico Minimalista & Alta Precisión"

El diseño de Ateneo evoca una **estación de trabajo hospitalaria moderna**:
- **Confianza Médica:** Uso de colores fríos y limpios con alto contraste para lectura prolongada de casos clínicos.
- **Cero Distracciones:** Prohibición estricta de emojis en cualquier vista del sistema.
- **Iconografía Sutil:** Uso exclusivo de iconos vectoriales SVG limpios (`lucide-react`) de tamaño reducido y únicamente cuando cumplan una función clara.
- **Disposición Antiapilamiento (UX/UI):** Diseños en pantalla dividida (*Split-Screen*) o cuadrículas compactas para evitar desplazamientos verticales innecesarios.

---

## 2. Paleta de Colores y Tokens

### 2.1 Colores Base de la Interfaz
- **Fondo de Aplicación:** `#f8fafc` (`slate-50`)
- **Superficie de Tarjetas:** `#ffffff` (`bg-white`)
- **Texto Principal:** `#0f172a` (`slate-900`)
- **Texto Secundario:** `#475569` (`slate-600`)
- **Bordes:** `#e2e8f0` (`border-slate-200`)

### 2.2 Color Primario de Marca
- **Azul Cobalto Clínico:** `#0284c7` (`sky-600`)
- **Hover:** `#0369a1` (`sky-700`)
- **Fondo Sutil:** `#f0f9ff` (`sky-50`)

### 2.3 Identidad Visual por Roles (RBAC)
| Rol | Color Distintivo | Badge / Fondo | Icono Sugerido |
| :--- | :--- | :--- | :--- |
| **Alumno** | Azul Celeste (`sky-600`) | `bg-sky-50 text-sky-800 border-sky-200` | `GraduationCap` |
| **Docente** | Verde Esmeralda (`emerald-600`) | `bg-emerald-50 text-emerald-800 border-emerald-200` | `UserCheck` |
| **Administrador** | Púrpura Imperial (`purple-600`) | `bg-purple-50 text-purple-800 border-purple-200` | `ShieldCheck` |

### 2.4 Semántica de Evaluación Formativa RAG
- **Aciertos Clínicos:** Verde Esmeralda (`emerald-600` / Contenedor `bg-emerald-50/70 border-emerald-200`)
- **Omisiones / Aspectos a Mejorar:** Ámbar Formativo (`amber-600` / Contenedor `bg-amber-50/70 border-amber-200`)
- **Cita Normativa GPC (MSP):** Azul Índigo (`indigo-600` / Contenedor `bg-indigo-50/70 border-indigo-200`)

---

## 3. Tipografía

- **Párrafos, Tablas e Historiales:** `Inter` (Google Fonts) — Optimizada para lectura médica continua.
- **Títulos y Cabeceras:** `Plus Jakarta Sans` (Google Fonts) — Estructura moderna e institucional.
- **Citas de Norma y Códigos GPC:** `Monospace` — Para IDs de fragmentos y pasajes normativos oficiales.

---

## 4. Patrones de Layout y UX/UI

1. **Pantalla Dividida (Split-Screen) en Autenticación:**
   - Panel izquierdo con gradiente oscuro profesional (`from-slate-900 via-sky-950 to-slate-900`) e información institucional.
   - Panel derecho blanco focalizado en el formulario con selecciones de rol en un solo clic (*Pill-Tabs*).
2. **Navbar Minimalista:**
   - Ocultar botones redundantes cuando el usuario ya se encuentra en la vista correspondiente.
   - Badge del rol activo visible de forma permanente cuando el usuario está autenticado.
3. **Geometría de Tarjetas:**
   - Radio de curvatura: `rounded-2xl` (16px).
   - Bordes finos: `border border-slate-200`.
   - Sombras leves: `shadow-xs` / `shadow-sm`.
