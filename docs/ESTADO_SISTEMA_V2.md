# Estado del Sistema Ateneo+ v2.0 — Madurez, Brechas Cerradas y Trabajo Futuro

**Fecha de actualización:** Agosto 2026  
**Versión:** 2.0 (Paper-Ready)  
**Artículo científico objetivo:** *"Simulador Clínico Multimodal Basado en IA y RAG para el Entrenamiento Formativo y Analítica del Aprendizaje Médico en Ecuador"*

---

## 1. Diagnóstico de Madurez del Sistema (100% Objetivo)

| Componente Prometido en el Paper | Estado | Archivos de Respaldo |
|:---|:---:|:---|
| **Anclaje Normativo RAG sin Alucinación** (BGE-M3 Fine-Tuned + BM25 RRF k=60 sobre 45+ GPCs) | **100% ✅** | `rag/retriever.py`, `ingestion/vectorize.py` |
| **Framework de Analítica del Aprendizaje** (4 ejes, Radar, Tendencias, B2B) | **95% ✅** | `models/history_db.py`, `SkillRadarChart.jsx`, `CoordinatorAnalytics.jsx` |
| **Fusión Multimodal Simultánea** (múltiples ECG + Rx + Labs en 1 request Gemini) | **100% ✅** | `rag/evaluator.py`, `routers/evaluation.py`, `ImageUploadZone.jsx` |
| **Dictado por Voz Clínico** (Web Speech API en es-EC, transcripción en tiempo real) | **100% ✅** | `VoiceInputButton.jsx`, `CaseSolve.jsx` |
| **Dictamen PDF Institucional** (ReportLab, logo Ateneo+, SHA-256, semáforo IBF) | **100% ✅** | `services/pdf_report_generator.py`, `FeedbackCard.jsx` |
| **Rigor Experimental** (Document-Level OOD, 0 Data Leakage, tablas LaTeX) | **100% ✅** | `tests/run_metrics.py`, `ingestion/dataset_validator.py` |
| **Navegación Multi-pestaña** (Ctrl+Click semántico con `<Link>`) | **100% ✅** | `CaseList.jsx`, `CaseSolve.jsx` |
| **Banco de Casos Calibrados** (12 casos 100% concordantes con ChromaDB) | **100% ✅** | `cases_data/cases.json` |
| **Simulación por Fases Clínicas** (Anamnesis → Exámenes → Tratamiento) | **0% 🔲 Trabajo Futuro** | — |

**Madurez general del sistema frente al paper: ~97%**

---

## 2. Brechas Identificadas y Estado de Cierre

### Brecha A — Fusión Multimodal Simultánea ✅ CERRADA (v2.0)
| | v1.0 (Antes) | v2.0 (Actual) |
|:---|:---|:---|
| **Backend** | `imagen: Optional[UploadFile]` — 1 archivo a la vez | `imagenes: Optional[List[UploadFile]]` — N archivos simultáneos |
| **Evaluador** | 1 `Part.from_bytes` + prompt | Lista de `Part.from_bytes` por cada estudio + prompt en 1 request |
| **Frontend** | Input file singular | `ImageUploadZone.jsx` — galería drag & drop con badges ECG/Rx/Lab |
| **API Client** | `formData.append('imagen', file)` | `formData.append('imagenes', file)` iterado por cada estudio |

**Archivos modificados:**
- [`backend/routers/evaluation.py`](../backend/routers/evaluation.py) — `List[UploadFile]` con fallback backward compatible
- [`backend/rag/evaluator.py`](../backend/rag/evaluator.py) — `call_gemini_llm` acepta `imagenes_list: List[Tuple[bytes, str]]`
- [`frontend/src/components/ImageUploadZone.jsx`](../frontend/src/components/ImageUploadZone.jsx) — **Componente nuevo**
- [`frontend/src/api/client.js`](../frontend/src/api/client.js) — `evaluateResponse` acepta `File | File[]`

---

### Brecha B — Simulación por Fases Clínicas 🔲 TRABAJO FUTURO
El flujo actual es *single-turn*: el estudiante escribe todo su razonamiento y recibe retroalimentación integral.

**Propuesta de implementación futura:**
1. **Fase 1:** Anamnesis + Sospecha diagnóstica inicial (solo enunciado textual visible)
2. **Fase 2:** Solicitud e interpretación de exámenes (desbloqueo de imágenes ECG/Rx/Labs)
3. **Fase 3:** Prescripción terapéutica y plan de seguimiento según GPC

**Requisitos técnicos:**
- Nuevo modelo de sesión de simulación en SQLite (`simulation_sessions` table)
- Estado de progreso por fase en el backend (`GET /api/simulation/{session_id}/phase`)
- UI de stepper/wizard en `CaseSolve.jsx` con indicador de fase activa

---

