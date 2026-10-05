# Catálogo de Scripts Operativos y Científicos (Ateneo+)

Este directorio contiene las herramientas de automatización, MLOps, diagnóstico, compilación de resultados experimentales y mantenimiento de base de datos para la plataforma **Ateneo+**.

---

## 1. Clasificación por Dominio Operativo

```text
scripts/
├── [Científico y Publicación Paper]
│   └── generate_paper_tables_pdf.py       # Compilación del compendio PDF oficial (Tablas LaTeX + Figuras)
│
├── [MLOps y Aceleración GPU Cloud]
│   ├── prepare_fase2_bundle.py            # Empaquetador liviano (124 MB) para Extracción Fase 2 con Marker-PDF
│   └── prepare_colab_bundle.py            # Empaquetador histórico completo para Fine-Tuning v1 en Colab A100
│
├── [Auditoría y Diagnóstico]
│   ├── audit_cases_against_chroma.py      # Verificación de correspondencia entre casos clínicos y ChromaDB
│   └── check_gemini_models.py             # Diagnóstico de modelos activos, cuotas y latencias en Gemini API
│
├── [Persistencia y Migraciones]
│   └── migrate_history_to_ateneo_clinical.py # Migración de datos relacionales desde history.db a ateneo_clinical.db
│
└── [Semillas y Datos Sintéticos]
    ├── upsert_seed_chunks.py              # Inserción de chunks normativos mínimos en ChromaDB
    └── generate_seed_chunks_ai.py         # Generación sintética de chunks de respaldo mediante LLM
```

---

## 2. Detalle de Ejecución y Guía de Uso

### 2.1 Generación del Compendio Científico en PDF
* **Archivo:** `generate_paper_tables_pdf.py`
* **Propósito:** Reúne las 5 tablas LaTeX generadas por los benchmarks experimentales (`docs/1_tablas_latex/`) y las 4 figuras diagnósticas de alta resolución (`docs/2_figuras_300dpi/`), compilando el documento unificado oficial para revisores por pares.
* **Salida:** `docs/4_pdf_compilado/COMPENDIO_TABLAS_Y_FIGURAS_PAPER.pdf` (1.34 MB).
* **Ejecución:**
  ```bash
  py scripts/generate_paper_tables_pdf.py
  # O dentro del contenedor Docker:
  docker compose exec backend python scripts/generate_paper_tables_pdf.py
  ```

---

### 2.2 Preparador del Paquete de Extracción Fase 2 (Marker-PDF)
* **Archivo:** `prepare_fase2_bundle.py`
* **Propósito:** Empaqueta exclusivamente los 45 PDFs canónicos del MSP Ecuador (`backend/data/raw_pdfs/`), el manifiesto criptográfico (`corpus_manifest.json`) y el módulo `ingestion_v2/` en un archivo comprimido de ~124 MB para procesamiento masivo en Google Colab con GPU.
* **Salida:** `fase2_marker_bundle.zip` (en la raíz del proyecto).
* **Ejecución:**
  ```bash
  py scripts/prepare_fase2_bundle.py
  ```

---

### 2.3 Preparador del Paquete Histórico para Fine-Tuning v1 (Colab A100)
* **Archivo:** `prepare_colab_bundle.py`
* **Propósito:** Empaquetador histórico que reúne la base de conocimiento completa, datos de entrenamiento y checkpoints para re-entrenar BGE-M3 bajo la arquitectura v1.
* **Salida:** `ateneo_colab_bundle.zip` (~1.8 GB).
* **Ejecución:**
  ```bash
  py scripts/prepare_colab_bundle.py
  ```

---

### 2.4 Auditoría de Casos Clínicos frente a ChromaDB
* **Archivo:** `audit_cases_against_chroma.py`
* **Propósito:** Inspecciona los 12 casos clínicos canónicos definidos en `backend/cases_data/cases.json`, verifica que sus guías normativas asociadas existan en la colección `gpc_msp` de ChromaDB y valida que sus fragmentos ideales sean recuperables semánticamente.
* **Ejecución:**
  ```bash
  py scripts/audit_cases_against_chroma.py
  ```

---

### 2.5 Diagnóstico de Modelos Gemini API
* **Archivo:** `check_gemini_models.py`
* **Propósito:** Consulta los endpoints de Google AI Studio / Gemini API para listar modelos disponibles, probar la inferencia multimodal con imágenes y reportar latencias percentiles (P50, P95).
* **Ejecución:**
  ```bash
  py scripts/check_gemini_models.py
  ```

---

### 2.6 Migración de Base de Datos Histórica
* **Archivo:** `migrate_history_to_ateneo_clinical.py`
* **Propósito:** Script idempotente que traslada registros históricos de evaluaciones, usuarios y sesiones desde `history.db` hacia el esquema relacional normalizado con claves foráneas e índices en `ateneo_clinical.db`.
* **Ejecución:**
  ```bash
  py scripts/migrate_history_to_ateneo_clinical.py
  ```

---

### 2.7 Inserción de Chunks Semilla en ChromaDB
* **Archivo:** `upsert_seed_chunks.py`
* **Propósito:** Carga fragmentos normativos esenciales desde `backend/data/seed_chunks.json` directamente a ChromaDB, permitiendo levantar el simulador en entornos de prueba sin necesidad de ejecutar el pipeline de ingesta completo.
* **Ejecución:**
  ```bash
  py scripts/upsert_seed_chunks.py
  ```
