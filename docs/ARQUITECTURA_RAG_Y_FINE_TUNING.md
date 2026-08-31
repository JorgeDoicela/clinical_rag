# Arquitectura RAG Híbrida (BGE-M3 + BM25 + RRF), Tablas Markdown y Fine-Tuning Supervisado

## 1. Introducción y Marco Metodológico de Arquitectura

El sistema **Ateneo** implementa una arquitectura de Recuperación Aumentada por Generación (RAG) Híbrida de Estado del Arte acoplada a un modelo recuperador supervisado mediante Fine-Tuning y un modelo de lenguaje multimodal estructurado. Su objetivo es evaluar formativa y cuantitativamente el razonamiento clínico (diagnóstico, terapéutico, preventivo y de seguimiento) contrastándolo estrictamente contra el cuerpo de las Guías de Práctica Clínica (GPC) oficiales del Ministerio de Salud Pública (MSP) del Ecuador.

```text
                               ETAPA 1: RECUPERACIÓN HÍBRIDA RRF (BGE-M3 + BM25)
┌─────────────────────────┐     ┌───────────────────────────┐     ┌───────────────────────────┐
│ 60 GPC (MSP Ecuador)    │ ──► │ Extracción & Tablas MD    │ ──► │ Embeddings Densos BGE-M3  │
│ (2013-2019 / raw_pdfs)  │     │ (pdfplumber + chunker)    │     │ (1024 dims - Fine-Tuned)  │
└─────────────────────────┘     └───────────────────────────┘     └─────────────┬─────────────┘
                                                                                │
                                                                                ▼
┌─────────────────────────┐     ┌───────────────────────────┐     ┌───────────────────────────┐
│ Respuesta Estudiante    │ ──► │ Consulta Híbrida (RRF)    │ ──► │ ChromaDB + Sparse BM25    │
└─────────────────────────┘     │ Rank Fusion: k=60         │     │ (colección gpc_msp)       │
                                └───────────────────────────┘     └─────────────┬─────────────┘
                                                                                │
                                                                                ▼
                               ETAPA 2: EVALUACIÓN MULTIMODAL │ Fragmento Normativo Top-1 RRF
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
                                │ Validador Pydantic        │
                                │ + Visor PDF Interactivo   │
                                └───────────────────────────┘
```

---

## 2. Motor de Búsqueda Híbrida y Reciprocal Rank Fusion (RRF) ([../backend/rag/retriever.py](../backend/rag/retriever.py))

Para superar las limitaciones del suavizado semántico en términos médicos exactos (fármacos, dosis como *"500 mg"* o acrónimos como *"CURB-65"*), Ateneo implementa **Reciprocal Rank Fusion**:

### 2.1 Búsqueda Densa (Dense Vector Search)
* **Backbone:** Transformer bidireccional `BAAI/bge-m3` (1,024 dimensiones) con métrica de distancia coseno.
* **Proyección:** Captura la intención médica general y similitud conceptual en lenguaje natural.

### 2.2 Búsqueda Léxica Dispersa (Sparse BM25 Search)
* **Algoritmo:** `BM25Okapi` con tokenización sensible a terminología médica en minúsculas.
* **Función:** Recupera de forma determinista coincidencias exactas de fármacos, criterios de riesgo y dosis numéricas.

### 2.3 Algoritmo de Fusión RRF ($k=60$)
Para cada documento candidato $d$ presente en los resultados densos o léxicos:
$$\text{RRF\_Score}(d) = \frac{1}{60 + \text{rank}_{\text{dense}}(d)} + \frac{1}{60 + \text{rank}_{\text{bm25}}(d)}$$

Los fragmentos se ordenan de forma descendente según su $\text{RRF\_Score}$, garantizando que el documento Top-1 posea tanto relevancia semántica contextual como precisión léxica exacta.

---

## 3. Extracción Estructurada de Tablas Clínicas en Markdown ([../backend/ingestion/pdf_advanced_parser.py](../backend/ingestion/pdf_advanced_parser.py))

Para preservar el 100% de la información contenida en matrices de dosis, esquemas terapéuticos y clasificaciones de severidad, el parser avanzado utiliza **`pdfplumber`**:

1. **Detección Matricial de Celdas:** Extrae las tablas de cada página y las formatea automáticamente a sintaxis Markdown:
   ```markdown
   | Parámetro Clínico | Criterio de Riesgo | Conducta MSP |
   | --- | --- | --- |
   | Presión Arterial | >= 160/110 mmHg | Sulfato de Magnesio IV |
   ```
2. **Detección Automática de Año de Edición:** Extrae el año de publicación desde la carpeta contenedora (`raw_pdfs/2019/`, `raw_pdfs/2013/`) o desde el texto oficial, persistiendo el metadato `ano_publicacion` en ChromaDB.

---

## 4. Metodología de Fine-Tuning Supervisado (MNRL)

### 4.1 Función de Pérdida Multiple Negatives Ranking Loss (MNRL)
El modelo `ateneo-bge-m3-ecuador` se ajusta mediante la pérdida de contraste:
$$\mathcal{L}_{\text{MNRL}} = -\log \frac{e^{\text{sim}(q_i, p_i^+) / \tau}}{\sum_{j=1}^{B} e^{\text{sim}(q_i, p_j^+) / \tau} + \sum_{k=1}^{B} e^{\text{sim}(q_i, n_k^-) / \tau}}$$

Donde:
* $q_i$: Consulta o caso clínico.
* $p_i^+$: Fragmento normativo positivo de la GPC del MSP.
* $n_k^-$: Negativo difícil (*Hard Negative*) de la misma especialidad o con alta similitud léxica.
* $\tau$: Temperatura de escala.

---

## 5. Integración con Visor Interactivo en Frontend ([../frontend/src/components/PdfViewerModal.jsx](../frontend/src/components/PdfViewerModal.jsx))

Cada cita normativa generada por el evaluador se vincula al endpoint `/api/cases/pdf-location/{guia_id}`. El frontend en React permite abrir el visor de PDF oficial con salto directo `#page={pagina}`, permitiendo la auditoría instantánea de la fuente oficial en vivo durante congresos o sesiones docentes.
