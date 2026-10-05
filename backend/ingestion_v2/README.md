# Pipeline Científico de Ingesta v2 — 100% Corpus MSP Ecuador

Este módulo contiene la implementación del **Nuevo Pipeline Científico de Ingesta y Reestructuración de IA (Ateneo+ v2.0)**, diseñado para cumplir con los estándares de rigor metodológico y reproducibilidad de revistas médicas indexadas en Q1 (Lancet Digital Health, IEEE JBHI, Springer).

> **Documento Rector:** [Plan Maestro de Reestructuración del Pipeline de IA v2](../../docs/7_planes_de_escalabilidad_y_hoja_de_ruta/PLAN_REESTRUCTURACION_PIPELINE_IA.md)

---

## 1. Hoja de Ruta de 8 Fases del Pipeline v2

| Fase | Descripción Técnica | Script / Notebook | Estado |
| :---: | :--- | :--- | :---: |
| **Fase 1** | Clasificación en 4 ejes canónicos del MSP e inventario criptográfico con CIE-10/CIE-11 | `01_classify_and_inventory_corpus.py` | **100% Completada y Certificada** |
| **Fase 2** | Extracción nativa de alta fidelidad (PyMuPDF, tablas Markdown, paginación física real) | `02_extract_corpus_native.py` | **100% Completada y Certificada (42/42 GPCs, 3,201 tablas, 7.68M chars)** |
| **Fase 3** | Chunking semántico indivisible por tokens BGE-M3 (512 tokens objetivo, tablas intactas) | `03_token_chunker.py` | **100% Completada y Certificada (7,052 chunks, P95 616 tokens, 0 ruidos)** |
| **Fase 4** | Minería semántica de Hard Negatives con BGE-M3 base y filtrado defensivo | `04_mine_hard_negatives.py` | **100% Completada y Certificada (1,709 tripletas, 70/15/15, SHA-256)** |
| **Fase 5** | Curación ciega del Ground Truth médico humano (Kappa de Cohen $\ge 0.80$) | `05_build_ground_truth_pool.py` *(Próxima Fase)* | Pendiente |
| **Fase 6** | Re-entrenamiento de BGE-M3 en GPU NVIDIA A100 (40 GB) con pérdida MNRL ($\tau=0.02$) | `06_train_bge_m3.py` *(Próxima Fase)* | Pendiente |
| **Fase 7** | Indexación vectorial híbrida densa + sparse en ChromaDB v2 | `07_index_chromadb_v2.py` *(Próxima Fase)* | Pendiente |
| **Fase 8** | Benchmark científico ciego y evaluación multimodal desacoplada con vLLM | `08_evaluate_blind_benchmark.py` *(Próxima Fase)* | Pendiente |

---

## 2. Archivos Activos en Este Módulo

```text
backend/ingestion_v2/
├── 01_classify_and_inventory_corpus.py     # Fase 1: Clasificación, hash SHA-256 y CIE-10/11
├── 02_extract_corpus_native.py             # Fase 2: Extractor nativo determinístico (PyMuPDF C++)
├── 03_token_chunker.py                     # Fase 3: Token chunking semántico BGE-M3 e indivisible
├── 04_mine_hard_negatives.py               # Fase 4: Minería semántica vectorizada y filtrado defensivo
├── 02_extract_with_marker.py               # Fase 2 (Alternativa histórica con GPU / Marker)
└── colab_fase2_marker_extraction.ipynb     # Fase 2 (Alternativa histórica en Google Colab)
```

---

## 3. Comandos de Ejecución

```bash
# 1. Regenerar o auditar el inventario criptográfico del corpus (Fase 1):
python backend/ingestion_v2/01_classify_and_inventory_corpus.py

# 2. Ejecutar la extracción de alta fidelidad con PyMuPDF (Fase 2):
python backend/ingestion_v2/02_extract_corpus_native.py

# 3. Ejecutar el token chunking semántico BGE-M3 (Fase 3):
python backend/ingestion_v2/03_token_chunker.py

# 4. Ejecutar la minería semántica de Hard Negatives y partición 70/15/15 (Fase 4):
python backend/ingestion_v2/04_mine_hard_negatives.py
```
