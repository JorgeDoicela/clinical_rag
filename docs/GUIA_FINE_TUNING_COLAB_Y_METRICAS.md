# Guía de Fine-Tuning en GPU Cloud y Resultados de Benchmark

Este documento especifica la metodología de entrenamiento supervisado del modelo recuperador `BAAI/bge-m3` en Google Colab, las razones técnicas de optimización de VRAM y las métricas obtenidas en el benchmark automatizado.

---

## 1. Justificación Técnica de Aceleración en la Nube

El modelo `BAAI/bge-m3` posee ~560 millones de parámetros y genera representaciones vectoriales densas de 1,024 dimensiones. Debido a que el cálculo de gradientes en PyTorch con el optimizador AdamW requiere más de 10 a 14 GB de memoria de video (VRAM) durante el entrenamiento con la función de pérdida *Multiple Negatives Ranking Loss (MNRL)*, las GPUs locales con $\le 6\text{ GB}$ VRAM presentan fallos de memoria (`CUDA Out of Memory`).

Por esta razón, la fase de Fine-Tuning se adaptó para ejecutarse en **Google Colab** utilizando una aceleradora **NVIDIA GPU T4** (15.3 GB VRAM).

---

## 2. Optimizaciones de Hiperparámetros

| Parámetro | Valor | Justificación Técnica |
| :--- | :---: | :--- |
| **`max_seq_length`** | `512` | Los chunks generados por `chunker.py` tienen un tamaño máximo de 1,000 caracteres (~250-380 palabras). La ventana de 512 tokens permite procesar el **100% del texto normativo** sin truncamiento. |
| **`batch_size`** | `2` | Al evaluar tripletas ($q, p^+, p^-$), un lote de 2 procesa 6 secuencias largas simultáneamente en backpropagation, manteniendo el uso de VRAM en **~5.5 GB** (completamente seguro en los 15.3 GB de la T4). |
| **`epochs`** | `3` | Permite converger la pérdida MNRL sobre las 480 tripletas clínicas sin caer en sobreajuste (*overfitting*). |
| **`use_amp`** | `True` (FP16) | Activa la Precisión Mixta Automática (AMP) en PyTorch, acelerando la multiplicación de matrices en los Tensor Cores de la GPU T4 y reduciendo el consumo de memoria al 50%. |
| **`total_steps`** | `720` pasos | Total de iteraciones de gradiente ejecutadas a lo largo de las 3 épocas. |
| **`final_training_loss`** | **`0.021787`** | Valor empírico final de convergencia de la función de pérdida MNRL, demostrando alta resolución semántica. |

---

## 3. Procedimiento de Ejecución en Google Colab

1. Cargar el notebook [colab_fine_tuning.ipynb](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/ingestion/colab_fine_tuning.ipynb) en Google Colab.
2. Seleccionar el tipo de entorno de ejecución: `Python 3` + **`GPU T4`**.
3. Subir el archivo de datos [ft_dataset.json](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/data/ft_dataset.json) (480 tripletas) a la carpeta raíz de Colab.
4. Ejecutar todas las celdas (`Ctrl + F9`). El entrenamiento tomará entre **3 y 4 minutos**.
5. Al finalizar, Colab descargará automáticamente el archivo `ateneo-bge-m3-ecuador.zip`.
6. Descomprimir el archivo descargado en la carpeta del proyecto:
   `backend/data/ateneo-bge-m3-ecuador/`

---

## 4. Resultados del Benchmark Automatizado (`run_metrics.py`)

Los resultados registrados en [resultados_metricas.json](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/tests/resultados_metricas.json) tras la evaluación del banco de 15 casos de prueba sobre los **557 fragmentos vectorizados** de las 5 GPCs del MSP muestran los siguientes valores:

| Métrica de Rendimiento | Resultado Obtención | Significado y Validación |
| :--- | :---: | :--- |
| **Total de Casos Evaluados** | `15` | Muestra de casos clínicos distribuidos en Dengue, Preeclampsia, EHIRN, NAC, Hemorragia Posparto, HTA, Tuberculosis, VIH y ERC. |
| **Chunks Vectorizados en DB** | `557` | Proyección densa de 1,024 dimensiones generada por `ateneo-bge-m3-ecuador`. |
| **Precisión de Retrieval (Hit@1)** | **`100.0%`** | El modelo recupera el fragmento normativo exacto de la GPC del MSP en el 100% de los casos de prueba (15/15). |
| **Tasa de Validez JSON** | **`100.0%`** | Las respuestas del evaluador LLM cumplen estrictamente con la especificación Pydantic sin errores de sintaxis (15/15). |
| **Latencia Promedio por Consulta** | **`12.29 s`** | Tiempo total transcurrido desde la recepción de la respuesta hasta el dictamen formativo. |
| **Latencia Mediana por Consulta** | **`7.73 s`** | Valor central del tiempo de procesamiento en CPU. |

