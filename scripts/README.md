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
├── [Auditoría y Diagnóstico]
│   ├── audit_cases_against_chroma.py      # Verificación de correspondencia entre casos clínicos y ChromaDB
│   └── check_gemini_models.py             # Diagnóstico de modelos activos, cuotas y latencias en Gemini API
│
└── [Persistencia y Migraciones]
    └── migrate_history_to_ateneo_clinical.py # Verificación de base relacional normalizada ateneo_clinical.db
```

---

## 2. Detalle de Ejecución y Guía de Uso

### 2.1 Generación del Compendio Científico en PDF
* **Archivo:** `generate_paper_tables_pdf.py`
* **Propósito:** Reúne las tablas LaTeX generadas por los benchmarks experimentales (`docs/1_tablas_latex/`) y las figuras diagnósticas de alta resolución (`docs/2_figuras_300dpi/`), compilando el documento unificado oficial para revisores por pares.
* **Salida:** `docs/4_pdf_compilado/COMPENDIO_TABLAS_Y_FIGURAS_PAPER.pdf`.
* **Ejecución:**
  ```bash
  python scripts/generate_paper_tables_pdf.py
  ```

---

### 2.2 Auditoría de Casos Clínicos frente a ChromaDB
* **Archivo:** `audit_cases_against_chroma.py`
* **Propósito:** Inspecciona los 10 casos clínicos canónicos definidos en `backend/cases_data/cases.json`, verifica que sus guías normativas asociadas existan en la colección `gpc_msp_v2` de ChromaDB y valida que sus fragmentos ideales sean recuperables semánticamente.
* **Ejecución:**
  ```bash
  python scripts/audit_cases_against_chroma.py
  ```

---

### 2.3 Diagnóstico de Modelos Gemini API
* **Archivo:** `check_gemini_models.py`
* **Propósito:** Consulta los endpoints de Google AI Studio / Gemini API para listar modelos disponibles, probar la inferencia multimodal con imágenes y reportar latencias percentiles (P50, P95).
* **Ejecución:**
  ```bash
  python scripts/check_gemini_models.py
  ```
