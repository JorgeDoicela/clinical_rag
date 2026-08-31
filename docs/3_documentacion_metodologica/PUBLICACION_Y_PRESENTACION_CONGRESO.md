# Especificación de Hallazgos Técnicos y Estructura de Presentación para Artículo y Congreso

Este documento organiza los hallazgos técnicos, arquitectónicos y empíricos del sistema **Ateneo** en un marco de síntesis de alto nivel y proporciona el guion técnico estructurado para presentaciones ejecutivas, defensas de tesis y publicaciones en congresos y revistas científicas indexadas (IEEE, Springer, MDPI).

---

## 1. Resumen Ejecutivo del Sistema

### 1.1 Resumen Técnico
La evaluación del razonamiento diagnóstico, terapéutico, preventivo y de seguimiento en educación médica tradicionalmente requiere supervisión docente intensiva y presenta alta heterogeneidad en la retroalimentación. **Ateneo+** es una plataforma basada en **Recuperación Aumentada por Generación (RAG) Híbrida** acoplada a un modelo recuperador supervisado mediante Fine-Tuning por Tripletas (MNRL). El sistema procesa las respuestas redactadas por los estudiantes y las contrasta de manera automatizada contra las Guías de Práctica Clínica (GPC) oficiales del Ministerio de Salud Pública (MSP) del Ecuador.

El pipeline combina búsqueda densa basada en **`BAAI/bge-m3`** (1,024 dims) y búsqueda dispersa basada en **`BM25Okapi`** mediante **Reciprocal Rank Fusion (RRF $k=60$)**, complementado con un extractor de tablas en Markdown (`pdfplumber`), un módulo de **OCR Defensivo Multinivel** para páginas escaneadas y un catálogo nosológico **CIE-10**. Las evaluaciones se estructuran en sintaxis JSON estricta mediante la API multimodal de Google Gemini, categorizando aciertos, omisiones y deficiencias en cuatro ejes clínicos. En el benchmark experimental, el sistema alcanzó **Hit@1 = 100.0%**, **MRR@5 = 1.0000**, **NDCG@5 = 1.0000** y una **tasa de validez sintáctica JSON del 100.0%**.

### 1.2 Contribuciones Técnicas y Metodológicas
1. **Recuperación Híbrida RRF para Terminología Clínica:** Supera el problema de suavizado semántico de los embeddings densos capturando dosis numéricas exactas (*"500 mg"*), acrónimos y esquemas farmacológicos mediante BM25 + BGE-M3.
2. **Preservación de Tablas Clínicas en Markdown:** Extracción matricial que preserva relaciones de dosificación y criterios de riesgo sin pérdida de dimensionalidad.
3. **División Out-of-Distribution a Nivel de Documento:** Partición científica estricta (70% Train, 15% Val, 15% Test Ciego) auditada con cero fuga de datos (*Zero Data Leakage*).
4. **Estudio de Ablación Automatizado:** Demostración matemática del impacto individual del Fine-Tuning y de la búsqueda híbrida (Tabla II del paper).
5. **Auditoría Clínica Comprobable en Tiempo Real:** Visor interactivo modal de GPCs oficiales con salto directo a página y exportador de informes formativos membretados en PDF con hash criptográfico SHA-256.

---

## 2. Síntesis de Métricas de Rendimiento ([../backend/tests/resultados_metricas.json](../backend/tests/resultados_metricas.json) & [../backend/tests/tabla_resultados_paper.tex](../backend/tests/tabla_resultados_paper.tex))

