# Artefactos y Datasets de la Versión 1 (Legacy / Preliminar)

Este directorio alberga los artefactos de datos, conjuntos de tripletas y pesos del modelo pertenecientes a la **Versión 1 preliminar** del sistema Ateneo+. 

> **AVISO IMPORTANTE:** Estos archivos se preservan con fines de reproducibilidad histórica y estudios de ablación (comparación baseline del paper). Para el pipeline de producción e investigación científica activa, utilice exclusivamente los módulos de **`backend/ingestion_v2/`** y los datos en **`backend/data/datasets/`**, **`backend/data/extracted/`** y **`backend/data/ground_truth/`**.

---

## Inventario de Archivos Segregados

| Archivo / Carpeta | Descripción | Motivo de Reemplazo en v2 |
| :--- | :--- | :--- |
| `train_triplets.json` | Tripletas preliminares de entrenamiento v1 (7.36 MB) | Reemplazado por `backend/data/datasets/retrieval_train.json` (1,178 tripletas con Zero Data Leakage y filtrado defensivo). |
| `val_triplets.json` | Tripletas de validación v1 (4.16 MB) | Reemplazado por `backend/data/datasets/retrieval_val.json` (249 tripletas balanceadas). |
| `test_triplets_blind.json` | Tripletas de prueba v1 (3.01 MB) | Reemplazado por `backend/data/datasets/retrieval_test_blind.json` (283 tripletas) y `backend/data/ground_truth/pairs_validated.csv`. |
| `ft_dataset.json` | Dataset crudo inicial (14.53 MB) | Reemplazado por el corpus estructurado `backend/data/extracted/chunks_corpus_v2.json`. |
| `seed_chunks.json` | Fragmentos semilla iniciales (6.29 KB) | Reemplazado por el inventario ministerial de 42 GPCs (`corpus_manifest.json`). |
| `ateneo-bge-m3-ecuador/` | Pesos del modelo entrenado en v1 | Reemplazado por `backend/data/models/ateneo-bge-m3-ecuador-v2/` (entrenamiento con MNRL calibrado a $\tau=0.02$). |
| `extracted_fase2_corpus.zip` | Respaldo zip de extracción preliminar | Reemplazado por los documentos Markdown limpios en `backend/data/extracted/markdown/`. |
