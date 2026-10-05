# Dosier Técnico y Metodológico: Fase 6 (Fine-Tuning de BGE-M3 con MNRL en NVIDIA A100)

## 1. Identificación y Resumen Ejecutivo

| Parámetro | Especificación Técnica |
| :--- | :--- |
| **Componente** | Pipeline Científico de Ingesta v2 — Fase 6 |
| **Módulo Ejecutable CLI** | `backend/ingestion_v2/06_train_bge_m3.py` |
| **Notebook de Aceleración A100** | `backend/ingestion_v2/colab_fase6_train_bge_m3.ipynb` |
| **Modelo Base** | `BAAI/bge-m3` (568M parámetros, 1,024 dimensiones latentes) |
| **Hardware Calibrado** | NVIDIA A100 (40 GB VRAM / ~83 GB RAM de sistema) |
| **Función de Pérdida** | Multiple Negatives Ranking Loss (MNRL) con $\tau = 0.02$ ($\text{Scale} = 50.0$) |
| **Precisión de Cómputo** | `bfloat16` nativo en Tensor Cores Ampere |
| **Directorio de Salida** | `backend/data/models/ateneo-bge-m3-ecuador-v2/` |
| **Estado de la Fase** | **100% Implementada, Verificada con Dry-Run y Lista para GPU** |

---

## 2. Fundamento Metodológico y Formulación Matemática

El modelo base multilingüe `BAAI/bge-m3` cuenta con sólidas representaciones del lenguaje natural general, pero experimenta confusión en tareas de recuperación densa ante entidades nosológicas y farmacológicas homónimas o con solapamiento léxico transversal en las Guías de Práctica Clínica (GPC) del Ministerio de Salud Pública (MSP) del Ecuador.

```mermaid
graph TD
    A[retrieval_train.json: 1,178 tripletas] --> C[SentenceTransformerTrainer]
    B[retrieval_val.json: 249 tripletas] --> C
    D[BAAI/bge-m3 Base] --> C
    C -->|Optimizacion AdamW en bfloat16| E{Loss: MNRL tau=0.02}
    E --> F[In-Batch Negatives: 31 por paso]
    E --> G[Hard Negatives Minados: 1 por paso]
    C --> H[InformationRetrievalEvaluator: MRR@5, Hit@1, NDCG@5]
    H -->|Early Stopping patience=2| I[ateneo-bge-m3-ecuador-v2/]
```

### 2.1 Pérdida Contrastiva Multiple Negatives Ranking Loss (MNRL)
Se optimiza la probabilidad condicional de recuperar el fragmento normativo correcto $p_i$ frente al conjunto compuesto por el *Hard Negative* explícito $n_i$ y los fragmentos positivos de los otros $B - 1$ ejemplos del lote (*in-batch negatives*):

$$\mathcal{L} = -\sum_{i=1}^B \log \frac{e^{\text{sim}(q_i, p_i) / \tau}}{e^{\text{sim}(q_i, p_i) / \tau} + e^{\text{sim}(q_i, n_i) / \tau} + \sum_{j \neq i}^B e^{\text{sim}(q_i, p_j) / \tau}}$$

Donde:
* $B = 32$: Batch size efectivo.
* $\text{sim}(u, v) = \frac{u \cdot v}{\|u\|_2 \|v\|_2}$: Similitud coseno en espacio latente normalizado en $L_2$.
* $\tau = 0.02$: Temperatura estricta ($\text{Scale} = \frac{1}{\tau} = 50.0$), que amplifica la pendiente del gradiente ante discrepancias angulares sutiles.
* En cada paso de optimización, el modelo discrimina la respuesta correcta frente a **32 distractores simultáneos**.

---

## 3. Sizing de Memoria en la GPU NVIDIA A100 (40 GB VRAM)

