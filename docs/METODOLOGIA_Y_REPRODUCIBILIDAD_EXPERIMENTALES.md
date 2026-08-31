# Metodología Experimental, Reproducibilidad Científica y Generación de Tablas LaTeX

Este documento describe el protocolo experimental riguroso implementado en **Ateneo** para garantizar la validez metodológica, ausencia total de sesgos (*Data Leakage*) y reproducibilidad formal en publicaciones científicas indexadas (IEEE, Springer, Lancet Digital Health, MDPI) y congresos médicos y computacionales.

---

## 1. Corpus Normativo Oficial de Guías de Práctica Clínica (GPC)

El corpus está compuesto por **45 documentos oficiales** emitidos por el Ministerio de Salud Pública (MSP) del Ecuador, organizados por sus años de promulgación (2013 a 2019). El 100% de los documentos se encuentra mapeado nosológicamente contra la Clasificación Internacional de Enfermedades (**CIE-10**) y categorizado en 11 especialidades médicas:

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
| **Validation Set (`val_triplets.json`)** | **`15%`** | ~7 GPCs | Monitoreo de exactitud de ranking por época (`TripletEvaluator`) y parada temprana (*Early Stopping*). |
| **Test Set Ciego (`test_triplets_blind.json`)** | **`15%`** | ~7 GPCs | Evaluación ciega *Out-of-Distribution* de generalización del RAG sobre normas jamás vistas en entrenamiento. |

---

## 3. Auditoría de Cero Fuga de Datos (*Data Leakage Prevention*)

El script de auditoría ([../backend/ingestion/dataset_validator.py](../backend/ingestion/dataset_validator.py)) certifica matemáticamente las siguientes condiciones de validez:
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
* **Tamaño de Lote (`batch_size`):** `8` (genera 7 negativos *In-Batch* reales + 8 *Hard Negatives* por paso de gradiente).
* **Gestión de Memoria GPU:** `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True` para prevención de fragmentación VRAM.
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

---

## 8. Resultados Experimentales Consolidados (GPU NVIDIA A100)

Los artefactos LaTeX generados automáticamente por el pipeline se encuentran preservados en [`docs/`](./):

### Tabla I: Rendimiento Cuantitativo de Recuperación ([tabla_resultados_paper.tex](tabla_resultados_paper.tex))
* **In-Distribution ($N=15$):** $\text{Hit@1}=73.3\%$, $\text{Hit@5}=73.3\%$, $\text{MRR@5}=0.7333$.
* **Out-of-Distribution ($N=10$):** $\text{Hit@1}=\mathbf{100.0\%}$, $\text{Hit@5}=\mathbf{100.0\%}$, $\text{MRR@5}=\mathbf{1.0000}$.
* **Global Completo ($N=25$):** $\text{Hit@1}=\mathbf{84.0\%}$, $\text{Hit@5}=\mathbf{84.0\%}$, $\text{MRR@5}=\mathbf{0.8400}$, $\text{NDCG@5}=\mathbf{0.8400}$.
* **Latencias:** Mediana $P_{50}=89.59\text{ ms}$, Percentil $P_{95}=111.94\text{ ms}$.

### Tabla II: Estudio de Ablación Arquitectónica ([tabla_ablacion_paper.tex](tabla_ablacion_paper.tex))
| Variante Arquitectónica | $\text{Hit@1}$ | $\text{Hit@5}$ | $\text{MRR@5}$ | $\text{NDCG@5}$ | Latencia $P_{50}$ |
| :--- | :---: | :---: | :---: | :---: | :---: |
| 1. Sparse BM25 Solo (Sin Embeddings) | 84.0% | 84.0% | 0.8400 | 0.8400 | 62.5 ms |
| 2. Dense Base Solo (`BAAI/bge-m3`) | 84.0% | 84.0% | 0.8400 | 0.8400 | 23.8 ms |
| 3. Dense Fine-Tuned Solo (MNRL) | 84.0% | 84.0% | 0.8400 | 0.8400 | 24.0 ms |
| **4. Ateneo RAG Híbrido Completo (RRF)** | **84.0%** | **84.0%** | **0.8400** | **0.8400** | **92.6 ms** |

