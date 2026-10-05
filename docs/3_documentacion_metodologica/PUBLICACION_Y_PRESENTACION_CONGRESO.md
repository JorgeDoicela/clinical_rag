# Especificación de Hallazgos Técnicos y Estructura de Presentación para Artículo y Congreso

Este documento organiza los hallazgos técnicos, arquitectónicos y empíricos del sistema **Ateneo** en un marco de síntesis de alto nivel y proporciona el guion técnico estructurado para presentaciones ejecutivas, defensas de tesis y publicaciones en congresos y revistas científicas indexadas (IEEE, Springer, MDPI).

---

## 1. Resumen Ejecutivo del Sistema

### 1.1 Resumen Técnico
La evaluación del razonamiento diagnóstico, terapéutico, preventivo y de seguimiento en educación médica tradicionalmente requiere supervisión docente intensiva y presenta alta heterogeneidad en la retroalimentación. **Ateneo+** es una plataforma basada en **Recuperación Aumentada por Generación (RAG) Híbrida** acoplada a un modelo recuperador supervisado mediante Fine-Tuning por Tripletas (MNRL). El sistema procesa las respuestas redactadas por los estudiantes y las contrasta de manera automatizada contra las Guías de Práctica Clínica (GPC) oficiales del Ministerio de Salud Pública (MSP) del Ecuador.

El pipeline combina búsqueda densa basada en **`BAAI/bge-m3`** (1,024 dims) y búsqueda dispersa basada en **`BM25Okapi`** mediante **Reciprocal Rank Fusion (RRF $k=60$)**, complementado con extracción nativa de tablas en Markdown, preservación contextual por sección y un catálogo nosológico **CIE-10/CIE-11** sobre las **42 GPCs oficiales del MSP** (7,052 fragmentos normativos indivisibles). Las evaluaciones se estructuran en sintaxis JSON estricta mediante la API multimodal de Google Gemini, categorizando aciertos, omisiones y deficiencias en cuatro ejes clínicos. En el benchmark experimental de fine-tuning en GPU NVIDIA A100, el modelo **`ateneo-bge-m3-ecuador-v2`** multiplicó la precisión de recuperación Top-1 por **4.7x (+369.23%)**, elevó el **MRR@5 en +274.40%** y alcanzó una **concordancia inter-anotador $\kappa_w = 0.9509$**, respaldando un **Faithfulness Score del 100.0%** y una **ganancia de aprendizaje de Hake $g = 0.7400$ ($p < 0.0001$)**.

### 1.2 Contribuciones Técnicas y Metodológicas
1. **Recuperación Híbrida RRF para Terminología Clínica:** Supera el problema de suavizado semántico de los embeddings densos capturando dosis numéricas exactas (*"500 mg"*), acrónimos y esquemas farmacológicos mediante BM25 + BGE-M3.
2. **Preservación de Tablas Clínicas en Markdown:** Extracción matricial que preserva relaciones de dosificación y criterios de riesgo sin pérdida de dimensionalidad.
3. **División Out-of-Distribution a Nivel de Documento:** Partición científica estricta (70% Train, 15% Val, 15% Test Ciego) auditada con cero fuga de datos (*Zero Data Leakage*).
4. **Estudio de Ablación Automatizado:** Demostración matemática del impacto individual del Fine-Tuning y de la búsqueda híbrida (Tabla II del paper).
5. **Auditoría Clínica Comprobable en Tiempo Real:** Visor interactivo modal de GPCs oficiales con salto directo a página y exportador de informes formativos membretados en PDF con hash criptográfico SHA-256.

---

## 2. Síntesis de Métricas de Rendimiento ([../1_tablas_latex/tabla_pre_post_fine_tuning_bge_m3.tex](../1_tablas_latex/tabla_pre_post_fine_tuning_bge_m3.tex))