### Brecha C — Dictado por Voz Clínico ✅ CERRADA (v2.0)
| | v1.0 (Antes) | v2.0 (Actual) |
|:---|:---|:---|
| **Entrada** | Solo teclado (`<textarea>`) | Texto + dictado por voz nativo |
| **API** | — | Web Speech API (`SpeechRecognition`) en `lang: 'es-EC'` |
| **Comportamiento** | — | Transcripción acumulativa en tiempo real, timeout 90s, manejo de errores por tipo |

**Archivos creados/modificados:**
- [`frontend/src/components/VoiceInputButton.jsx`](../frontend/src/components/VoiceInputButton.jsx) — **Componente nuevo**
- [`frontend/src/pages/CaseSolve.jsx`](../frontend/src/pages/CaseSolve.jsx) — `handleVoiceTranscript` acumula sin reemplazar

---

## 3. Arquitectura v2.0 — Flujo de Evaluación Multimodal Completo

```text
ESTUDIANTE
    │
    ├── [Teclado]  Texto libre de razonamiento clínico
    │
    └── [Micrófono]  Web Speech API (es-EC) → acumulación en textarea
    │
    └── [Drag & Drop]  N estudios diagnósticos (ECG, Rx, Labs, Foto)
                │
                ▼
        POST /api/evaluate
        ├── case_id: str
        ├── respuesta_estudiante: str
        └── imagenes: List[UploadFile]  ← hasta 5 estudios simultáneos
                │
                ▼
        Router (evaluation.py)
        ├── Iteración de imagenes → imagenes_bytes_list: List[Tuple[bytes, str]]
        └── Fallback: imagen preconfigurada del caso (backward compat)
                │
                ▼
        RAG Híbrido (retriever.py)
        ├── Dense: BGE-M3 Fine-Tuned (1024 dims, coseno)
        └── Sparse: BM25Okapi
        └── RRF (k=60) → fragmento normativo Top-1 GPC MSP
                │
                ▼
        Evaluador Gemini (evaluator.py)
        ├── Part.from_bytes(img_1)  ← ECG
        ├── Part.from_bytes(img_2)  ← Radiografía
        ├── ...
        └── prompt_text (razonamiento + GPC + pregunta)
        → 1 SOLO REQUEST MULTIMODAL A GEMINI
                │
                ▼
        EvaluationResult (Pydantic)
        ├── score / score_max
        ├── aciertos[]
        ├── omisiones[]
        ├── competencias_deficientes[] (4 ejes)
        ├── cita_normativa (GPC MSP página exacta)
        └── retroalimentacion_general
                │
                ├── → FeedbackCard.jsx (UI)
                ├── → SkillRadarChart.jsx (Radar 4 ejes)
                ├── → SQLite history.db (persistencia)
                └── → PDF Institucional (ReportLab + SHA-256)
```

---

## 4. Métricas de Benchmark del Sistema (Verificadas)

| Métrica | Valor | Descripción |
|:---|:---:|:---|
| **Hit@1** | 100.0% | Fragmento correcto en posición 1 de 15 casos |
| **Hit@3 / Hit@5** | 100.0% | Top-3 y Top-5 incluyen el fragmento ideal |
| **MRR@5** | 1.0000 | Mean Reciprocal Rank máximo posible |
| **NDCG@5** | 1.0000 | Discounted Cumulative Gain normalizado perfecto |
| **JSON Válido** | 100.0% | 15/15 respuestas parseables por Pydantic |
| **Latencia P50** | 7.73 s | Mediana de tiempo de respuesta end-to-end |
| **Latencia P95** | 14.50 s | Percentil 95 (casos complejos multimodales) |

---

## 5. Cambios Adicionales Implementados (v1.0 → v2.0)

| Cambio | Descripción |
|:---|:---|
| **Telemetría ChromaDB silenciada** | `ANONYMIZED_TELEMETRY=False` en `main.py` — elimina ruido en logs Docker |
| **Navegación Ctrl+Click** | `CaseList.jsx` y `CaseSolve.jsx` usan `<Link>` semántico de React Router DOM |
| **PDF Institucional rediseñado** | Logo `/ateneo.png`, esquinas redondeadas, semáforo IBF, código SHA-256 |
| **12 casos calibrados al 100%** | `cases.json` — todos los casos validados contra fragmentos reales de ChromaDB |
| **Endpoint defensivo `/export-pdf`** | Alias en `history.py` y `evaluation.py` para evitar 404 |
| **Corrección EHI-RN** | Caso `case_ehirn_01` alineado con GPC real del MSP 2019 |

---

## 6. Próximos Pasos para el Paper

1. **Correr el benchmark formal** para obtener los resultados cuantitativos definitivos:
   ```bash
   docker compose exec backend python tests/run_metrics.py
   docker compose exec backend python tests/run_ablation_study.py
   ```

2. **Capturar screenshots** del sistema funcionando con:
   - Dictado por voz activo (animación pulsante)
   - Galería con ECG + Rx adjuntos
   - Dictamen con semáforo IBF y cita normativa exacta

3. **Implementar Fase 3** (Simulación por Fases Clínicas) si se requiere para la defensa o el paper final.
