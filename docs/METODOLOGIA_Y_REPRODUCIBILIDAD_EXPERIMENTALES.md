# Metodología Experimental, Reproducibilidad Científica y Generación de Tablas LaTeX

Este documento describe el protocolo experimental riguroso implementado en **Ateneo** para garantizar la validez metodológica, ausencia de sesgos (*Data Leakage*) y reproducibilidad en publicaciones científicas indexadas y presentaciones en congresos médicos/computacionales.

---

## 1. Protocolo de División de Datos: Document-Level Out-of-Distribution Split

Para evitar la sobreestimación del rendimiento causada por la memorización del estilo o vocabulario de un documento (*Data Leakage*), la partición del dataset se ejecuta a nivel de **Guías de Práctica Clínica (GPC) completas**, no por párrafos aleatorios:

| Partición del Dataset | Proporción | Cantidad de Guías | Función Científica |
| :--- | :---: | :---: | :--- |
| **Training Set (`train_triplets.json`)** | **`70%`** | ~42 GPC | Ajuste supervisado de los pesos del modelo denso `ateneo-bge-m3-ecuador` con pérdida MNRL. |
| **Validation Set (`val_triplets.json`)** | **`15%`** | ~9 GPC | Monitoreo de pérdida por época en Google Colab y parada temprana (*Early Stopping*). |
| **Test Set Ciego (`test_triplets_blind.json`)** | **`15%`** | ~9 GPC | Evaluación ciega *Out-of-Distribution* de generalización del RAG sobre normas jamás vistas. |

---

## 2. Auditoría de Cero Fuga de Datos (*Data Leakage Prevention*) ([backend/ingestion/dataset_validator.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/ingestion/dataset_validator.py))

El script validador ejecuta una auditoría formal verificando:
1. **Intersección Vacía de Guías:** $\text{Guias}(\text{Train}) \cap \text{Guias}(\text{Test}) = \emptyset$.
2. **Cero Coincidencia Textual:** Ningún fragmento normativo positivo ($p^+$) presente en el conjunto de prueba existe dentro del conjunto de entrenamiento.

---

## 3. Métricas Estándar de Recuperación de Información (IR)

La evaluación cuantitativa calcula las métricas estándar de ciencia de la información:

* **Hit@k ($k \in \{1, 3, 5\}$):** Porcentaje de consultas donde el fragmento normativo exacto de la GPC se ubica dentro de los primeros $k$ resultados devueltos por la Fusión RRF:
  $$\text{Hit@}k = \frac{1}{|Q|} \sum_{q \in Q} \mathbb{I}(\text{rank}(q) \le k)$$

* **Mean Reciprocal Rank (MRR@5):** Promedio del inverso del rango del primer fragmento correcto:
  $$\text{MRR} = \frac{1}{|Q|} \sum_{q=1}^{|Q|} \frac{1}{\text{rank}_q}$$

* **Normalized Discounted Cumulative Gain (NDCG@5):**
  $$\text{DCG@}k = \sum_{i=1}^{k} \frac{2^{\text{rel}_i} - 1}{\log_2(i + 1)}, \quad \text{NDCG@}k = \frac{\text{DCG@}k}{\text{IDCG@}k}$$

* **Latencias Percentiles ($P_{50}$ y $P_{95}$):** Tiempos de respuesta end-to-end de la consulta para análisis de viabilidad en producción clínica.

---

## 4. Exportador Automático de Tablas LaTeX para Artículo Científico

El ejecutor del benchmark ([backend/tests/run_metrics.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/tests/run_metrics.py)) genera automáticamente el archivo `tabla_resultados_paper.tex`, listo para ser incluido en plantillas IEEE, Springer o MDPI:

```latex
\begin{table}[htbp]
\centering
\caption{Evaluación Cuantitativa del Pipeline RAG Híbrido (BGE-M3 + BM25 + RRF) sobre Guías MSP}
\label{tab:ateneo_rag_results}
\begin{tabular}{lcccc}
\toprule
\textbf{Métrica de Evaluación} & \textbf{Top-1} & \textbf{Top-3} & \textbf{Top-5} & \textbf{Puntaje / Valor} \\
\midrule
Precisión de Recuperación (Hit@k) & 100.0\% & 100.0\% & 100.0\% & - \\
Mean Reciprocal Rank (MRR@5)      & - & - & - & \textbf{1.0000} \\
Normalized DCG (NDCG@5)           & - & - & - & \textbf{1.0000} \\
Convalidez Sintáctica JSON (LLM)  & - & - & - & 100.0\% \\
\midrule
Latencia Mediana ($P_{50}$)       & \multicolumn{4}{c}{7.73 segundos} \\
Latencia Percentil 95 ($P_{95}$)  & \multicolumn{4}{c}{14.50 segundos} \\
\bottomrule
\end{tabular}
\end{table}
```

---

## 5. Control de Reproducibilidad Determinista
Todas las semillas aleatorias de PyTorch, NumPy y Python se fijan rígidamente a `seed=42`:
```python
import random, torch, numpy as np
random.seed(42)
np.random.seed(42)
torch.manual_seed(42)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(42)
```
