# Arquitectura RAG, Modelo Recuperador BAAI/bge-m3 y Metodología de Fine-Tuning Supervisado

## 1. Introducción y Marco Metodológico de Arquitectura

El sistema **Ateneo** implementa una arquitectura de Recuperación Aumentada por Generación (RAG) en dos etapas acoplada a un modelo recuperador supervisado mediante Fine-Tuning. El propósito fundamental es evaluar de manera automatizada, cuantitativa y cualitativa el razonamiento clínico (diagnóstico, terapéutico, preventivo y de seguimiento) formulado en texto libre por estudiantes de ciencias de la salud, contrastándolo estrictamente contra las Guías de Práctica Clínica (GPC) oficiales del Ministerio de Salud Pública (MSP) del Ecuador.

```text
                                   ETAPA 1: RECUPERACIÓN DENSA VECTORIAL
┌─────────────────────────┐     ┌───────────────────────────┐     ┌───────────────────────────┐
│ PDFs GPC (MSP Ecuador)  │ ──► │ Extracción & Segmentación │ ──► │ Embeddings BAAI/bge-m3    │
└─────────────────────────┘     │ (pdf_extractor + chunker) │     │ (1024 dims - Fine-Tuned)  │
                                └───────────────────────────┘     └─────────────┬─────────────┘
                                                                                │
                                                                                ▼
┌─────────────────────────┐     ┌───────────────────────────┐     ┌───────────────────────────┐
│ Respuesta Estudiante    │ ──► │ Query Búsqueda Coseno     │ ──► │ ChromaDB Vector Store     │
└─────────────────────────┘     └───────────────────────────┘     │ (colección gpc_msp)       │
                                                                  └─────────────┬─────────────┘
                                                                                │
                                                                                ▼
                                   ETAPA 2: GENERACIÓN MULTIMODAL │ Fragmento Normativo Top-1
                                                                                │
┌─────────────────────────┐     ┌───────────────────────────┐                   │
│ Imagen Clínica (Op)     │ ──► │ Prompt Builder Multimodal │ ◄─────────────────┘
└─────────────────────────┘     └─────────────┬─────────────┘
                                              │
                                              ▼
                                ┌───────────────────────────┐
                                │ Evaluador Gemini API      │
                                │ (response_mime_type: JSON)│
                                └─────────────┬─────────────┘
                                              │
                                              ▼
                                ┌───────────────────────────┐
                                │ Repara JSON & Pydantic    │
                                └─────────────┬─────────────┘
                                              │
                                              ▼
                                ┌───────────────────────────┐
                                │ Persistencia SQL History  │
                                └───────────────────────────┘
```

---

## 2. Fundamentación de la Arquitectura Transformer

