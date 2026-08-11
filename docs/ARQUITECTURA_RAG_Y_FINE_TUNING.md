# Arquitectura RAG, Modelo Recuperador BAAI/bge-m3 y Metodología de Fine-Tuning Supervisado

## 1. Introducción y Marco de Arquitectura

El sistema **Ateneo** implementa una arquitectura de Recuperación Aumentada por Generación (RAG) en dos etapas para la evaluación formativa del razonamiento clínico. El objetivo principal es procesar las respuestas en texto libre de los estudiantes, recuperar el fragmento normativo exacto de las Guías de Práctica Clínica (GPC) del Ministerio de Salud Pública (MSP) del Ecuador y generar una evaluación cuantitativa y cualitativa estructurada mediante un Modelo de Lenguaje de Gran Escala (LLM).

```text
                                   ETAPA 1: RECUPERACIÓN DENSA
┌─────────────────────────┐     ┌───────────────────────────┐     ┌───────────────────────────┐
│ PDFs GPC (MSP Ecuador)  │ ──► │ Extracción & Segmentación │ ──► │ Embeddings BAAI/bge-m3    │
└─────────────────────────┘     └───────────────────────────┘     └─────────────┬─────────────┘
                                                                                │
                                                                                ▼
┌─────────────────────────┐     ┌───────────────────────────┐     ┌───────────────────────────┐
│ Respuesta Estudiante    │ ──► │ Query Búsqueda Coseno     │ ──► │ ChromaDB Vector Store     │
└─────────────────────────┘     └───────────────────────────┘     └─────────────┬─────────────┘
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
                                └─────────────┬─────────────┘
                                              │ (response_mime_type: application/json)
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

## 3. Uso y Fundamentación de la Arquitectura Transformer

La plataforma **Ateneo** utiliza la arquitectura **Transformer** (Vaswani et al., 2017) de forma dual en las dos etapas fundamentales del sistema:

### 3.1 Arquitectura Transformer en la Etapa de Recuperación (Encoder Transformer)
* **Backbone:** El modelo `BAAI/bge-m3` está construido sobre una arquitectura **Transformer Encoder Bidireccional** (variante avanzada de *XLM-RoBERTa*).
* **Mecanismo de Atención:** Utiliza capas de *Multi-Head Self-Attention* bidireccionales para procesar secuencias de hasta 8,192 tokens.
* **Proyección Densa:** Transforma las representaciones ocultas de las capas del Transformer en vectores densos de 1,024 dimensiones mediante alineación semántica por contraste.

### 3.2 Arquitectura Transformer en la Etapa de Evaluación (Multimodal Decoder Transformer)
* **Backbone:** El modelo de generación `Google Gemini` (`gemini-3.5-flash` / `gemini-2.5-flash`) se basa en una arquitectura **Transformer Multimodal Autorregresiva**.
* **Atención Multimodal:** Integra mecanismos de atención cruzada (*Cross-Attention*) para procesar simultáneamente datos de texto (prompt + pasajes normativos) e imágenes médicas (radiografías, ECG, hemogramas).

---

## 4. Especificación del Modelo Recuperador Denso

### 4.1 Modelo Base: `BAAI/bge-m3`
* **Nombre de Repositorio HuggingFace:** `BAAI/bge-m3`.
* **Número de Parámetros:** ~560 millones.
* **Dimensión de Proyección Densa:** 1,024 dimensiones.
* **Límite Contextual:** 8,192 tokens.
* **Métrica de Distancia en Espacio Vectorial:** Distancia Coseno ($d_{\text{cos}}(u, v) = 1 - \frac{u \cdot v}{\|u\| \|v\|}$).

### 4.2 Selección del Modelo Local vs Fine-Tuned (`config.py`)
El módulo [config.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/config.py#L16-L20) verifica dinámicamente la presencia de la carpeta compilada de pesos:
```python
FINE_TUNED_PATH = BASE_DIR / "data" / "ateneo-bge-m3-ecuador"
if FINE_TUNED_PATH.exists() and (FINE_TUNED_PATH / "config.json").exists():
    EMBEDDING_MODEL_NAME = str(FINE_TUNED_PATH)
else:
    EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "BAAI/bge-m3")
