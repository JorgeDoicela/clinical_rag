# Especificación de Hallazgos Técnicos y Estructura de Presentación Ejecutiva

Este documento organiza los hallazgos técnicos, arquitectónicos y empíricos del sistema **Ateneo** en un marco de síntesis de alto nivel y proporciona el guion técnico estructurado para presentaciones ejecutivas y demostraciones de software.

---

## 1. Resumen Ejecutivo del Sistema

### 1.1 Resumen Técnico
La evaluación del razonamiento diagnóstico, terapéutico, preventivo y de seguimiento en estudiantes de medicina tradicionalmente requiere supervisión docente intensiva y presenta alta heterogeneidad en la retroalimentación. **Ateneo** es una plataforma inteligente basada en Recuperación Aumentada por Generación (RAG) en dos etapas acoplada a un modelo recuperador supervisado mediante Fine-Tuning por Tripletas. El sistema procesa las respuestas libremente redactadas por los estudiantes y las contrasta de manera automatizada contra las Guías de Práctica Clínica (GPC) oficiales del Ministerio de Salud Pública (MSP) del Ecuador. 

El modelo de embeddings denso `BAAI/bge-m3` fue ajustado mediante la función de pérdida *Multiple Negatives Ranking Loss (MNRL)* sobre 480 tripletas clínicas. Las evaluaciones se generan en sintaxis JSON estricta forzada mediante la API multimodal de Google Gemini, categorizando aciertos, omisiones y deficiencias en cuatro ejes clínicos. En las pruebas de benchmark sobre 15 casos clínicos simulados y 557 fragmentos vectorizados, el sistema alcanzó una **precisión de recuperación (Hit@1) del 100.0%** y una **tasa de validez sintáctica JSON del 100.0%** con una latencia promedio de **12.29 segundos**.

### 1.2 Problema Técnico Resuelto
* **Sobrecarga Docente y Variabilidad:** Dificultad para proporcionar retroalimentación cualitativa homogénea en cohortes numerosas de internado rotativo.
* **Sesgo de Alucinación en LLMs Genéricos:** Riesgo pedagógico de evaluar respuestas clínicas utilizando modelos fundacionales genéricos sin acotamiento normativo nacional.
* **Limitación de Modelos Recuperadores Genéricos:** Incapacidad de los recuperadores sin ajuste para diferenciar la terminología técnica y esquemas de hidratación o dosificación específicos de las GPCs ecuatorianas.

---

## 2. Síntesis de Métricas de Rendimiento ([resultados_metricas.json](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/tests/resultados_metricas.json))

| Métrica Evaluada | Resultado | Método de Medición y Validación |
| :--- | :---: | :--- |
| **Casos Clínicos de Prueba** | `15` | Muestra representativa (Dengue, Preeclampsia, EHIRN, NAC, Hemorragia Posparto, HTA, TB, VIH, ERC, Diabetes). |
| **Chunks Vectorizados en DB** | `557` | Proyección densa de 1,024 dimensiones generada por `ateneo-bge-m3-ecuador`. |
| **Precisión de Recuperación (Hit@1)** | **`100.0%`** | Coincidencia exacta del identificador de fragmento (`chunk_id`) recuperado respecto al ideal. |
| **Validez de Estructura JSON** | **`100.0%`** | Validación de sintaxis mediante Pydantic `EvaluationResult`. |
| **Latencia Promedio por Consulta** | **`12.29 s`** | Tiempo transcurrido total (Retrieval + Gemini API + Persistencia SQLite). |
| **Latencia Mediana por Consulta** | **`7.73 s`** | Percentil 50 de tiempo de respuesta en CPU. |

---

## 3. Guion Estructurado para Presentación Técnica (8 Diapositivas / Secciones)

1. **Sección 1 (Introducción):** Título del sistema, arquitectura general e identidad institucional.
2. **Sección 2 (Problema):** Desafíos en la evaluación formativa del razonamiento clínico y limitaciones de la supervisión manual.
3. **Sección 3 (Solución Arquitectónica):** Arquitectura Ateneo RAG basada en las Guías de Práctica Clínica oficiales del MSP Ecuador.
4. **Sección 4 (Componentes de Software):** Diagrama de bloques (FastAPI + ChromaDB + BAAI/bge-m3 + Google Gemini + React Vite PWA).
5. **Sección 5 (Fine-Tuning por Tripletas):** Formulación de tripletas ($q, p^+, p^-$), función de pérdida MNRL y optimización VRAM en GPU Cloud T4.
6. **Sección 6 (Resultados del Benchmark):** Cuadro de métricas de prueba (100% Hit@1, 100% validez JSON, 12.29s latencia promedio).
7. **Sección 7 (Analítica B2B y Salas Sincrónicas):** Gráfico de radar por ejes clínicos y modelo de analítica de consenso colectivo en tiempo real.
8. **Sección 8 (Conclusiones Técnicas):** Validación del modelo, estabilidad del sistema y roadmap de escalabilidad.
