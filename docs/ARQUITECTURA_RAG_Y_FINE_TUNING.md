# Arquitectura RAG Híbrida (BGE-M3 + BM25 + RRF), Tablas Markdown y Fine-Tuning Supervisado

## 1. Introducción y Marco Metodológico de Arquitectura

El sistema **Ateneo** implementa una arquitectura de Recuperación Aumentada por Generación (RAG) Híbrida de Estado del Arte acoplada a un modelo recuperador supervisado mediante Fine-Tuning y un modelo de lenguaje multimodal estructurado. Su objetivo es evaluar formativa y cuantitativamente el razonamiento clínico (diagnóstico, terapéutico, preventivo y de seguimiento) contrastándolo estrictamente contra el cuerpo de las Guías de Práctica Clínica (GPC) oficiales del Ministerio de Salud Pública (MSP) del Ecuador.

```text
                               ETAPA 1: RECUPERACIÓN HÍBRIDA RRF (BGE-M3 + BM25)
┌─────────────────────────┐     ┌───────────────────────────┐     ┌───────────────────────────┐
│ 45+ GPC (MSP Ecuador)   │ ──► │ Extracción & Tablas MD    │ ──► │ Embeddings Densos BGE-M3  │
│ (2013-2019 / raw_pdfs)  │     │ (pdfplumber + chunker)    │     │ (1024 dims - Fine-Tuned)  │
└─────────────────────────┘     └───────────────────────────┘     └─────────────┬─────────────┘
                                                                                │
                                                                                ▼
┌─────────────────────────┐     ┌───────────────────────────┐     ┌───────────────────────────┐
│ Razonamiento Estudiante │ ──► │ Consulta Híbrida (RRF)    │ ──► │ ChromaDB + Sparse BM25    │
│ (Texto o Voz es-EC)     │     │ Rank Fusion: k=60         │     │ (5,944 fragmentos normat.)│
└─────────────────────────┘     └───────────────────────────┘     └─────────────┬─────────────┘
                                                                                │
                                                                                ▼
                               ETAPA 2: FUSIÓN MULTIMODAL SIMULTÁNEA │ Fragmento Top-1 RRF
                                                                                │
┌─────────────────────────┐     ┌───────────────────────────┐                  │
│ ECG + Rx + Labs + Foto  │ ──► │ Prompt Builder Multimodal │ ◄────────────────┘
│ (N estudios simultáneos)│     │ (prompt_builder.py)        │
└─────────────────────────┘     └─────────────┬─────────────┘
                                              │ List[Part.from_bytes] + prompt
                                              ▼
                                ┌───────────────────────────┐
                                │ Evaluador Gemini API      │
                                │ (1 request multimodal)    │
                                │ response_mime_type: JSON  │
                                └─────────────┬─────────────┘
                                              │
                                              ▼
                                ┌───────────────────────────┐     ┌───────────────────────────┐
                                │ Validador Pydantic        │ ──► │ SQLite + PDF Institucional │
                                │ (EvaluationResult)        │     │ (ReportLab + SHA-256)     │
                                └─────────────┬─────────────┘     └───────────────────────────┘
                                              │
                                              ▼
                                ┌───────────────────────────┐
                                │ FeedbackCard + Radar      │
                                │ (4 ejes clínicos)         │
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

---

## 6. Motor de Simulación Dinámica por Fases Clínicas Secuenciales

Para superar las limitaciones del modelo estático de pregunta y respuesta única (*Single-Turn QA*), **Ateneo+** implementa un motor de simulación clínica interactivo estructurado en tres hitos formativos con desbloqueo progresivo:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ FASE 1: ANAMNESIS & SOSPECHA DIAGNÓSTICA PRELIMINAR                        │
│ • Entrada: Motivo de consulta, antecedentes patológicos y signos vitales.   │
│ • Evaluación RAG: Enfoque en el eje "Diagnóstico" y severidad preliminar.   │
│ • Desbloqueo: Revela los paraclínicos solicitados y pasa a la Fase 2.      │
├─────────────────────────────────────────────────────────────────────────────┤
│ FASE 2: SOLICITUD E INTERPRETACIÓN DE ESTUDIOS PARACLÍNICOS (MULTIMODAL)   │
│ • Entrada: Acceso a trazados ECG de 12 derivaciones, Rx y analítica lab.   │
│ • Evaluación RAG: Correlación cruzada multimodal de hallazgos patológicos.  │
│ • Desbloqueo: Se confirma el diagnóstico definitivo según la GPC del MSP.  │
├─────────────────────────────────────────────────────────────────────────────┤
│ FASE 3: PRESCRIPCIÓN TERAPÉUTICA DE EMERGENCIA & SEGUIMIENTO LONGITUDINAL  │
│ • Entrada: Confirmación diagnóstica y evolución del paciente.              │
│ • Evaluación RAG: Esquemas farmacológicos exactos (dosis/vía), metas de    │
│   control, criterios de alta y monitoreo en los ejes Tratamiento/Control.  │
│ • Cierre: Síntesis del Dictamen Global Consolidado (Radar 4 ejes + PDF).   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Componentes Técnicos del Subsistema de Simulación
* **Esquemas Pydantic (`models/schemas.py`):** `PhaseSchema` para modelar cada hito dentro del caso clínico y `PhaseEvaluationResult` para el retorno estructurado con `score_fase`, aciertos, omisiones, cita y datos de desbloqueo.
* **Constructor de Prompts Especializado (`rag/prompt_builder.py`):** `build_phase_prompt` ajusta el contexto y la directiva evaluativa según el hito activo (sin penalizar prematuramente en Fase 1 por detalles farmacológicos de Fase 3).
* **Endpoint Transaccional (`routers/evaluation.py`):** `POST /api/evaluate/phase` recibe el estado de la fase actual, acumula el historial previo y procesa el request multimodal.
* **Experiencia de Usuario en Frontend (`frontend/src/components/`):**
  * `SimulationStepper.jsx`: Componente de navegación de pasos con estados visuales (Activo, Completado con score, Bloqueado).
  * `PhaseFeedbackCard.jsx`: Panel de retroalimentación inmediata post-fase con cita textual de la GPC y botón de avance.
  * Al culminar la Fase 3, `CaseSolve.jsx` consolida los resultados de los tres hitos en un único `EvaluationResult` maestro, alimentando el `SkillRadarChart` y habilitando la descarga del dictamen PDF oficial.
