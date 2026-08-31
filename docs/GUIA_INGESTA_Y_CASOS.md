# Guía de Ingesta Masiva, Organización por Años y Visor de GPCs

Esta guía detalla la gestión de documentos normativos en formato PDF, su organización por carpetas de año, el pipeline de ingesta automática, el catálogo de metadatos CIE-10 y la exportación de informes formativos en el sistema **Ateneo**.

---

## 1. Estructura de Directorios para Ingesta Masiva ([../backend/data/raw_pdfs/](../backend/data/raw_pdfs))

Las ~60 Guías de Práctica Clínica emitidas por el Ministerio de Salud Pública (MSP) del Ecuador se organizan por año de publicación oficial dentro de subcarpetas dedicadas:

```text
backend/data/raw_pdfs/
├── 2013/
│   ├── Guia-de-hemorragia-postparto.pdf
│   ├── Guia-de-gaucher.pdf
│   └── ...
├── 2014/
├── 2015/
├── 2016/
├── 2017/
├── 2018/
│   ├── guia_prevencion_diagnostico_tratamiento_enfermedad_renal_cronica_2018.pdf
├── 2019/
│   ├── gpc_VIH_acuerdo_ministerial05-07-2019.pdf
│   ├── gpc_ehirn2019.pdf
│   └── gpc_hta192019.pdf
└── general/
    └── GP_Tuberculosis-1.pdf
```

---

## 2. Pipeline de Ingesta Recursiva y Vectorización Acelerada

### 2.1 Opciones de Ejecución de la Ingesta

#### Opción 1: Aceleración Élite en GPU NVIDIA A100 (Estándar MLOps Recomendado - < 60 segundos)
A través del notebook maestro [`../backend/ingestion/colab_ingesta_benchmark_a100.ipynb`](../backend/ingestion/colab_ingesta_benchmark_a100.ipynb):
* Procesa los embeddings de 1024 tokens con precisión nativa `TF32/BF16` en Tensor Cores.
* Genera la base persistente `chroma_db/` con espacio métrico `cosine`.
* Empaqueta automáticamente el artefacto `chroma_db.zip` para descarga y despliegue inmediato en local o AWS.

#### Opción 2: Ejecución Local en CPU
Para procesar recursivamente todas las subcarpetas e indexar los fragmentos localmente:
```bash
py backend/ingestion/run_ingestion.py
```

### 2.2 Características Técnicas del Parser Avanzado ([../backend/ingestion/pdf_advanced_parser.py](../backend/ingestion/pdf_advanced_parser.py))
1. **Detección Automática de Año:** Extrae el año de la carpeta contenedora (`2013`, `2019`, etc.) o del texto del acuerdo ministerial y lo almacena como metadato normativo `ano_publicacion`.
2. **Conversión de Tablas a Markdown (`pdfplumber`):** Convierte tablas de dosificación, criterios diagnósticos y matrices clínicas directamente a sintaxis Markdown:
   ```markdown
   | Parámetro Clínico | Criterio de Riesgo | Conducta MSP |
   | --- | --- | --- |
   | Presión Arterial | >= 160/110 mmHg | Sulfato de Magnesio IV |
   ```
3. **OCR Defensivo Multinivel ([../backend/ingestion/ocr_service.py](../backend/ingestion/ocr_service.py)):** Si una página antigua carece de texto seleccionable pero contiene imágenes o flujogramas escaneados, el sistema renderiza la página a 180 DPI en memoria y ejecuta OCR automático (Local / Gemini Multimodal) preservando tablas y dosis sin pérdida de información.
4. **Manejo Defensivo de Fuentes Dañadas:** Omite streams de fuentes corruptas sin detener el procesamiento de los demás documentos.

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

### 4.2 Componente Frontend ([../frontend/src/components/PdfViewerModal.jsx](../frontend/src/components/PdfViewerModal.jsx))
* Al recibir una evaluación formativa, la tarjeta de feedback ([`../frontend/src/components/FeedbackCard.jsx`](../frontend/src/components/FeedbackCard.jsx)) incluye el botón **"Ver en Guía Oficial (Pág. X)"**.
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
