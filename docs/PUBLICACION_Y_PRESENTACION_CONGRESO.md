# Estructura de Contenidos para el Artículo Científico y Ponencia en Congreso

Este documento organiza los hallazgos técnicos, arquitectónicos y empíricos del sistema **Ateneo** en la estructura estándar de una publicación científica de alto impacto (IEEE / Elsevier / Springer) y para la presentación en diapositivas de un congreso académico.

---

## 1. Ficha Técnica del Artículo Científico

* **Título Sugerido:** *Evaluación Formativa del Razonamiento Clínico mediante RAG Multimodal y Fine-Tuning de Embeddings Densos sobre Guías de Práctica Clínica del MSP Ecuador*.
* **Áreas Temáticas:** Inteligencia Artificial Aplicada a la Salud, Recuperación de Información Médica (Medical IR), Informática Médica, Educación Médica Formativa.
* **Palabras Clave:** `Retrieval-Augmented Generation (RAG)`, `Fine-Tuning por Tripletas`, `BAAI/bge-m3`, `Razonamiento Clínico`, `Guías de Práctica Clínica`, `Educación Médica`.

---

## 2. Resumen (Abstract) y Planteamiento del Problema

### Resumen Breve
La evaluación del razonamiento diagnóstico y terapéutico en estudiantes de medicina tradicionalmente requiere supervisión docente intensiva y presenta variabilidad en la retroalimentación. Este artículo presenta **Ateneo**, una plataforma inteligente basada en Recuperación Aumentada por Generación (RAG) supervisada que evalúa automáticamente las respuestas en texto libre de estudiantes contrastándolas contra las Guías de Práctica Clínica (GPC) del Ministerio de Salud Pública (MSP) del Ecuador. El sistema integra el modelo de embeddings denso `BAAI/bge-m3` ajustado mediante Fine-Tuning supervisado con la función de pérdida *Multiple Negatives Ranking Loss (MNRL)* sobre 480 tripletas clínicas. Las evaluaciones se generan en JSON estructurado forzado mediante la API de Google Gemini (Multimodal), categorizando aciertos, omisiones y deficiencias en cuatro ejes clínicos (diagnóstico, tratamiento, prevención y seguimiento). En las pruebas de benchmark sobre 15 casos clínicos simulados, el sistema alcanzó una **precisión de recuperación (Hit@1) del 100.0%** y una **tasa de validez de esquema JSON del 100.0%** con una latencia promedio de **12.88 segundos**.

### Planteamiento del Problema
* Dificultad para proporcionar retroalimentación clínica cuantitativa y homogénea en cohortes numerosas de internado rotativo.
* Necesidad de basar la evaluación estrictamente en las normas técnicas oficiales del país (MSP Ecuador) para evitar alucinaciones de modelos de lenguaje genéricos.
* Limitación de los modelos recuperadores preentrenados genéricos para capturar la terminología y estructura específica de las GPC ecuatorianas.

---

## 3. Metodología y Arquitectura del Sistema

### 3.1 Arquitectura RAG en Dos Etapas
1. **Etapa 1 (Recuperación Densa Vectorial):** Extracción por páginas (`pypdf`), segmentación contextual sensible a secciones clínicas (`chunker.py`, máx. 1,000 caracteres) e indexación vectorial en ChromaDB con métrica de distancia coseno.
2. **Etapa 2 (Evaluación Multimodal Estructurada):** Construcción de prompt con fragmento normativo devuelto, análisis multimodal opcional de imágenes diagnósticas (radiografía, hemograma, ECG) e invocación a la API de Gemini con `response_mime_type="application/json"`.

### 3.2 Formulación del Fine-Tuning Supervisado
* **Dataset:** 480 tripletas compuestas por $\mathcal{T} = \{(q_i, p_i^+, p_i^-)\}_{i=1}^{N}$, derivadas de los casos clínicos y las secciones de las GPC.
* **Función de Pérdida:**
  $$\mathcal{L} = -\sum_{i=1}^{M} \log \frac{e^{\text{sim}(q_i, p_i^+)/\tau}}{\sum_{j=1}^{M} e^{\text{sim}(q_i, p_j^+)/\tau} + \sum_{k=1}^{M} e^{\text{sim}(q_i, p_k^-)/\tau}}$$
* **Optimizaciones de Memoria VRAM:** Entrenamiento en Google Colab (GPU T4 15.3 GB VRAM) con `max_seq_length=512`, `batch_size=2`, `epochs=3` (720 iteraciones) y Precisión Mixta FP16 (`use_amp=True`), reduciendo el consumo de VRAM a **~5.5 GB** y logrando una convergencia empírica de la función de pérdida a **$\mathcal{L}_{\text{MNRL}} = 0.021787$**.

---

## 4. Resultados Experimentales y Discusión

### 4.1 Métricas Cuantitativas del Benchmark (`resultados_metricas.json`)

| Parámetro Evaluado | Valor Obtenido | Método de Medición |
| :--- | :---: | :--- |
| **Casos Clínicos de Prueba** | `15` | Muestra representativa (Dengue, Preeclampsia, EHIRN, NAC, Hemorragia Posparto). |
| **Precisión de Recuperación (Hit@1)** | `100.0%` | Coincidencia exacta del fragmento `chunk_id` recuperado respecto al ideal. |
| **Validez de Estructura JSON** | `100.0%` | Validación estricta con esquemas Pydantic (`EvaluationResult`). |
| **Latencia Promedio por Consulta** | `13.38 s` | Tiempo total transcurrido (Retrieval + LLM + Persistencia SQLite). |
| **Latencia Mediana por Consulta** | `10.80 s` | Percentil 50 del tiempo de respuesta. |

### 4.2 Analítica de Inteligencia Institucional B2B y Radar de Competencias
El sistema no solo otorga una calificación numérica (0 a 10), sino que agrega analítica de cohortes para coordinadores académicos:
* **Desglose en 4 Ejes Clínicos:** Diagnóstico, Tratamiento, Prevención y Seguimiento.
* **Analítica de Consenso en Tiempo Real:** En las salas de Ateneo sincrónicas, clasifica el desempeño colectivo de la clase ("Alto Consenso", "Consenso Medio", "Brecha Colectiva Crítica").

---

## 5. Estructura Sugerida para la Exposición en el Congreso (Diapositivas)

1. **Diapositiva 1:** Titular, autores y filiación institucional.
2. **Diapositiva 2:** Problema en la educación médica: Evaluación heterogénea y sobrecarga docente.
3. **Diapositiva 3:** Propuesta de Solución: Plataforma Ateneo con RAG basado en GPCs del MSP Ecuador.
4. **Diapositiva 4:** Arquitectura Técnica: ChromaDB + BAAI/bge-m3 + Gemini API + SQLite.
5. **Diapositiva 5:** Metodología de Fine-Tuning: Tripletas ($q, p^+, p^-$) y función de pérdida MNRL.
6. **Diapositiva 6:** Resultados del Benchmark: 100% Hit@1, 100% JSON estricto, 12.88s latencia.
7. **Diapositiva 7:** Interfaz Formativa y Analítica B2B: Radar de competencias por eje y salas colaborativas.
8. **Diapositiva 8:** Conclusiones y trabajo futuro.