| Métrica Evaluada | Pre (Baseline) | Post (Ateneo+ v2) | Ganancia Relativa | Método de Medición y Validación |
| :--- | :---: | :---: | :---: | :--- |
| **Accuracy@1 (Hit@1)** | `0.0522` | **`0.2450`** | **`+369.23%`** | Coincidencia en Top-1 en test ciego OOD. |
| **Accuracy@5 (Hit@5)** | `0.1606` | **`0.4739`** | **`+195.00%`** | Presencia del chunk correcto en las primeras 5 posiciones. |
| **Mean Reciprocal Rank (MRR@1)** | `0.0522` | **`0.2450`** | **`+369.23%`** | Inverso del rango en primera posición. |
| **Mean Reciprocal Rank (MRR@5)** | `0.0889` | **`0.3328`** | **`+274.40%`** | Rango recíproco promedio en Top-5. |
| **NDCG@5** | `0.1066` | **`0.3682`** | **`+245.40%`** | Ganancia acumulada descontada normalizada. |
| **Concordancia Inter-Anotador ($\kappa_w$)** | --- | **`0.9509`** | --- | Validación ciega Kappa ponderado cuadrático. |

---

## 3. Tabla I del Paper: Comparación Pre vs. Post Fine-Tuning ([../1_tablas_latex/tabla_pre_post_fine_tuning_bge_m3.tex](../1_tablas_latex/tabla_pre_post_fine_tuning_bge_m3.tex))

```latex
\begin{table}[htbp]
\centering
\caption{Comparación empírica Pre vs. Post Fine-Tuning en Ateneo+ BGE-M3 Ecuador v2 (MNRL $\tau=0.02$).}
\label{tab:pre_post_retrieval}
\begin{tabular}{lcccc}
\toprule
\textbf{Métrica de Retrieval} & \textbf{Baseline (Pre)} & \textbf{Ateneo+ (Post)} & \textbf{Delta ($\Delta$)} & \textbf{Ganancia (\%)} \\
\midrule
    Accuracy@1 (Hit@1) & 0.0522 & 0.2450 & +0.1928 & +369.23\% \\
    Accuracy@5 (Hit@5) & 0.1606 & 0.4739 & +0.3133 & +195.00\% \\
    MRR@1 & 0.0522 & 0.2450 & +0.1928 & +369.23\% \\
    MRR@5 & 0.0889 & 0.3328 & +0.2439 & +274.40\% \\
    NDCG@5 & 0.1066 & 0.3682 & +0.2616 & +245.40\% \\
    Precision@5 & 0.0321 & 0.0948 & +0.0627 & +195.00\% \\
    Recall@5 & 0.1606 & 0.4739 & +0.3133 & +195.00\% \\
\bottomrule
\end{tabular}
\end{table}
```

---

## 4. Guion Estructurado para Presentación en Congreso (10 Diapositivas)

1. **Diapositiva 1 (Carátula):** Título de la investigación, filiación académica y autores.
2. **Diapositiva 2 (Problema Clínico-Docente):** Sobrecarga en la tutoría médica e inconsistencia en la retroalimentación formativa en internado rotativo.
3. **Diapositiva 3 (Solución Ateneo RAG):** Arquitectura RAG Híbrida (Dense BGE-M3 + Sparse BM25 con Reciprocal Rank Fusion).
4. **Diapositiva 4 (Ingesta y Extracción Estructurada):** Procesamiento de las 42 GPCs oficiales del MSP (7,052 fragmentos normativos indivisibles), extracción nativa de tablas en Markdown e inventario nosológico CIE-10/CIE-11.
5. **Diapositiva 5 (Fine-Tuning Supervisado):** Entrenamiento en GPU NVIDIA A100 con función de pérdida MNRL ($\tau=0.02$), Hard Negative Mining y validación inter-anotador ($\kappa_w = 0.9509$).
6. **Diapositiva 6 (Evaluador Multimodal):** Prompting estructurado en Gemini API con validación de esquemas Pydantic y análisis en 4 ejes clínicos.
7. **Diapositiva 7 (Resultados de Recuperación):** Tabla I de métricas empíricas Pre vs. Post (Hit@1 +369.23%, MRR@5 +274.40%, NDCG@5 +245.40%).
8. **Diapositiva 8 (Fidelidad Normativa y Aprendizaje):** Tabla II de Faithfulness Score (100.0% de anclaje normativo sin alucinaciones) y Tabla III de Ganancia de Hake ($g=0.7400, p<0.0001$).
9. **Diapositiva 9 (Demostración en Vivo):** Visor interactivo de PDFs con salto a página oficial y descarga de reportes clínicos con firma SHA-256.
10. **Diapositiva 10 (Conclusiones y Trabajo Futuro):** Validación en educación médica, resiliencia metodológica y despliegue hospitalario.
