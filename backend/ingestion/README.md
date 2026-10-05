# Módulo Ingestion v1 (DEPRECADO / Pipeline Preliminar)

> **ESTADO: DEPRECADO Y ARCHIVADO**
> 
> Este directorio contiene los scripts y notebooks del pipeline preliminar (Versión 1.0) de extracción y fine-tuning. 
> Ha sido formalmente sustituido por el **Pipeline Científico de Ingesta v2**:
> 
> 👉 **Módulo Activo Oficial:** [`backend/ingestion_v2/`](../ingestion_v2/README.md)
> 👉 **Plan Maestro de Reestructuración:** [`docs/7_planes_de_escalabilidad_y_hoja_de_ruta/PLAN_REESTRUCTURACION_PIPELINE_IA.md`](../../docs/7_planes_de_escalabilidad_y_hoja_de_ruta/PLAN_REESTRUCTURACION_PIPELINE_IA.md)

---

## Diferencias Clave entre v1 e Ingestion v2

| Aspecto Metodológico | Ingestion v1 (Este Módulo) | Ingestion v2 (`backend/ingestion_v2/`) |
| :--- | :--- | :--- |
| **Extracción de PDFs** | PyPDF2 / pdfminer (tablas deformadas y texto roto) | PyMuPDF en C++ de alta fidelidad con preservación del 100% de tablas Markdown y paginación física real coincidente con los documentos del MSP. |
| **Chunking** | Heurística por caracteres (chunks truncados y ruido editorial) | Token chunking semántico BGE-M3 (512 tokens objetivo, micro-tablas indivisibles y prefijo de contexto inyectado). |
| **Minería de Negativos** | Negativos aleatorios sin filtrado | Minería en dos etapas (BM25 + BGE-M3 denso) con filtro defensivo estricto (Jaccard $\le 65\%$, no intra-sección, depuración de listas editoriales). |
| **Fuga de Datos** | Fuga por solapamiento de consultas entre particiones | Grouped Stratified Split con certificación matemática de Zero Data Leakage ($\text{Train} \cap \text{Test} = \emptyset$). |
| **Curación Médica** | Sin validación de revisores independientes | Ground Truth de 160 pares con protocolo clínico Likert (0-2) y acuerdo inter-anotador Kappa ponderado cuadrático $\kappa_w = 0.9531$. |
| **Fine-Tuning BGE-M3** | Pérdida genérica sin calibrar | Multiple Negatives Ranking Loss (MNRL, $\tau=0.02$, scale 50.0) optimizada para NVIDIA A100 en `bfloat16`. |
