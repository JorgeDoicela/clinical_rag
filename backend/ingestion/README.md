# Pipeline de Ingesta v1 — Baseline Histórico del Paper

Este módulo contiene la implementación del **Pipeline de Ingesta y Fine-Tuning v1** de Ateneo+. 

> **Estado Arquitectónico:** **Baseline Congelado para Investigación Científica.**  
> Este código se preserva íntegramente para:
> 1. Garantizar la reproducibilidad estricta del **Estudio de Ablación** presentado en el paper (Tabla II: Comparativa del filtro léxico de Jaccard vs. Minería Semántica de Hard Negatives).
> 2. Mantener la compatibilidad en tiempo de ejecución con endpoints de evaluación y diagnóstico (`backend/routers/evaluation.py` y `backend/rag/retriever.py`).
> 
> Para el nuevo pipeline científico oficial basado en el 100% del corpus de Ecuador y extracción sin pérdida con Marker-PDF, consultar: [`backend/ingestion_v2/`](../ingestion_v2/).

---

## 1. Estructura de Archivos del Pipeline v1

```text
backend/ingestion/
├── [Extracción y Parseo de PDFs]
│   ├── pdf_advanced_parser.py          # Extracción con pdfplumber, detección de años y tablas Markdown
│   ├── pdf_extractor.py               # Extractor de texto plano ligero
│   └── ocr_service.py                 # OCR defensivo para páginas escaneadas o sin texto seleccionable
│
├── [Segmentación y Vectorización]
│   ├── chunker.py                     # Segmentación semántica por secciones clínicas
│   └── vectorize.py                   # Indexación de fragmentos y generación de embeddings en ChromaDB
│
├── [Orquestación y Pipeline Local]
│   └── run_ingestion.py               # Orquestador del flujo completo de ingesta v1
│
├── [Minería de Datos y Fine-Tuning v1]
│   ├── generate_scientific_triplets.py # Generación de tripletas (q, p+, n-) con filtro léxico de Jaccard
│   ├── create_ft_dataset.py           # Ensamblado del dataset consolidado ft_dataset.json
│   ├── dataset_validator.py           # Auditoría matemática de cero fuga de datos (Data Leakage)
│   └── train_fine_tuning.py           # Script de entrenamiento supervisado local con pérdida MNRL
│
└── [Notebooks para Google Colab A100]
    ├── colab_fine_tuning.ipynb        # Fine-tuning de BAAI/bge-m3 acelerado en GPU A100
    └── colab_ingesta_benchmark_a100.ipynb # Benchmark de ingesta masiva en < 60 segundos
```

---

## 2. Dependencias y Consumo en Producción

* **`dataset_validator.py`:** Importado activamente por `backend/routers/evaluation.py` para reportar métricas de integridad en el endpoint `GET /api/evaluation/benchmark`.
* **`run_ingestion.py`:** Invocado como mecanismo de auto-recuperación en `backend/rag/retriever.py` si la colección `gpc_msp` de ChromaDB no se encuentra inicializada.
