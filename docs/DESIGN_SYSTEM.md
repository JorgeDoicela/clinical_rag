# Especificación del Sistema de Diseño Visual y Arquitectura UI/UX (Ateneo)

Este documento establece la especificación técnica oficial del sistema de diseño visual, tokens cromáticos, tipografía y reglas de interfaz de usuario (UI/UX) para la plataforma **Ateneo RAG**.

---

## 1. Principios de Experiencia de Usuario (UX)

La interfaz gráfica de Ateneo implementa el paradigma **"Clínico Minimalista & Alta Precisión"**:

* **Entorno de Lectura Médica Prolongada:** Aplicación de superficies neutras fríos (`slate-50`, `bg-white`) con alto contraste para prevenir fatiga visual en análisis de casos complejos.
* **Prohibición Estricta de Emojis:** Queda prohibido el uso de caracteres emoji en la interfaz para mantener el tono académico e institucional.
* **Iconografía Vectorial Plana:** Se utiliza de forma exclusiva la librería `lucide-react`. Los iconos deben renderizarse planos, sin contenedores sintéticos, sombras artificiales o bordes circulares circundantes.
* **Disposición Split-Screen (Antiapilamiento):** Pantalla dividida en vistas principales de resolución de caso para permitir lectura del caso y redacción en paralelo sin desplazamiento vertical excesivo (*scroll*).

---

## 2. Paleta de Colores y Tokens Estructurales

### 2.1 Colores Base del Sistema
* **Fondo Principal:** `#f8fafc` (`slate-50`)
* **Superficie de Tarjetas:** `#ffffff` (`bg-white`)
* **Texto Primario:** `#0f172a` (`slate-900`)
* **Texto Secundario:** `#475569` (`slate-600`)
* **Bordes Divisorios:** `#e2e8f0` (`border-slate-200`)

### 2.2 Color de Marca
* **Azul Cobalto Clínico:** `#0284c7` (`sky-600`)
* **Hover / Activo:** `#0369a1` (`sky-700`)
* **Fondo Sutil:** `#f0f9ff` (`sky-50`)

### 2.3 Identidad Cromática por Roles de Usuario (RBAC)
| Rol | Color Principal | Clases Tailwind CSS para Badges | Icono Vectorial |
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

* **Cuerpo de Texto, Párrafos y Tablas:** `Inter` (Google Fonts) — Tipografía sans-serif optimizada para lectura técnica médica.
* **Títulos, Cabeceras y Tarjetas:** `Plus Jakarta Sans` (Google Fonts) — Fuente geométrica institucional.
* **Citas Normativas y Códigos GPC:** `Monospace` — Para IDs de fragmentos vectoriales y pasajes normativos.

---

## 4. Configuración de Progressive Web App (PWA)

La aplicación está configurada para funcionar como PWA mediante `vite-plugin-pwa`:
* **Manifiesto:** `name: 'Ateneo - Evaluación de Razonamiento Clínico'`, `short_name: 'Ateneo RAG'`.
* **Modo de Display:** `standalone`, orientación `portrait`.
* **Color de Tema:** `#0f172a` (`slate-900`).
* **Actualización del Service Worker:** `autoUpdate`.
