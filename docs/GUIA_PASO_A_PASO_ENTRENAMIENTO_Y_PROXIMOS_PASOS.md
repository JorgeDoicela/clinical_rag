# Manual Operativo: Entrenamiento en Google Colab (GPU A100) y Próximos Pasos

Esta guía detalla el procedimiento exacto paso a paso para que tú o cualquier investigador/desarrollador del equipo pueda entrenar el modelo denso, evaluar las métricas científicas, generar las tablas LaTeX para la publicación y clonar el sistema en cualquier entorno.

---

## 1. Estructura de los Datasets de Entrenamiento

Los datasets ubicados en [`backend/data/`](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/data) fueron generados y auditados matemáticamente con **Cero Fuga de Datos (*Document-Level Out-of-Distribution*)**:

| Archivo | Cantidad de Tripletas | % del Corpus | Rol en la Investigación |
| :--- | :---: | :---: | :--- |
| **`train_triplets.json`** | **1,918** | **70%** | Ajuste supervisado de los 560M parámetros con pérdida *Multiple Negatives Ranking Loss (MNRL)*. |
| **`val_triplets.json`** | **1,024** | **15%** | Evaluación periódica del ranking (`TripletEvaluator`) durante el entrenamiento para evitar sobreajuste. |
| **`test_triplets_blind.json`** | **694** | **15%** | Evaluación ciega sobre 10 Guías de Práctica Clínica jamás vistas durante el entrenamiento (*Out-of-Distribution*). |
| **`ft_dataset.json`** | **3,636** | **100%** | Dataset global consolidado de todas las tripletas generadas con *Hard Negatives*. |

### Estructura de cada Tripleta:
```json
{
  "id": "triplet_00078",
  "query": "¿Cuál es el esquema de tratamiento farmacológico normado por el MSP para fenilcetonuria?",
  "pos": "Diagnóstico y tratamiento nutricional del paciente pediátrico con fenilcetonuria...",
  "neg": "Diagnóstico, tratamiento y seguimiento del paciente con Enfermedad de Gaucher...",
  "guia_fuente": "2013_guia_de_fenilcetonuria",
  "seccion": "Tratamiento Farmacológico y Nutricional",
  "ano_publicacion": 2013,
  "especialidad": "Genética y Hematología",
  "tipo_negativo": "Hard Negative Intra-Especialidad"
}
```

---

## 2. Paso a Paso: Entrenamiento en Google Colab Pro (GPU NVIDIA A100)

### Paso 1: Abrir el Notebook en Google Colab
1. Ve a [Google Colab](https://colab.research.google.com/).
2. Haz clic en **Subir (Upload)** y selecciona el archivo [`backend/ingestion/colab_fine_tuning.ipynb`](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/ingestion/colab_fine_tuning.ipynb).

### Paso 2: Seleccionar la GPU A100
1. En el menú superior de Colab: **Entorno de ejecución > Cambiar tipo de entorno de ejecución**.
2. Selecciona **A100 GPU** (o en su defecto V100/T4 si estás en Colab estándar).
3. Haz clic en **Guardar**.

### Paso 3: Cargar los Datos
1. En el panel izquierdo de Colab, abre la pestaña de **Archivos** (icono de carpeta).
2. Arrastra y suelta los dos archivos desde tu computadora:
   * `backend/data/train_triplets.json`
   * `backend/data/val_triplets.json`

### Paso 4: Ejecutar el Entrenamiento
1. Presiona `Ctrl + F9` o ve a **Entorno de ejecución > Ejecutar todas**.
2. El script detectará la GPU A100, configurará el tamaño de lote grande ($B=32$) y la ventana de $1024$ tokens, y entrenará el modelo durante 3 épocas.
3. **Tiempo estimado:** ~8 a 10 minutos.

### Paso 5: Descargar los Artefactos Generados
Al finalizar la última celda, el notebook generará y descargará automáticamente:
1. **`ateneo-bge-m3-ecuador.zip`**: Archivo comprimido con los pesos del modelo optimizado.
2. **`grafico_convergencia_paper.png`**: Gráfico formal de pérdida y exactitud a **300 DPI**, listo para insertar en el artículo científico.

---

## 3. Despliegue del Modelo Entrenado en tu Computadora

1. Descomprime el archivo descargado `ateneo-bge-m3-ecuador.zip`.
2. Coloca la carpeta resultante en:
   `backend/data/ateneo-bge-m3-ecuador/`
3. ¡Listo! El sistema [config.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/config.py) detectará los nuevos pesos y conmutará automáticamente todas las búsquedas hacia el modelo afinado con las 46 Guías del MSP.

---

## 4. Próximos Pasos: Generar las Tablas LaTeX para el Paper Científico

Una vez desplegados los pesos, puedes ejecutar en tu terminal los dos generadores de resultados formales:

### Tabla I: Benchmark de Rendimiento IR (In vs Out of Distribution)
```powershell
cd backend
py tests/run_metrics.py
```
* **Qué hace:** Evalúa el sistema frente a 25 casos clínicos reales anotados, discriminando el rendimiento en guías de entrenamiento (*In-Distribution*) vs guías ciegas (*Out-of-Distribution*).
* **Salida:** Emite el código LaTeX listo para pegar en el paper con las métricas $\text{Hit@1}$, $\text{Hit@3}$, $\text{Hit@5}$, $\text{MRR@5}$, $\text{NDCG@5}$ y latencias $P_{50}/P_{95}$.

### Tabla II: Estudio de Ablación de Componentes
```powershell
cd backend
py tests/run_ablation_study.py
```
* **Qué hace:** Demuestra el impacto científico individual de cada componente (Búsqueda Léxica pura, Embeddings genéricos, Embeddings Fine-Tuned y Reranker Cross-Encoder).
* **Salida:** Emite el código LaTeX de la Tabla de Ablación para la sección de Resultados del artículo.

---

## 5. Cómo Clonar y Correr en Otra Máquina (en tu Casa)

En cualquier otra computadora con conexión a internet:

```bash
# 1. Clonar el repositorio completo (incluye los 46 PDFs y los datasets)
git clone https://github.com/JorgeDoicela/clinical_rag.git
cd clinical_rag

# 2. Configurar entorno del backend
cd backend
cp .env.example .env
# (Editas .env y colocas tu GEMINI_API_KEY)
pip install -r requirements.txt

# 3. Iniciar el Backend
uvicorn main:app --reload

# 4. En otra terminal, iniciar el Frontend
cd ../frontend
npm install
npm run dev
```
