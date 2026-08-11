# Guía de Fine-Tuning en GPU Cloud y Resultados del Benchmark Cuantitativo

Este documento especifica la metodología de entrenamiento supervisado del modelo recuperador denso `BAAI/bge-m3` en la infraestructura en la nube de Google Colab, las razones técnicas de optimización de memoria VRAM y los resultados del benchmark automatizado de evaluación de rendimiento.

---

## 1. Justificación Técnica de Aceleración en GPU Cloud

El modelo recuperador `BAAI/bge-m3` cuenta con ~560 millones de parámetros y proyecta secuencias de texto en un espacio latente denso de 1,024 dimensiones. 

Durante el entrenamiento supervisado con la función de pérdida *Multiple Negatives Ranking Loss (MNRL)*, el cálculo de gradientes y la actualización de estados del optimizador AdamW procesan tripletas de secuencias compuestas por la consulta del caso clínico ($q$), el fragmento positivo normativo ($p^+$) y el fragmento negativo de distracción ($p^-$). 

El procesamiento simultáneo de estas 3 secuencias en llamadas hacia atrás (*backpropagation*) requiere más de **10 a 14 GB de memoria de video (VRAM)** en precisión FP32. Por esta razón, las tarjetas gráficas locales de $\le 6\text{ GB}$ VRAM presentan desbordamiento fatal de memoria (`CUDA Out of Memory`).

Para garantizar la estabilidad del entrenamiento, la fase de Fine-Tuning se adaptó para ejecutarse en **Google Colab** utilizando una aceleradora **NVIDIA GPU T4** (15.3 GB VRAM).

---

## 2. Optimizaciones de Hiperparámetros y Restricciones VRAM

| Parámetro | Valor | Justificación Técnica y Demostración de Memoria |
| :--- | :---: | :--- |
| **`max_seq_length`** | `512` | Los fragmentos generados por `chunker.py` tienen un límite máximo de 1,000 caracteres (~250-380 palabras). La ventana de 512 tokens procesa el **100% del contenido semántico** de cada chunk sin truncamiento. |
| **`batch_size`** | `2` | Al evaluar tripletas ($q, p^+, p^-$), un tamaño de lote de 2 procesa 6 secuencias largas en paralelo por iteración de gradiente, manteniendo la huella de memoria VRAM en **~5.5 GB** (completamente seguro dentro del límite de 15.3 GB de la GPU T4). |
| **`epochs`** | `3` | Tres épocas completas permiten alcanzar la convergencia de la función de pérdida MNRL sobre las 480 tripletas clínicas sin causar sobreajuste (*overfitting*). |
| **`use_amp`** | `True` (FP16) | Activa la Precisión Mixta Automática (AMP) de PyTorch, acelerando la multiplicación de matrices en los Tensor Cores de la GPU T4 y reduciendo el consumo de memoria en un 50%. |
| **`total_steps`** | `720` pasos | Total de iteraciones de gradiente ejecutadas durante las 3 épocas de entrenamiento. |
| **`final_training_loss`** | **`0.021787`** | Valor empírico final de convergencia de la pérdida MNRL, demostrando alta resolución semántica en la separación espacio-vectorial. |

---

## 3. Procedimiento de Ejecución en Google Colab

1. Cargar el notebook [colab_fine_tuning.ipynb](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/ingestion/colab_fine_tuning.ipynb) en Google Colab.
2. Seleccionar el tipo de entorno de ejecución: `Python 3` + **`GPU T4`**.
3. Subir el archivo de datos [ft_dataset.json](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/data/ft_dataset.json) (480 tripletas clínicas) al directorio raíz del entorno de Colab.
4. Ejecutar la secuencia completa de celdas (`Ctrl + F9`). El tiempo estimado de entrenamiento es de **3 a 4 minutos**.
5. Al finalizar el entrenamiento, el notebook empaqueta y descarga automáticamente el archivo comprimido `ateneo-bge-m3-ecuador.zip`.
6. Descomprimir el archivo descargado en la ruta local del proyecto:
   `backend/data/ateneo-bge-m3-ecuador/`

---

## 4. Script de Entrenamiento Local y Multihilo ([backend/ingestion/train_fine_tuning.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/ingestion/train_fine_tuning.py))

Para ejecutar el entrenamiento de forma nativa en una estación de trabajo con GPU dedicada local:
```python
from sentence_transformers import SentenceTransformer, InputExample, losses
from torch.utils.data import DataLoader

# Cargar dataset de tripletas
with open("./data/ft_dataset.json", "r", encoding="utf-8") as f:
    triplets_data = json.load(f)

train_examples = [InputExample(texts=[item["query"], item["pos"], item["neg"]]) for item in triplets_data]
train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=2)

model = SentenceTransformer("BAAI/bge-m3", device="cuda" if torch.cuda.is_available() else "cpu")
model.max_seq_length = 512

train_loss = losses.MultipleNegativesRankingLoss(model)

model.fit(
    train_objectives=[(train_dataloader, train_loss)],
    epochs=3,
    warmup_steps=int(len(train_dataloader) * 0.1),
    output_path="./data/ateneo-bge-m3-ecuador",
    use_amp=torch.cuda.is_available()
)
```

---

## 5. Resultados Experimentales del Benchmark Automatizado

El rendimiento del sistema fue evaluado mediante la suite de pruebas [run_metrics.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/tests/run_metrics.py) sobre un banco de 15 casos de prueba anotados contrastados contra los **557 fragmentos vectorizados** de las GPC del MSP. Los resultados registrados en [resultados_metricas.json](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/tests/resultados_metricas.json) son los siguientes:

| Métrica de Rendimiento | Valor Obtenido | Método de Medición y Significado Clínico |
| :--- | :---: | :--- |
| **Total de Casos Evaluados** | `15` | Muestra de casos clínicos distribuidos en Dengue, Preeclampsia, EHIRN, NAC, Hemorragia Posparto, HTA, Tuberculosis, VIH y ERC. |
| **Chunks Vectorizados en DB** | `557` | Proyección denso-vectorial de 1,024 dimensiones generada por `ateneo-bge-m3-ecuador`. |
| **Precisión de Recuperación (Hit@1)** | **`100.0%`** | El modelo recupera el fragmento normativo exacto (`chunk_id`) de la GPC del MSP en el 100% de los casos de prueba (15/15). |
| **Tasa de Validez JSON** | **`100.0%`** | Las respuestas del evaluador LLM cumplen estrictamente con el esquema Pydantic sin errores de sintaxis o formato (15/15). |
| **Latencia Promedio por Consulta** | **`12.29 s`** | Tiempo total transcurrido desde la recepción de la solicitud hasta la generación del dictamen formativo estructurado. |
| **Latencia Mediana por Consulta** | **`7.73 s`** | Percentil 50 de tiempo de respuesta registrado en ejecución sobre CPU. |

---

## 6. Salida Estructurada de Resultados Benchmark

```json
{
  "total_casos": 15,
  "precision_retrieval_porcentaje": 100.0,
  "tasa_exito_json_porcentaje": 100.0,
  "latencia_promedio_segundos": 12.29,
  "latencia_mediana_segundos": 7.73
}
```
