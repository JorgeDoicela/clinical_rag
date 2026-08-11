# Protocolo de Reproducibilidad Experimental y Análisis Estadístico

Este documento establece la especificación detallada del protocolo de reproducibilidad experimental, el desglose epidemiológico del banco de casos clínicos de prueba, la parametrización determinista del entorno de ejecución y los criterios de evaluación cuantitativa para garantizar la réplica técnica exacta de los experimentos del sistema.

---

## 1. Caracterización del Dataset de Evaluación y Cobertura Clínica

El banco de pruebas de evaluación formativa se compone de **15 casos clínicos estructurados** derivados de escenarios de atención primaria y de urgencia hospitalaria en el contexto del sistema de salud del Ecuador. Cada caso está mapeado de forma explícita a un fragmento normativo ideal (`fragmento_gpc_ideal_id`) en la base vectorial de **557 chunks** procesados a partir de las Guías de Práctica Clínica (GPC) oficiales del Ministerio de Salud Pública (MSP).

### 1.1 Distribución Epidemiológica por Patología y Módulo GPC
| Módulo Clínico / Patología | Cantidad de Casos | Nivel Académico Esperado | GPC de Referencia del MSP | Identificador del Fragmento Ideal |
| :--- | :---: | :---: | :--- | :--- |
| **Dengue (Signos de Alarma)** | `2` | Pregrado Avanzado / Internado | GPC Dengue MSP | `dengue_chunk_004` |
| **Preeclampsia Severa** | `2` | Pregrado Avanzado / Internado | GPC Trastornos Hipertensivos | `preeclampsia_chunk_002` |
| **EHIRN (Vitamina K)** | `2` | Pregrado Avanzado / Internado | GPC EHIRN 2019 MSP | `ehirn_chunk_001` |
| **Neumonía (NAC - CURB-65)** | `2` | Pregrado Intermedio/Avanzado | GPC Neumonía MSP | `neumonia_chunk_001` |
| **Hemorragia Posparto (Código Rojo)** | `2` | Pregrado Avanzado / Internado | GPC Código Rojo MSP | `hemorragia_chunk_001` |
| **Diabetes Mellitus Tipo 2** | `1` | Pregrado Intermedio | GPC Diabetes T2 MSP | `diabetes_chunk_005` |
| **Tuberculosis Pulmonar** | `1` | Pregrado Intermedio | GPC Tuberculosis MSP | `tb_chunk_003` |
| **VIH / SIDA (Profilaxis)** | `1` | Pregrado Avanzado | GPC VIH MSP | `vih_chunk_008` |
| **Hipertensión Arterial Primaria** | `1` | Pregrado Intermedio | GPC HTA MSP | `hta_chunk_002` |
| **Enfermedad Renal Crónica** | `1` | Pregrado Avanzado | GPC ERC MSP | `erc_chunk_006` |

---

## 2. Parametrización Determinista del Entorno Experimental

Para asegurar la reproducibilidad determinista de los experimentos de embeddings y evaluación LLM:

### 2.1 Variables de Semilla y Control de Aleatoriedad (PyTorch / NumPy / Python)
En el script de entrenamiento [create_ft_dataset.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/ingestion/create_ft_dataset.py) y en el notebook de entrenamiento se fijaron las semillas aleatorias:
```python
import random
import torch
import numpy as np

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)
```

### 2.2 Hiperparámetros del Generador LLM ([backend/rag/evaluator.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/rag/evaluator.py#L48-L52))
* **Temperatura de Muestreo ($T$):** `0.2` (Baja varianza semántica para privilegiar la adherencia estricta al texto normativo recuperado).
* **Top-P (Nucleus Sampling):** `0.95`
* **Formato de Salida Forzado:** `response_mime_type="application/json"`
* **Instrucción de Sistema:** `SYSTEM_INSTRUCTION` fija en [prompt_builder.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/rag/prompt_builder.py#L4-L16).

---

## 3. Especificación Hardware y Entorno de Ejecución

### 3.1 Entorno de Fine-Tuning (Cloud Training)
* **Plataforma:** Google Colab Pro.
* **Unidad de Procesamiento Gráfico (GPU):** NVIDIA T4 (15.3 GB VRAM, 2,560 Tensor Cores).
* **Entorno de Software:** Python `3.10.12`, PyTorch `2.1.0+cu121`, `sentence-transformers` `3.3.1`.
* **Consumo de Memoria VRAM Registrado:** **~5.5 GB VRAM** (con Precisión Mixta FP16 activada).

### 3.2 Entorno de Inferencia y Benchmark Local
* **Procesador (CPU):** Intel Core i7 11ma Generación / AMD Ryzen 7 (8 núcleos / 16 hilos).
* **Memoria RAM:** 16 GB DDR4.
* **Sistema Operativo:** Windows 11 / Ubuntu 22.04 LTS (Docker Engine 24.0+).
* **Motor Vectorial:** ChromaDB `0.6.3` con persistencia nativa en SQLite3 HNSW.

---

## 4. Métricas Formales de Evaluación Cuantitativa

### 4.1 Precisión de Recuperación en Top-1 (Hit@1)
Medida binaria que determina si el fragmento devuelto por el recuperador denso coincide exactamente con el identificador anotado como norma de referencia:

$$\text{Hit@1} = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \mathbb{I}\left(\text{rank}(p_i^*) = 1\right)$$

Donde $|Q|$ es el total de consultas de prueba ($|Q|=15$) y $\mathbb{I}(\cdot)$ es la función indicadora. En el benchmark ejecutado por [run_metrics.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/tests/run_metrics.py), $\text{Hit@1} = \mathbf{100.0\%}$.

### 4.2 Tasa de Validez Sintáctica JSON ($\text{VR}_{\text{JSON}}$)
Mide la proporción de respuestas devueltas por el modelo evaluador que cumplen con el esquema de validación Pydantic sin requerir reintentos o excepciones de parseo:

$$\text{VR}_{\text{JSON}} = \frac{N_{\text{válidos}}}{N_{\text{totales}}} \times 100\%$$

Resultado empírico obtenido: $\text{VR}_{\text{JSON}} = \mathbf{100.0\%}$.

### 4.3 Latencia Promedio y Mediana de Respuesta
Se registra el tiempo de ejecución de extremo a extremo ($T_{\text{total}} = T_{\text{retrieval}} + T_{\text{llm}} + T_{\text{db}}$):
* **Latencia Promedio ($\bar{T}$):** $\mathbf{12.29\text{ segundos}}$.
* **Latencia Mediana ($\tilde{T}$):** $\mathbf{7.73\text{ segundos}}$.