| Métrica Evaluada | Resultado | Método de Medición y Validación |
| :--- | :---: | :--- |
| **Precisión de Recuperación Top-1 (Hit@1)** | **`100.0%`** | Coincidencia exacta del fragmento recuperado (`chunk_id`) con el fragmento ideal normativo. |
| **Precisión en Top-3 / Top-5 (Hit@3 / Hit@5)** | **`100.0%` / `100.0%`** | Presencia del fragmento correcto en las primeras 3 y 5 posiciones RRF. |
| **Mean Reciprocal Rank (MRR@5)** | **`1.0000`** | Promedio del inverso del rango del fragmento normativo exacto. |
| **Normalized Discounted Cumulative Gain (NDCG@5)** | **`1.0000`** | Ganancia acumulada descontada normalizada sobre el ranking de recuperación. |
| **Validez de Estructura JSON (LLM)** | **`100.0%`** | Validación estricta de sintaxis mediante Pydantic `EvaluationResult`. |
| **Latencia Mediana por Consulta ($P_{50}$)** | **`7.73 s`** | Percentil 50 de tiempo de respuesta end-to-end. |
| **Latencia Percentil 95 ($P_{95}$)** | **`14.50 s`** | Percentil 95 en condiciones de inferencia con carga multimodal. |

---

## 3. Tabla II del Paper: Estudio de Ablación Arquitectónica ([../backend/tests/tabla_ablacion_paper.tex](../backend/tests/tabla_ablacion_paper.tex))

```latex
\begin{table*}[t]
\centering
\caption{Estudio de Ablación: Impacto del Fine-Tuning Supervisado y la Búsqueda Híbrida RRF en Ateneo}
\label{tab:ablation_study_ateneo}
\begin{tabular}{lcccccc}
\toprule
\textbf{Variante Arquitectónica} & \textbf{Hit@1 $\uparrow$} & \textbf{Hit@3 $\uparrow$} & \textbf{Hit@5 $\uparrow$} & \textbf{MRR@5 $\uparrow$} & \textbf{NDCG@5 $\uparrow$} & \textbf{Latencia $P_{50}$} \\
\midrule
1. Sparse BM25 Solo (Sin Embeddings)    & 66.7\%  & 80.0\%  & 86.7\%  & 0.7333 & 0.7684 & 2.4 ms \\
2. Dense Base Solo (BAAI/bge-m3)        & 73.3\%  & 86.7\%  & 93.3\%  & 0.8111 & 0.8415 & 45.1 ms \\
3. Dense Fine-Tuned Solo (MNRL)         & 93.3\%  & 100.0\% & 100.0\% & 0.9667 & 0.9782 & 46.8 ms \\
4. Ateneo RAG Híbrido Completo (RRF)    & \textbf{100.0\%} & 100.0\% & 100.0\% & \textbf{1.0000} & \textbf{1.0000} & 48.5 ms \\
\bottomrule
\end{tabular}
\end{table*}
```

---

## 4. Guion Estructurado para Presentación en Congreso (10 Diapositivas)

1. **Diapositiva 1 (Carátula):** Título de la investigación, filiación académica y autores.
2. **Diapositiva 2 (Problema Clínico-Docente):** Sobrecarga en la tutoría médica e inconsistencia en la retroalimentación formativa en internado rotativo.
3. **Diapositiva 3 (Solución Ateneo RAG):** Arquitectura RAG Híbrida (Dense BGE-M3 + Sparse BM25 con Reciprocal Rank Fusion).
4. **Diapositiva 4 (Ingesta y Extracción Estructurada):** Procesamiento de las 60 GPCs del MSP, extracción de tablas en Markdown y OCR Defensivo.
5. **Diapositiva 5 (Fine-Tuning Supervisado):** Entrenamiento con función de pérdida MNRL, Hard Negative Mining y Document-Level Split.
6. **Diapositiva 6 (Evaluador Multimodal):** Prompting estructurado en Gemini API con validación de esquemas Pydantic y análisis en 4 ejes clínicos.
7. **Diapositiva 7 (Resultados Experimentales):** Tabla I de métricas IR (Hit@1=100%, MRR=1.0000, NDCG=1.0000).
8. **Diapositiva 8 (Estudio de Ablación):** Tabla II demostrando la superioridad del modelo híbrido RRF frente a baselines léxicos y densos puros.
9. **Diapositiva 9 (Demostración en Vivo):** Visor interactivo de PDFs con salto a página oficial y descarga de reportes clínicos con firma SHA-256.
10. **Diapositiva 10 (Conclusiones y Trabajo Futuro):** Validación en educación médica, resiliencia metodológica y despliegue hospitalario.
