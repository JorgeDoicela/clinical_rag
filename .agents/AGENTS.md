# Reglas del Proyecto (Ateneo+)

Este archivo define el stack tecnológico y las normas de diseño exclusivas de la plataforma **Ateneo+** (Simulador Clínico y Evaluación Médica con IA — React + Vite PWA). Las reglas globales de comportamiento, ahorro de tokens y calidad técnica aplican automáticamente.

---

## 1. Stack Tecnológico y Arquitectura

* **Frontend:** React 18, Vite, TypeScript, PWA.
  - Estilos: Tailwind CSS con tokens médicos clínicos (`slate-50`, `#f0f4f9`, gradientes tricolor cyan/azul/indigo).
  - Iconos: `lucide-react` (renderizados planos, sin fondos ni cajas decorativas).
  - Estado y Flujo: Split-screen (50% caso clínico / 50% resolución diagnóstica).
* **Enfoque de Dominio:** Clínico, precisión médica, RAG/IA para retroalimentación diagnóstica con base en Guías de Práctica Clínica (GPC).

---

## 2. Reglas Cardinales de Diseño y UI/UX (Innegociables)

1. **Cero Emojis:** Prohibido el uso de emojis en cualquier componente, feedback, modal o mensaje de la interfaz gráfica.
2. **Iconos e Imágenes Planas:** Prohibido envolver iconos (`lucide-react`) o logos en cajas con color de fondo (`bg-*-50`, `bg-*-100`), círculos o bordes artificiales. Se renderizan limpios y transparentes.
3. **Lienzo y Tarjetas:** Fondo `#f0f4f9` con tarjetas `#ffffff` redondeadas (`rounded-[28px]`) sin bordes perimetrales artificiales.
4. **Campos Outlined Floating Label:** Inputs con etiqueta animada flotante que sube al borde superior al foco.

---

## 3. Orquestación y Activación de Skills (Ateneo+)

* **Tareas de UI/UX, Componentes, Vistas o Estilos:**
  1. Activar skill global `desarrollo-frontend`.
  2. Activar skill local `ateneo-design-system`.
* **Tareas de Documentación:** Activar skill global `documentacion`.