```
Esto permite que el backend utilice de forma nativa los pesos optimizados sin modificar la lógica del recuperador.

---

## 3. Pipeline de Ingesta y Segmentación Contextual

### 3.1 Extracción de Texto por Páginas (`ingestion/pdf_extractor.py`)
El extractor utiliza `pypdf.PdfReader` procesando documento a documento. Preserva el número de página original ($1, 2, \dots, N$) y elimina espacios en blanco redundantes:
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

### 3.2 Chunking Sensible a Secciones (`ingestion/chunker.py`)
El segmentador agrupa párrafos de texto hasta un tamaño máximo de 1,000 caracteres por fragmento (`max_chunk_size = 1000`). Utiliza expresiones regulares para identificar encabezados de capítulos y secciones oficiales del MSP:
* Patrones de títulos: `^\d+(\.\d+)*\s+[A-ZÁÉÍÓÚÑ]`, texto totalmente en mayúsculas, o palabras clave (`RECOMENDACIÓN`, `TRATAMIENTO`, `DIAGNÓSTICO`, `MANEJO`, `CRITERIOS`).
* Asignación de Metadatos: Cada chunk producido contiene los campos: `chunk_id`, `texto`, `guia_fuente`, `pagina`, y `seccion`.

### 3.3 Recreación de Colección por Cambio de Dimensión (`ingestion/vectorize.py`)
Para prevenir errores de dimensión en ChromaDB cuando se migra entre modelos de embeddings de 768 a 1,024 dimensiones, `vectorize.py` inspecciona los vectores existentes y recrea la colección `gpc_msp` si detecta incompatibilidad:
```python
existing = client.get_collection(name="gpc_msp")
if existing.count() > 0:
    sample = existing.get(limit=1, include=["embeddings"])
    if sample.get("embeddings") and len(sample["embeddings"][0]) != 1024:
        client.delete_collection(name="gpc_msp")
```

---

## 4. Metodología de Fine-Tuning Supervisado por Tripletas

### 4.1 Generación del Dataset (`ingestion/create_ft_dataset.py`)
El script genera 480 tripletas clínicas compuestas por:
1. **Query ($q$):** Planteamiento o pregunta del caso clínico.
2. **Pasaje Positivo ($p^+$):** Fragmento normativo correcto extraído de la GPC asociada.
3. **Pasaje Negativo ($p^-$):** Fragmento de otra GPC no relacionada (ej. Anexo de gases umbilicales vs Caso de Dengue).

### 4.2 Función de Pérdida *Multiple Negatives Ranking Loss* (MNRL)
Se aplica la función de pérdida por contraste MNRL mediante `sentence-transformers`:

$$\mathcal{L}_{\text{MNRL}} = -\frac{1}{B} \sum_{i=1}^{B} \log \frac{\exp\left(\text{sim}(q_i, p_i^+)/\tau\right)}{\exp\left(\text{sim}(q_i, p_i^+)/\tau\right) + \exp\left(\text{sim}(q_i, p_i^-)/\tau\right) + \sum_{j \neq i} \exp\left(\text{sim}(q_i, p_j^+)/\tau\right)}$$

Donde $B$ es el tamaño del lote (*batch size*), $\text{sim}(u, v)$ es el producto punto normalizado (similitud coseno) y $\tau$ es la temperatura de escalado.

### 4.3 Ajuste de Hiperparámetros por Restricción VRAM
* **Problema:** En GPUs con VRAM $\le 6\text{ GB}$, el entrenamiento en FP32 a 1024 tokens produce colapso por `CUDA Out of Memory`.
* **Solución Aplicada:**
  - `max_seq_length = 512` (Cubre el 100% de la longitud de los chunks de 1,000 caracteres).
  - `batch_size = 2` (Mantiene 6 secuencias activas en backpropagation).
  - `use_amp = True` (Precisión Mixta FP16 en Tensor Cores).
  - Consumo final de VRAM en Colab GPU T4: **~5.5 GB VRAM** (completamente estable en 15.3 GB VRAM).

---

## 5. Evaluador LLM Multimodal y Parser de JSON Robusto

### 5.1 Solicitud Formateada a la API de Gemini (`rag/evaluator.py`)
El evaluador utiliza el SDK oficial `google-genai` configurando `response_mime_type="application/json"` y `temperature=0.2`:
```python
config = types.GenerateContentConfig(
    system_instruction=SYSTEM_INSTRUCTION,
    response_mime_type="application/json",
    temperature=0.2
)
```
Si se envían bytes de imagen (`imagen_bytes`), se construye una lista de partes `[imagen_part, prompt]` permitiendo análisis multimodal de radiografías, hemogramas y ECGs.

### 5.2 Algoritmo de Reparación de JSON Truncado (`_repair_truncated_json`)
Cuando la salida del modelo de lenguaje es cortada por el límite de tokens, el backend aplica reparación heurística antes del parseo Pydantic:
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

### 5.3 Normalizadores Pydantic (`models/schemas.py`)
El objeto `EvaluationResult` valida y normaliza los campos recibidos:
* `CompetenciaDeficiente`: Normaliza cadenas de texto en los 4 ejes clínicos estandarizados (`diagnóstico`, `tratamiento`, `prevención`, `seguimiento`) utilizando coincidencia difusa de palabras clave (`normalize_eje`).
* `CitaNormativa`: Normaliza estructuras de texto plano o diccionarios irregulares devueltos por el LLM.
