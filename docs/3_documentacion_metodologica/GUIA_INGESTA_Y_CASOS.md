# Guía de Ingesta, Catalogación Nosológica y Visor de GPCs

Esta guía detalla la gestión de documentos normativos en formato PDF, su clasificación en los 4 ejes clínicos canónicos del MSP Ecuador, el inventario criptográfico con CIE-10/CIE-11 y la integración con el pipeline de ingesta y visualización formativa en **Ateneo+**.

---

## 1. Estructura Canónica de Directorios del Corpus ([../backend/data/raw_pdfs/](../backend/data/raw_pdfs))

El universo normativo del Ministerio de Salud Pública (MSP) del Ecuador comprende exactamente **45 Guías de Práctica Clínica oficiales** expedidas por Acuerdo Ministerial (2013-2019), organizadas en 4 ejes temáticos y respaldadas por [`backend/data/corpus_manifest.json`](../backend/data/corpus_manifest.json):

```text
backend/data/
├── raw_pdfs/
│   ├── 01_urgencias_obstetricas/         # 14 GPCs (Preeclampsia, Código Rojo, Diabetes Gestacional, etc.)
│   ├── 02_respiratorio_pediatrico/       # 11 GPCs (NAC, Tuberculosis, Sepsis Neonatal, SDR, etc.)
│   ├── 03_cardiovascular_metabolico/     # 2 GPCs (Hipertensión Arterial, Enfermedad Renal Crónica)
│   └── 04_soporte_cronicos_salud_mental/ # 18 GPCs (Depresión, Dolor Oncológico, Cuidados Paliativos, Raras)
└── corpus_manifest.json                  # Manifiesto criptográfico (45 hashes SHA-256, CIE-10 y CIE-11)
```

---

## 2. Pipeline de Ingesta Recursiva y Vectorización Acelerada

### 2.1 Opciones de Ejecución de la Ingesta

#### Opción 1: Extracción en Google Colab con GPU
A través del notebook de extracción multimodal [`../backend/ingestion_v2/colab_fase2_marker_extraction.ipynb`](../backend/ingestion_v2/colab_fase2_marker_extraction.ipynb) o entrenamiento de embeddings en [`../backend/ingestion_v2/colab_fase6_train_bge_m3.ipynb`](../backend/ingestion_v2/colab_fase6_train_bge_m3.ipynb).

#### Opción 2: Extracción Local Nativa
Para procesar las 42 GPCs oficiales y estructurar las tablas en Markdown nativo:
```bash
uv run python backend/ingestion_v2/02_extract_corpus_native.py
```

### 2.2 Características Técnicas del Extractor Nativo ([../backend/ingestion_v2/02_extract_corpus_native.py](../backend/ingestion_v2/02_extract_corpus_native.py))
1. **Detección Automática de Año y Metadatos:** Extrae el año y asocia los metadatos normativos del manifiesto criptográfico (`corpus_manifest.json`).
2. **Conversión de Tablas a Markdown:** Convierte tablas de dosificación, criterios diagnósticos y matrices clínicas directamente a sintaxis Markdown limpia mediante `page.find_tables()` de PyMuPDF.
3. **Paginación Física Real:** Inyecta delimitadores de página `<!-- GPC_PAGE_START -->` y `<!-- GPC_PAGE_END -->` con el número de página impreso oficial.
4. **Manejo Defensivo y Normalización:** Normaliza caracteres diacríticos NFC y unidades clínicas (`µg`, `°C`) sin corromper el texto original.

---

## 3. Catálogo Normativo CIE-10 y Especialidades Médicas ([../backend/models/medical_catalog.py](../backend/models/medical_catalog.py))

Ateneo integra un catálogo maestro ([`../backend/data/catalogo_cie10_gpc.json`](../backend/data/catalogo_cie10_gpc.json)) que asocia a cada GPC sus metadatos nosológicos y clínicos:
* **Código y Descripción CIE-10:** Identificador de la Clasificación Internacional de Enfermedades (ej. `O14.1` Preeclampsia Severa, `A90` Dengue, `I10` HTA, `N18` ERC).
* **Especialidad Médica Principal:** Clasificación por especialidad (*Ginecología y Obstetricia, Pediatría y Neonatología, Medicina Interna, Infectología, Neumología, Nefrología, Endocrinología, Genética y Enfermedades Raras, Cuidados Paliativos*).
* **Grupo Etario y Nivel de Atención:** Metadatos demográficos y de complejidad hospitalaria persistidos en cada fragmento en ChromaDB.

---

## 4. Endpoints y Visor PDF Interactivo

### 4.1 Endpoint de Localización de PDFs
* **Ruta:** `GET /api/cases/pdf-location/{guia_id}`
* **Función:** Busca recursivamente en las subcarpetas de `raw_pdfs/` el archivo correspondiente a `guia_id` y devuelve su URL estática accesible (`/static/pdfs/2019/gpc_hta192019.pdf`).

### 4.2 Componente Frontend ([../frontend/src/modules/evaluation/components/PdfViewerModal.tsx](../frontend/src/modules/evaluation/components/PdfViewerModal.tsx))
* Al recibir una evaluación formativa, la tarjeta de feedback ([`../frontend/src/modules/evaluation/components/FeedbackCard.tsx`](../frontend/src/modules/evaluation/components/FeedbackCard.tsx)) incluye el botón **"Ver en Guía Oficial (Pág. X)"**.
* Al hacer clic, abre un visor PDF integrado que salta directamente a la página exacta de la normativa (`#page={pagina}`), permitiendo auditar la fuente oficial en tiempo real.

---

## 5. Exportador de Dictamen Clínico en PDF Institucional

### 5.1 Servicio Generador ([../backend/services/pdf_report_generator.py](../backend/services/pdf_report_generator.py))
* Genera documentos PDF membretados de alta resolución mediante **`ReportLab`**.
* Incluye:
  * Membrete institucional oficial del proyecto Ateneo y MSP Ecuador.
  * Desglose cualitativo y cuantitativo del puntaje ($/10\text{ pts}$).
  * Tablas en dos columnas de Aciertos Clínicos vs Omisiones / Puntos a Mejorar.
  * Cuadro sombreado con la Cita Normativa Oficial y número de página exacto.
  * Hash de integridad criptográfica SHA-256 (`ATENEO-MSP-XXXXXXXX`) para auditoría académica.

### 5.2 Endpoint de Streaming
* **Ruta:** `POST /api/evaluate/export-pdf`
* **Content-Type:** `application/pdf` (Descarga directa en streaming para navegadores).