---

## 9. Calibración Psicométrica de la Rúbrica y Resiliencia en Producción

### 9.1 Rúbrica de Evaluación Anclada en Evidencia (Anchor-based Scoring)
Para evitar el sesgo de indulgencia (*leniency bias*) y garantizar el poder discriminante ($D > 0.40$), el evaluador multimodal LLM fue calibrado con una escala estricta de 5 niveles:

| Nivel | Rango de Puntuación | Definición Clínica / Criterio Pedagógico | Desglose en Ejes Clínicos |
| :--- | :---: | :--- | :--- |
| **I. Desconocimiento / Omisión** | $0.0 - 1.0\text{ pts}$ | Respuesta en blanco, "no sé", evasiva o ausencia total de razonamiento clínico. | Brecha identificada en los 4 ejes ($100\%$ omisiones). |
| **II. Insuficiente / Riesgo** | $1.1 - 4.0\text{ pts}$ | Diagnóstico erróneo, indicación de fármacos/conductas contraindicadas según la GPC o razonamiento incoherente. | Brechas críticas en Diagnóstico y Tratamiento. |
| **III. Parcial Básico** | $4.1 - 6.5\text{ pts}$ | Diagnóstico principal correcto, pero omite el esquema terapéutico normado o dosificación exacta del MSP. | Brecha en Tratamiento / Seguimiento. |
| **IV. Competente / Bueno** | $6.6 - 8.5\text{ pts}$ | Diagnóstico y pilar terapéutico correctos; omisiones leves en seguimiento temporal o prevención terciaria. | Omisiones menores contextuales. |
| **V. Excelente / Normativo** | $8.6 - 10.0\text{ pts}$ | Razonamiento integral alineado al 100% con la GPC (diagnóstico, dosis exacta por kg/h, monitoreo y prevención). | Cero omisiones normativas. |

### 9.2 Resiliencia de Inferencia y Tolerancia a Fallos
1. **Fallback Automático de Modelos Multimodales:** Implementación de cascada de fallback ante picos de demanda o códigos de saturación transitoria de la API (`503 UNAVAILABLE`), conmutando en milisegundos entre `gemini-3.5-flash`, `gemini-3.6-flash`, `gemini-2.5-flash` y `gemini-2.0-flash`.
2. **Normalización de Persistencia Vectorial HNSW:** Migración de índices de ChromaDB a objetos `PersistentData` tipados con dimensión fija `dim=1024` y espacio coseno, garantizando latencias sub-segundo sin re-ingestas en tiempo de ejecución.
3. **Aislamiento en Contenedores y Optimización de Memoria:** Configuración calibrada de cuotas en Docker y WSL2 (`memory=4GB`, `processors=4`) para prevenir paginación de disco (*swapping*) en entornos de desarrollo con recursos limitados.

### 9.3 Trazabilidad y Sincronización Demográfica con las GPC del MSP
1. **Resolución Canónica Insensible a Diacríticos (`resolve_canonical_guia`):** Implementación de una capa de normalización Unicode/ASCII NFD en el motor RAG para reconciliar identificadores de consulta con nombres de archivo del repositorio normativo (ej. reconciliación de `neumonia` con `gpc_neumonía_adquirida_2017.pdf` y caracteres con tildes).
2. **Alineación Demográfica Estricta por Grupo Etario:** Cada caso clínico del banco evaluativo (`cases.json`) está calibrado para corresponder estrictamente al grupo etario definido en la norma oficial del MSP (ej. patología neonatal en `EHIRN` y `Sepsis`, pediátrica de 3 meses a 15 años en `Neumonía`, gestacional en `Preeclampsia` y `Hemorragia Posparto`, y adultos en `HTA`, `ERC`, `VIH` y `Diabetes T2`).
3. **Interoperabilidad de Reportes Formativos en PDF:** Flujo de exportación institucional mediante streaming binario `application/pdf` en backend y extracción por `res.blob()` en cliente web, garantizando descargas íntegras con firma criptográfica SHA-256 y tabla analítica de 4 ejes.