La plataforma **Ateneo** aprovecha la arquitectura **Transformer** ([Vaswani et al., 2017](https://arxiv.org/abs/1706.03762)) en sus dos familias principales:

### 2.1 Encoder Transformer (Etapa de Recuperación Densa)
* **Backbone:** El modelo recuperador `BAAI/bge-m3` se basa en un **Transformer Encoder Bidireccional** (variante avanzada basada en *XLM-RoBERTa*).
* **Mecanismo de Atención:** Utiliza capas de *Self-Attention* bidireccionales donde cada token atiende a todos los demás tokens en secuencias de hasta **8,192 tokens**.
* **Formulación de la Atención Bidireccional:**
  $$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$
  Donde las matrices de Query ($Q$), Key ($K$) y Value ($V$) se derivan de las proyecciones lineales de las representaciones de entrada, permitiendo construir un espacio latente contextualizado denso de **1,024 dimensiones**.

### 2.2 Decoder Transformer Multimodal (Etapa de Generación y Evaluación)
* **Backbone:** El modelo evaluador `Google Gemini` (`gemini-3.5-flash` / `gemini-2.5-flash`) utiliza una arquitectura **Transformer Multimodal Autorregresiva**.
* **Atención Multimodal (Cross-Attention):** Integra mecanismos de atención cruzada para procesar vectores de características provenientes de imágenes médicas (radiografías, hemogramas, ECGs) codificados por vision encoders de forma simultánea con la secuencia de texto del prompt.

---

## 3. Especificación del Modelo Recuperador Denso

### 3.1 Especificaciones Técnicas de `BAAI/bge-m3`
* **Identificador HuggingFace:** `BAAI/bge-m3`
* **Parámetros Totales:** ~560 millones de parámetros.
* **Dimensión del Vector Denso ($d$):** $1024$ dimensiones.
* **Límite de Longitud Contextual:** $8192$ tokens.
* **Métrica de Distancia en Espacio Vectorial:** Distancia Coseno $d_{\text{cos}}(u, v)$:
  $$d_{\text{cos}}(u, v) = 1 - \frac{u \cdot v}{\|u\|_2 \|v\|_2} = 1 - \frac{\sum_{i=1}^{d} u_i v_i}{\sqrt{\sum_{i=1}^{d} u_i^2} \sqrt{\sum_{i=1}^{d} v_i^2}}$$

### 3.2 Resolución Dinámica del Modelo ([backend/config.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/config.py#L16-L20))
El módulo [config.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/config.py) verifica en tiempo de ejecución la presencia del directorio compilado con los pesos Fine-Tuned:
```python
FINE_TUNED_PATH = BASE_DIR / "data" / "ateneo-bge-m3-ecuador"
if FINE_TUNED_PATH.exists() and (FINE_TUNED_PATH / "config.json").exists():
    EMBEDDING_MODEL_NAME = str(FINE_TUNED_PATH)
else:
    EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "BAAI/bge-m3")
```

---

## 4. Pipeline de Ingesta y Segmentación Contextual

### 4.1 Extracción de Texto por Páginas ([backend/ingestion/pdf_extractor.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/ingestion/pdf_extractor.py#L5-L22))
El extractor utiliza `pypdf.PdfReader` para iterar página por página sobre cada documento PDF en `backend/data/raw_pdfs/`. Conserva el número de página físico ($1, 2, \dots, N$) y elimina espacios en blanco redundantes:
```python
def extract_text_by_page(pdf_path: Path) -> List[Dict[str, Any]]:
    reader = pypdf.PdfReader(pdf_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = (page.extract_text() or "").strip()
        if text:
            pages.append({"pagina": i + 1, "texto": text})
    return pages
```

### 4.2 Segmentación Sensible a Secciones ([backend/ingestion/chunker.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/ingestion/chunker.py#L4-L50))
El algoritmo de chunking agrupa párrafos hasta alcanzar un tamaño máximo de 1,000 caracteres (`max_chunk_size = 1000`). Emplea expresiones regulares heurísticas para identificar títulos de capítulo o directivas oficiales del MSP:
* **Patrones de Detección:** `^\d+(\.\d+)*\s+[A-ZÁÉÍÓÚÑ]`, cadenas de texto completamente en mayúsculas, o expresiones clave como `RECOMENDACIÓN`, `TRATAMIENTO`, `DIAGNÓSTICO`, `MANEJO`, `CRITERIOS` con longitud $< 120$ caracteres.
* **Metadatos Asociados a Cada Chunk:** `chunk_id`, `texto`, `guia_fuente`, `pagina`, y `seccion`.

### 4.3 Recreación de Colección por Cambio de Dimensión ([backend/ingestion/vectorize.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/ingestion/vectorize.py#L20-L29))
Para evitar discrepancias de dimensión en ChromaDB cuando se conmuta entre modelos base de 768 dimensiones y modelos ajustados de 1,024 dimensiones, [vectorize.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/ingestion/vectorize.py) elimina y recrea la colección `gpc_msp` configurando la métrica de espacio HNSW:
```python
collection = client.get_or_create_collection(
    name="gpc_msp",
    metadata={"hnsw:space": "cosine"}
)
```

---

## 5. Metodología de Fine-Tuning Supervisado por Tripletas

### 5.1 Generación del Dataset ([backend/ingestion/create_ft_dataset.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/ingestion/create_ft_dataset.py#L24-L123))
Se construyen **480 tripletas clínicas** estructuradas en el formato:
1. **Query ($q_i$):** Pregunta o planteamiento del caso clínico simulado.
2. **Pasaje Positivo ($p_i^+$):** Fragmento normativo exacto de la GPC asociada.
3. **Pasaje Negativo ($p_i^-$):** Fragmento proveniente de una GPC distinta (ej. tratamiento de EHIRN vs. manejo de Dengue).

### 5.2 Formulación de la Función de Pérdida MNRL (*Multiple Negatives Ranking Loss*)
El entrenamiento optimiza los pesos del Transformer minimizando la función de pérdida por contraste MNRL sobre un lote de tamaño $B$:

$$\mathcal{L}_{\text{MNRL}} = -\frac{1}{B} \sum_{i=1}^{B} \log \frac{\exp\left(\frac{\text{sim}(q_i, p_i^+)}{\tau}\right)}{\exp\left(\frac{\text{sim}(q_i, p_i^+)}{\tau}\right) + \exp\left(\frac{\text{sim}(q_i, p_i^-)}{\tau}\right) + \sum_{j \neq i} \exp\left(\frac{\text{sim}(q_i, p_j^+)}{\tau}\right)}$$

Donde $\text{sim}(u, v) = \frac{u \cdot v}{\|u\|_2 \|v\|_2}$ es la similitud coseno y $\tau$ representa la temperatura de escalado semántico.

### 5.3 Optimización por Restricción de Memoria VRAM ([backend/ingestion/train_fine_tuning.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/ingestion/train_fine_tuning.py#L10-L79))
* **Desafío:** El entrenamiento en FP32 sobre secuencias largas colapsa la memoria VRAM en GPUs estándar ($\le 6\text{ GB}$).
* **Estrategia Aplicada:**
  - `max_seq_length = 512` (Garantiza cobertura del 100% de los chunks de 1,000 caracteres).
  - `batch_size = 2` (Procesa 6 secuencias activas por paso de backpropagation).
  - `use_amp = True` (Precisión Mixta FP16 activada en Tensor Cores).
  - **Consumo de VRAM Resultante:** **~5.5 GB VRAM** (estable dentro de los 15.3 GB de una GPU NVIDIA T4 en Google Colab).
  - **Convergencia Empírica Final:** $\mathcal{L}_{\text{MNRL}} = 0.021787$ a los 720 pasos de gradiente (3 épocas).

---

## 6. Evaluador LLM Multimodal y Algoritmos de Parsing Robusto

### 6.1 Solicitud Formateada a Gemini ([backend/rag/evaluator.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/rag/evaluator.py#L10-L115))
El módulo configura la API oficial `google-genai` imponiendo respuesta estructurada:
```python
config = types.GenerateContentConfig(
    system_instruction=SYSTEM_INSTRUCTION,
    response_mime_type="application/json",
    temperature=0.2
)
```
Si el usuario o el caso clínico adjunta bytes de una imagen diagnóstica (`imagen_bytes`), se envía una carga multimodal compuesta por `[imagen_part, prompt]`.

### 6.2 Algoritmo Heurístico de Reparación de JSON Truncado ([backend/rag/evaluator.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/rag/evaluator.py#L117-L132))
Si la respuesta del LLM es interrumpida por el límite de tokens de salida, el backend repara la sintaxis antes del parseo Pydantic mediante la función `_repair_truncated_json`:
```python
def _repair_truncated_json(text: str) -> str:
    if text.count('"') % 2 != 0:
        text += '"'
    open_brackets = text.count('[') - text.count(']')
    open_braces = text.count('{') - text.count('}')
    text += ']' * max(0, open_brackets)
    text += '}' * max(0, open_braces)
    return text
```

### 6.3 Normalizadores Defensivos Pydantic ([backend/models/schemas.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/models/schemas.py#L21-L36))
El modelo `EvaluationResult` valida y ajusta dinámicamente las inconsistencias del LLM:
* **`CompetenciaDeficiente.normalize_eje`:** Mapea variaciones ortográficas y sinónimos a uno de los 4 ejes clínicos estandarizados (`diagnóstico`, `tratamiento`, `prevención`, `seguimiento`) mediante coincidencia difusa de palabras clave.
* **`_normalize_cita_normativa`:** Convierte representaciones en texto plano o diccionarios irregulares devueltos por el modelo en la estructura tipada `CitaNormativa`.
