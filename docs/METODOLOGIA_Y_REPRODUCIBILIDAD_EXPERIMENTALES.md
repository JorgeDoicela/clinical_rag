# Metodología Experimental, Reproducibilidad Científica y Generación de Tablas LaTeX

Este documento describe el protocolo experimental riguroso implementado en **Ateneo** para garantizar la validez metodológica, ausencia total de sesgos (*Data Leakage*) y reproducibilidad formal en publicaciones científicas indexadas (IEEE, Springer, Lancet Digital Health, MDPI) y congresos médicos y computacionales.

---

## 1. Corpus Normativo Oficial de Guías de Práctica Clínica (GPC)

El corpus está compuesto por **46 documentos oficiales** emitidos por el Ministerio de Salud Pública (MSP) del Ecuador, organizados por sus años de promulgación (2013 a 2019). El 100% de los documentos se encuentra mapeado nosológicamente contra la Clasificación Internacional de Enfermedades (**CIE-10**) y categorizado en 11 especialidades médicas:

* **Ginecología y Obstetricia** (Preeclampsia, Hemorragia Posparto, RPM, Cesárea, Anemia Gestacional, Trabajo de Parto, Infección Vaginal, etc.)
* **Pediatría y Neonatología** (EHIRN, Sepsis Neonatal, Recién Nacido Prematuro, Dificultad Respiratoria, APLV, Hipotiroidismo Congénito)
* **Medicina Interna y Crónicos** (Diabetes Mellitus Tipo 2, Enfermedad Renal Crónica, Artritis Reumatoide, Dolor Lumbar)
* **Infectología y Epidemiología** (Dengue, Tuberculosis Pulmonar, VIH/SIDA)
* **Cardiología y Neumología** (Hipertensión Arterial Primaria, Neumonía Adquirida en la Comunidad, Fibrosis Quística)
* **Genética y Hematología** (Fenilcetonuria, Enfermedad de Gaucher, Hemofilia Congénita)
* **Cuidados Paliativos y Oncología** (Cuidados Paliativos Integrales, Dolor Oncológico, Linfoma de Hodgkin)
* **Salud Mental y Neurología** (Episodio Depresivo Mayor, Trastornos del Espectro Autista)
* **Dermatología** (Acné Vulgar)
* **Odontología** (Caries Dental, Trauma Dental, Protocolos de Tratamiento Odontológico)
* **Medicina Familiar y Preventiva** (Supervisión de Salud de Adolescentes, Alimentación de la Gestante)

---

## 2. Protocolo de División de Datos: Document-Level Stratified Out-of-Distribution Split

Para evitar la sobreestimación del rendimiento causada por la memorización del estilo, autoría o vocabulario específico de un documento (*Data Leakage* intra-documento), la partición del dataset se ejecuta estrictamente a nivel de **Guías de Práctica Clínica completas**, estratificadas por especialidad médica:

| Partición del Dataset | Proporción | Cantidad de Guías | Función Científica |
| :--- | :---: | :---: | :--- |
| **Training Set (`train_triplets.json`)** | **`70%`** | ~31 GPCs | Ajuste supervisado de los pesos del modelo denso `ateneo-bge-m3-ecuador` con pérdida MNRL en GPU NVIDIA A100. |
| **Validation Set (`val_triplets.json`)** | **`15%`** | ~6 GPCs | Monitoreo de exactitud de ranking por época (`TripletEvaluator`) y parada temprana (*Early Stopping*). |
| **Test Set Ciego (`test_triplets_blind.json`)** | **`15%`** | ~6 GPCs | Evaluación ciega *Out-of-Distribution* de generalización del RAG sobre normas jamás vistas en entrenamiento. |

---

## 3. Auditoría de Cero Fuga de Datos (*Data Leakage Prevention*)

El script de auditoría ([backend/ingestion/dataset_validator.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/ingestion/dataset_validator.py)) certifica matemáticamente las siguientes condiciones de validez:
1. **Intersección Vacía de Guías Clínicas:**
   $$\text{Guias}(\text{Train}) \cap \text{Guias}(\text{Test}) = \emptyset, \quad \text{Guias}(\text{Train}) \cap \text{Guias}(\text{Val}) = \emptyset$$
2. **Cero Coincidencia Textual:** Ningún fragmento normativo positivo ($p^+$) presente en el conjunto de validación o prueba existe dentro del conjunto de entrenamiento.

---

## 4. Minería de Negativos Difíciles (*Multilevel Hard Negative Mining*)

Durante la construcción de tripletas $(q, p^+, n^-)$:
* **Nivel 1 (Hard Negative Intra-Guía):** Se selecciona el fragmento de la misma guía con mayor similitud léxica/conceptual pero que corresponde a otra sección o recomendación clínica.
* **Nivel 2 (Hard Negative Intra-Especialidad):** Se selecciona un fragmento de otra guía de la misma especialidad médica (ej. manejo de HTA crónica como negativo para preeclampsia severa).

---

## 5. Hiperparámetros de Entrenamiento en GPU Élite (NVIDIA A100)

* **Backbone:** `BAAI/bge-m3` (1,024 dimensiones latentes, 560M parámetros).
* **Ventana Contextual (`max_seq_length`):** `1024 tokens` (preservación íntegra de tablas de dosis y algoritmos).
* **Tamaño de Lote (`batch_size`):** `32` (genera 31 negativos *In-Batch* reales + 32 *Hard Negatives* por paso de gradiente).
* **Optimizador:** `AdamW` ($lr = 2\times 10^{-5}$, $weight\_decay = 0.01$).
* **Scheduler:** `Cosine Annealing` con $10\%$ de pasos de calentamiento (*Warmup*).
* **Precisión:** `BF16 / TF32` nativo acelerado en Tensor Cores.

---

## 6. Métricas Estándar de Recuperación de Información (IR) y Evaluación

La evaluación cuantitativa calcula las métricas estándar de ciencia de la información:

* **Hit@k ($k \in \{1, 3, 5\}$):**
  $$\text{Hit@}k = \frac{1}{|Q|} \sum_{q \in Q} \mathbb{I}(\text{rank}(q) \le k)$$

* **Mean Reciprocal Rank (MRR@5):**
  $$\text{MRR} = \frac{1}{|Q|} \sum_{q=1}^{|Q|} \frac{1}{\text{rank}_q}$$

* **Normalized Discounted Cumulative Gain (NDCG@5):**
  $$\text{DCG@}k = \sum_{i=1}^{k} \frac{2^{\text{rel}_i} - 1}{\log_2(i + 1)}, \quad \text{NDCG@}k = \frac{\text{DCG@}k}{\text{IDCG@}k}$$

* **Convalidez Sintáctica JSON (Pydantic):** Tasa de éxito del modelo generativo Gemini cumpliendo con el esquema `EvaluationResult` en cuatro ejes clínicos (Diagnóstico, Tratamiento, Prevención y Seguimiento).
* **Latencias Percentiles ($P_{50}$ y $P_{95}$):** Tiempos de respuesta end-to-end de la consulta.

---

## 7. Control de Reproducibilidad Determinista

Todas las semillas aleatorias de PyTorch, NumPy y Python se fijan rígidamente a `seed=42`:
```python
import random, torch, numpy as np
random.seed(42)
np.random.seed(42)
torch.manual_seed(42)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(42)
```