| Componente de Memoria | Estimación en BF16 | Justificación Técnica |
| :--- | :---: | :--- |
| **Pesos del Modelo BGE-M3** | ~1.14 GB | 568 millones de parámetros en formato 16-bit (`bfloat16`). |
| **Gradientes y Estados AdamW** | ~4.56 GB | Estados de primer y segundo momento ($m_t, v_t$) del optimizador AdamW. |
| **Activaciones de Contexto (512 tokens $\times$ 32)** | ~10.80 GB | Mapas de atención cruzada de 24 capas en el pase hacia adelante. |
| **Consumo Pico Estimado de VRAM** | **~16.50 GB** | **41.2% de la capacidad de la A100 (40 GB)**. |
| **Margen de Seguridad contra OOM** | **~23.50 GB (58.8%)** | Permite operar con `gradient_accumulation_steps = 1` sin desbordamiento. |

---

## 4. Matriz de Hiperparámetros Calibrados

| Hiperparámetro | Valor Calibrado | Racionalidad Científica |
| :--- | :---: | :--- |
| **Modelo Pre-entrenado** | `BAAI/bge-m3` | Pesos oficiales limpios (sin sesgo del pipeline v1 anterior). |
| **Longitud Máxima de Secuencia** | 512 tokens | Cobertura del percentil 95 del corpus fragmentado en la Fase 3. |
| **Batch Size Efectivo** | 32 tripletas | Provee 31 in-batch negatives por paso de entrenamiento. |
| **Tasa de Aprendizaje ($\eta$)** | $2 \times 10^{-5}$ | Rango estándar para ajuste fino sin destrucción de representaciones pre-entrenadas. |
| **Optimizador** | AdamW (`optim="adamw_torch"`) | $\beta_1 = 0.9, \beta_2 = 0.999$, Weight Decay = $0.01$. |
| **Warmup Ratio** | $10\%$ (0.10) | Prevención de gradientes inestables en las primeras iteraciones. |
| **Planificador de Tasa (Scheduler)** | `CosineAnnealingLR` | Descenso suave de la tasa de aprendizaje hacia cero. |
| **Número de Épocas** | 5 épocas | Suficiente para convergencia sobre 1,178 tripletas en batch 32 (~185 pasos totales). |
| **Estrategia de Evaluación** | `eval_strategy="epoch"` | Cálculo de Information Retrieval en cada época sobre `retrieval_val.json`. |
| **Métrica de Selección del Mejor Modelo** | `cosine_mrr@5` | Mean Reciprocal Rank en el Top-5 como criterio de early stopping. |

---

## 5. Implementación y Verificación Técnica

### 5.1 Script CLI (`06_train_bge_m3.py`)
* Incorpora `SentenceTransformerTrainer` con soporte nativo para `bfloat16`, `eval_strategy="epoch"` y guardado del mejor checkpoint (`load_best_model_at_end=True`).
* Detección automática de aceleración: conmuta a `bfloat16` en arquitecturas Ampere/Hopper (A100, H100), `fp16` en arquitecturas Turing/Ada (T4, RTX 3090/4090) o `fp32` en CPU.
* Modo `--dry-run`: verificado exitosamente en entorno local, completando 2 pasos de optimización con pérdida decreciente (de 4.404 a 3.045) y cálculo de métricas IR.

### 5.2 Notebook de Aceleración (`colab_fase6_train_bge_m3.ipynb`)
* Cuaderno estructurado y autocontenido listo para ser ejecutado en la NVIDIA A100.
* Monitorización en vivo de VRAM con `nvidia-smi`, entrenamiento acelerado en BF16 y empaquetado final comprimido en `ateneo-bge-m3-ecuador-v2.tar.gz`.

---

## 6. Procedimiento de Ejecución en la NVIDIA A100

### Opción A: Ejecución Directa en Servidor Local con A100
```bash
python backend/ingestion_v2/06_train_bge_m3.py --batch-size 32 --epochs 5 --bf16
```

### Opción B: Ejecución en Google Colab Pro / Modal con A100
1. Abrir `backend/ingestion_v2/colab_fase6_train_bge_m3.ipynb`.
2. Asignar entorno de ejecución con GPU NVIDIA A100.
3. Ejecutar las celdas secuencialmente; el entrenamiento concluye en ~10 a 15 minutos y genera el paquete final del modelo.
