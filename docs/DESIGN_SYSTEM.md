# Sistema de Diseño y Guía de Estilo Visual (Ateneo RAG UI/UX)

Este documento define la guía oficial de estilo visual, tokens de diseño y reglas de experiencia de usuario (UX/UI) para la plataforma **Ateneo RAG**.

---

## 1. Filosofía de Diseño: "Clínico Minimalista & Alta Precisión"

El diseño de Ateneo evoca una **estación de trabajo hospitalaria moderna**:
- **Confianza Médica:** Uso de colores fríos y limpios con alto contraste para lectura prolongada de casos clínicos.
- **Cero Distracciones:** Prohibición estricta de emojis en cualquier vista del sistema.
- **Iconografía Sutil y Plana:** Uso exclusivo de iconos vectoriales SVG limpios (`lucide-react`) sin cajas, contenedores o bordes artificiales que los rodeen. Los iconos se presentan planos y directos.
- **Disposición Antiapilamiento (UX/UI):** Diseños en pantalla dividida (*Split-Screen*) o cuadrículas compactas para evitar desplazamientos verticales innecesarios.
- **Sobriedad Cromática:** Prohibición de la saturación visual. No exagerar ni abusar de colores secundarios (verdes, morados, etc.) en elementos de la interfaz. La estructura debe ser neutra (`slate`) y limpia, reservando los colores únicamente para badges de rol o indicadores funcionales.

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

1. **Autenticación Ultra-Minimalista:**
   - Tarjeta central sobria (`max-w-md bg-white border border-slate-200 shadow-sm rounded-2xl`).
   - Sin degradados complejos ni fondos oscuros recargados.
   - Pila de selección de rol con control segmentado sutil (*Segmented Pill Tabs* neutros).
2. **Navbar Minimalista:**
   - Ocultar botones redundantes cuando el usuario ya se encuentra en la vista correspondiente.
   - Badge del rol activo visible de forma permanente cuando el usuario está autenticado.
3. **Geometría de Tarjetas:**
   - Radio de curvatura: `rounded-2xl` (16px).
   - Bordes finos y uniformes: `border border-slate-200` (Queda prohibido el uso de franjas o líneas gruesas laterales de color como `border-l-4` o `border-l-2`).
   - Sombras leves: `shadow-xs` / `shadow-sm`.
4. **Disciplina Cromática y Uso Sobrio de Acentos:**
   - **Evitar la saturación visual estructural:** Queda prohibido recargar fondos generales, encabezados de página o botones principales con degradados estridentes.
   - **Color Funcional de Retroalimentación:** Los colores de acento se reservan explícitamente para la evaluación médica: **Verde Esmeralda** (Aciertos / Correcto), **Ámbar Formativo** (Omisiones / Aspectos a mejorar) y **Azul Cobalto** (Citas normativas MSP y Puntaje), garantizando que el usuario distinga de inmediato si su razonamiento es correcto o requiere ajustes.

