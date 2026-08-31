# Ateneo: Plataforma de Evaluación del Razonamiento Clínico mediante RAG y Guías de Práctica Clínica del MSP Ecuador

**Ateneo** es un sistema de software de nivel de producción diseñado para la evaluación formativa y cuantitativa del razonamiento clínico (diagnóstico, terapéutico, preventivo y de seguimiento) en estudiantes de ciencias de la salud. La plataforma contrasta de forma automatizada las respuestas en lenguaje natural expresadas libremente por los usuarios contra el cuerpo normativo de las Guías de Práctica Clínica (GPC) del Ministerio de Salud Pública (MSP) del Ecuador.

El sistema integra una arquitectura de Recuperación Aumentada por Generación (RAG) en dos etapas, utilizando un modelo recuperador denso supervisado mediante Fine-Tuning por Tripletas (*Multiple Negatives Ranking Loss*) y un Modelo de Lenguaje de Gran Escala (LLM) multimodal forzado a producir respuestas estructuradas en sintaxis JSON estricta mediante validación Pydantic.

---

## 1. Especificaciones Técnicas y Stack Tecnológico

| Componente | Tecnología / Librería | Versión | Función en el Sistema |
| :--- | :--- | :--- | :--- |
| **Backend Core** | FastAPI / Python | `0.115.6` / `3.11` | API REST asíncrona, enrutamiento, controladores de endpoint y middlewares de seguridad. |
| **Validación de Datos** | Pydantic | `2.10.4` | Definición de esquemas de datos de entrada/salida, tipado estricto y normalizadores defensivos. |
| **Base Vectorial** | ChromaDB | `0.6.3` | Almacenamiento persistente de vectores densos con búsqueda por similitud de distancia coseno. |
| **Embeddings Base** | `BAAI/bge-m3` | `SentenceTransformers 3.3.1` | Encoder denso bidireccional de 1,024 dimensiones con ventana contextual de 8,192 tokens. |
| **Modelo Fine-Tuned** | `ateneo-bge-m3-ecuador` | Local / Custom | Modelo ajustado mediante pérdida MNRL sobre 480 tripletas clínicas de GPCs del MSP Ecuador. |
| **Evaluador LLM** | Google Gemini API | `google-genai 0.1.0+` | Invocación multimodal autorregresiva (`gemini-3.5-flash` / `gemini-2.5-flash`) con `response_mime_type="application/json"`. |
| **Persistencia Relacional** | SQLite3 | Native | Almacenamiento transaccional de historial de evaluaciones, analítica B2B y salas de Ateneo sincrónicas. |
| **Seguridad & Auth** | PyJWT / Passlib | `2.13.0` / `1.7.4` | Autenticación basada en JWT (algoritmo HS256) y hashing de contraseñas mediante PBKDF2/bcrypt. |
| **Frontend UI** | React / Vite | `18.3.1` / `6.0.5` | Single Page Application (SPA) y Progressive Web App (PWA) con React Router DOM v6. |
| **Estilos & Iconos** | Tailwind CSS / Lucide | `3.4.17` / `0.469.0` | Sistema de diseño de alta precisión con paleta de colores fríos e iconografía vectorial plana. |
| **Visualización Gráfica** | Recharts | `2.15.0` | Gráficos de radar de competencias, tendencias temporales y distribución analítica de cohortes. |

---

## 2. Estructura Completa del Repositorio

```text
clinical_rag/
├── backend/
│   ├── auth/
│   │   └── security.py          # Autenticación JWT (HS256), hashing PBKDF2/bcrypt y control RBAC
│   ├── cases_data/
│   │   ├── cases.json           # Banco de casos clínicos simulados y metadatos de nivel esperado
│   │   └── images/              # Recursos gráficos estáticos (radiografías, hemogramas, ECG, etc.)
│   ├── data/
│   │   ├── ateneo-bge-m3-ecuador/ # Pesos compilados del modelo de embeddings ajustado (1024 dims)
│   │   ├── chroma_db/           # Base de datos vectorial persistente ChromaDB (colección gpc_msp)
│   │   ├── history.db           # Base relacional SQLite (evaluaciones guardadas y salas de Ateneo)
│   │   ├── ft_dataset.json      # Dataset de entrenamiento con 480 tripletas clínicas (Query, Pos, Neg)
│   │   └── raw_pdfs/            # Archivos PDF normativos oficiales de las GPC del MSP Ecuador
│   ├── ingestion/
│   │   ├── pdf_extractor.py     # Extracción de texto plano conservando número de página (pypdf)
│   │   ├── chunker.py           # Segmentación contextual de máx. 1,000 caracteres sensible a secciones
│   │   ├── vectorize.py         # Generación de embeddings e indexación vectorial en ChromaDB
│   │   ├── run_ingestion.py     # Pipeline principal de ingesta masiva y chunks sembrados de respaldo
│   │   ├── create_ft_dataset.py # Algoritmo de generación de tripletas supervisadas para Fine-Tuning
│   │   ├── train_fine_tuning.py # Script de entrenamiento local mediante SentenceTransformers y MNRL
│   │   └── colab_fine_tuning.ipynb # Notebook Jupyter para entrenamiento supervisado en GPU Cloud T4
│   ├── models/
│   │   ├── schemas.py           # Modelos Pydantic (EvaluationResult, CitaNormativa, UserRole, etc.)
│   │   ├── clinical_case.py     # Gestor de lectura e instanciación de casos clínicos desde JSON
│   │   ├── history_db.py        # DAO para persistencia relacional en SQLite y algoritmos de analítica
│   │   └── room_session.py      # Gestor de salas sincrónicas colaborativas y analítica de consenso
│   ├── rag/
│   │   ├── retriever.py         # Motor de búsqueda vectorial denso con filtrado por guía y fallback
│   │   ├── prompt_builder.py    # Constructor de prompts estructurados y directivas multimodales
│   │   └── evaluator.py         # Cliente Gemini API, fallback defensivo y algoritmo de reparación de JSON
│   ├── routers/
│   │   ├── auth.py              # Endpoints de inicio de sesión, verificación de token y catálogo de usuarios
│   │   ├── cases.py             # Endpoints de consulta de casos clínicos activos
│   │   ├── evaluation.py        # Endpoint de evaluación RAG (soporta texto e imágenes multipart/form-data)
│   │   ├── history.py           # Endpoints de historial del estudiante y analítica de cohorte B2B
│   │   └── collaboration.py     # Endpoints de gestión y participación en salas de Ateneo sincrónicas
│   ├── tests/
│   │   ├── test_cases_fixture.json # Banco de 15 casos de prueba anotados con fragmento ideal
│   │   ├── run_metrics.py       # Runner de benchmark automatizado (Hit@1, validez JSON, latencia)
│   │   └── resultados_metricas.json # Reporte cuantitativo de salida del benchmark
│   ├── config.py                # Variables de entorno y resolución dinámica del modelo local
│   ├── main.py                  # Inicialización FastAPI, middleware CORS y precalentamiento asíncrono
│   ├── requirements.txt         # Lista estricta de dependencias Python
│   └── Dockerfile               # Configuración de contenedor Python 3.11-slim con PyTorch
├── docs/                        # Documentación técnica y académica detallada
│   ├── ARQUITECTURA_RAG_Y_FINE_TUNING.md # Especificación del RAG en 2 etapas, Transformer y MNRL
│   ├── GUIA_FINE_TUNING_COLAB_Y_METRICAS.md # Guía de entrenamiento en GPU T4 y benchmark empírico
│   ├── GUIA_INGESTA_Y_CASOS.md  # Especificación de esquemas Pydantic, API REST y SQLite
│   ├── METODOLOGIA_Y_REPRODUCIBILIDAD_EXPERIMENTALES.md # Protocolo de reproducibilidad y métricas
│   ├── DISCUSION_LIMITACIONES_Y_TRABAJO_FUTURO.md # Análisis crítico, limitaciones y líneas de desarrollo
│   └── PUBLICACION_Y_PRESENTACION_CONGRESO.md # Síntesis de hallazgos y guion de presentación ejecutiva
├── frontend/                    # Aplicación cliente React + Vite (SPA/PWA)
│   ├── public/                  # Favicon y assets estáticos de la PWA
│   ├── src/
│   │   ├── api/client.js        # Cliente Axios configurado con interceptor de Tokens Bearer JWT
│   │   ├── components/          # Componentes visuales (FeedbackCard, SkillRadarChart, Analytics)
│   │   ├── context/AuthContext.jsx # Proveedor global del estado de autenticación y sesión
│   │   ├── pages/               # Vistas principales (Login, CaseList, CaseSolve, AteneoRoom, Dashboards)
│   │   ├── App.jsx              # Router principal con rutas protegidas por RBAC
│   │   ├── main.jsx             # Punto de entrada de React 18 DOM
│   │   └── index.css            # Configuración de Tailwind CSS y fuentes tipográficas
│   ├── vite.config.js           # Configuración de Vite, proxy de desarrollo y plugin PWA
│   ├── package.json             # Dependencias de JavaScript (React, Tailwind, Recharts, Lucide)
│   └── Dockerfile               # Configuración de contenedor Nginx de producción para la SPA
├── docker-compose.yml           # Orquestación multicontenedor (Backend + Frontend) con soporte GPU
└── README.md                    # Documentación principal de entrada del proyecto
```

---

## 3. Instalación y Puesta en Marcha Local

### Prerrequisitos del Sistema
* **Python**: Versión `3.11.x` o superior.
* **Node.js**: Versión `18.x` o superior con `npm`.
* **API Key**: Clave activa de Google Gemini API (`GEMINI_API_KEY`).

---

### 3.1 Configuración e Inicio del Backend (FastAPI)

1. Posicionarse en el directorio `backend`:
   ```bash
   cd backend
   ```

2. Crear y activar el entorno virtual de Python:
   ```bash
   # En Windows:
   python -m venv venv
   .\venv\Scripts\activate

   # En Linux / macOS:
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Instalar las dependencias fijadas en [requirements.txt](backend/requirements.txt):
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Crear el archivo de configuración `.env` en la ruta `backend/.env`:
   ```env
   GEMINI_API_KEY=tu_clave_api_gemini_aqui
   GEMINI_MODEL=gemini-3.5-flash
   CHROMA_PERSIST_PATH=./data/chroma_db
   RAW_PDFS_PATH=./data/raw_pdfs
   CASES_FILE_PATH=./cases_data/cases.json
   JWT_SECRET_KEY=ateneo_clinical_rag_secret_key_2026_msp_ecuador
   ACCESS_TOKEN_EXPIRE_MINUTES=120
   ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
   ```

5. Iniciar el servidor backend en modo desarrollo:
   ```bash
   python main.py
   ```
   * **Servidor HTTP**: `http://localhost:8000`
   * **Documentación Interactiva OpenAPI (Swagger)**: `http://localhost:8000/docs`
   * **Verificación de Estado (Healthcheck)**: `http://localhost:8000/health`

---

### 3.2 Configuración e Inicio del Frontend (React + Vite)

1. Posicionarse en la carpeta `frontend`:
   ```bash
   cd frontend
   ```

2. Instalar los paquetes de Node.js:
   ```bash
   npm install
   ```

3. Ejecutar el servidor de desarrollo Vite:
   ```bash
   npm run dev
   ```
   * **Aplicación Web Cliente**: `http://localhost:5173`

---

## 4. Pipeline de Ingesta Vectorial y Fine-Tuning

### 4.1 Indexación de Guías de Práctica Clínica (PDFs)
Para incorporar nuevos documentos en formato PDF emitidos por el MSP Ecuador:
1. Colocar los archivos PDF dentro del directorio [backend/data/raw_pdfs/](backend/data/raw_pdfs).
2. Ejecutar la pipeline de extracción, chunking e indexación vectorial:
   ```bash
   cd backend
   python ingestion/run_ingestion.py
   ```

### 4.2 Recreación del Dataset y Ajuste Supervisado
1. Generar el dataset supervisado de 480 tripletas clínicas mediante [create_ft_dataset.py](backend/ingestion/create_ft_dataset.py):
   ```bash
   python ingestion/create_ft_dataset.py
   ```
2. Cargar el notebook [colab_fine_tuning.ipynb](backend/ingestion/colab_fine_tuning.ipynb) junto con el archivo [ft_dataset.json](backend/data/ft_dataset.json) en **Google Colab** configurado con aceleradora **NVIDIA GPU T4** (15.3 GB VRAM).
3. Tras completarse las 3 épocas (720 iteraciones), descargar el archivo resultante `ateneo-bge-m3-ecuador.zip` y descomprimirlo en:
   `backend/data/ateneo-bge-m3-ecuador/`

> ℹ️ **Resolución Automática del Modelo:** El archivo [config.py](backend/config.py) detecta si la carpeta `backend/data/ateneo-bge-m3-ecuador/` contiene los pesos compilados (`config.json`, `model.safetensors`). De existir, los carga automáticamente; en su ausencia, conmuta hacia el modelo base multilingüe `BAAI/bge-m3`.

---

## 5. Clonación, Migración y Despliegue en Otra Computadora

Los artefactos binarios pesados (los pesos de 2.27 GB del modelo y la base vectorial de ChromaDB) **no se guardan en el repositorio Git** para cumplir con las mejores prácticas de MLOps y los límites de GitHub (<100 MB). Todo el respaldo centralizado se encuentra en **Google Drive (`Mi unidad > Proyectos > Ateneo`)**.

### 5.1 Pasos para levantar el proyecto en una nueva máquina:
1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/JorgeDoicela/clinical_rag.git
   cd clinical_rag
   ```
2. **Restaurar los 2 artefactos desde tu Google Drive (`Proyectos > Ateneo`):**
   * **`Modelo entrenado.zip` (1.68 GB):** Descomprimir en `backend/data/ateneo-bge-m3-ecuador/` (Pesos calibrados con ventana de 1024 tokens).
   * **`chroma_db.zip` (63.61 MB):** Descomprimir en `backend/data/chroma_db/` (Base vectorial saneada con 5,944 fragmentos normativos del MSP, metadatos HNSW tipados con `PersistentData` y dimensión fija `dim=1024` para compatibilidad universal en Docker, Linux, Windows y macOS).
3. **Iniciar los servicios con Docker Compose:**
   ```bash
   docker compose up --build -d
   ```

### 5.2 Despliegue Estándar en CPU (Docker)
```bash
docker compose up --build -d
```

### 5.3 Despliegue con Aceleración Hardware por GPU NVIDIA
Si el servidor de despliegue posee tarjeta gráfica NVIDIA y la herramienta `nvidia-container-toolkit` instalada, el servicio backend aprovechará la GPU habilitando la sección `reservations` en [docker-compose.yml](docker-compose.yml):
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 14G
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

### 5.4 Ingesta Nativa Contenerizada (Recomendación de Producción)
Para prevenir errores de deserialización en ChromaDB causados por incompatibilidades entre esquemas de SQLite del Host (Windows/macOS) y Linux:
```bash
# 1. Detener el contenedor del backend
docker compose stop backend

# 2. Remover la base vectorial previa
rm -rf backend/data/chroma_db

# 3. Ejecutar la ingesta dentro del contenedor Linux
docker compose run --rm backend python ingestion/run_ingestion.py

# 4. Reiniciar los servicios
docker compose up -d
```

---

## 6. Validación de Métricas Benchmark y Búsqueda Híbrida

Para ejecutar el banco de pruebas cuantitativo que valida el rendimiento del sistema mediante Búsqueda Híbrida (Dense BGE-M3 + Sparse BM25 con Reciprocal Rank Fusion - RRF) y exportar automáticamente la tabla formal en LaTeX para el paper mediante [run_metrics.py](backend/tests/run_metrics.py):
```bash
cd backend
python tests/run_metrics.py
```

### Resumen de Métricas Obtenidas ([resultados_metricas.json](backend/tests/resultados_metricas.json) & [tabla_resultados_paper.tex](backend/tests/tabla_resultados_paper.tex))
* **Precisión de Recuperación Top-1 (Hit@1)**: **`100.0%`**
* **Precisión en Top-3 / Top-5 (Hit@3 / Hit@5)**: **`100.0%` / `100.0%`**
* **Mean Reciprocal Rank (MRR@5)**: **`1.0000`**
* **Normalized Discounted Cumulative Gain (NDCG@5)**: **`1.0000`**
* **Tasa de Validez de Salida JSON**: **`100.0%`** (15/15 convalidaciones Pydantic)
* **Latencia Mediana ($P_{50}$)**: **`7.73 s`** (Percentil 50)
* **Latencia Percentil 95 ($P_{95}$)**: **`14.50 s`**

---

## 7. Documentación Técnica Específica

Para revisar los detalles metodológicos profundos y la especificación completa del sistema, consultar los siguientes archivos en la carpeta `docs/`:

* [PROTOCOLO_A100_MLOPS_Y_GROUND_TRUTH.md](docs/PROTOCOLO_A100_MLOPS_Y_GROUND_TRUTH.md): Arquitectura MLOps en GPU NVIDIA A100, precisión BF16/TF32, contrato de datos de Ground Truth desacoplado y Fusión Recíproca de Rangos (RRF).
* [GUIA_PASO_A_PASO_ENTRENAMIENTO_Y_PROXIMOS_PASOS.md](docs/GUIA_PASO_A_PASO_ENTRENAMIENTO_Y_PROXIMOS_PASOS.md): Manual operativo paso a paso para ingesta acelerada en A100, generación de tablas LaTeX y migración en Docker.
* [ARQUITECTURA_RAG_Y_FINE_TUNING.md](docs/ARQUITECTURA_RAG_Y_FINE_TUNING.md): Especificación matemática de Búsqueda Híbrida RRF, Transformer bidireccional, pérdida MNRL, tablas Markdown y visor de PDFs.
* [GUIA_INGESTA_Y_CASOS.md](docs/GUIA_INGESTA_Y_CASOS.md): Esquemas de datos Pydantic, endpoints OpenAPI REST, organización por carpetas de año y visor modal.
* [METODOLOGIA_Y_REPRODUCIBILIDAD_EXPERIMENTALES.md](docs/METODOLOGIA_Y_REPRODUCIBILIDAD_EXPERIMENTALES.md): Protocolo de división de datos *Document-Level Out-of-Distribution*, prevención de *Data Leakage* y generador de tablas LaTeX para artículos científicos.
* [GUIA_FINE_TUNING_COLAB_Y_METRICAS.md](docs/GUIA_FINE_TUNING_COLAB_Y_METRICAS.md): Justificación matemática de Large Batch Size ($B=32$), pérdida MNRL y suite de pruebas del benchmark.
* [PUBLICACION_Y_PRESENTACION_CONGRESO.md](docs/PUBLICACION_Y_PRESENTACION_CONGRESO.md): Síntesis de hallazgos técnicos, Tablas I y II en LaTeX y guion de 10 diapositivas para congreso internacional.
* [CUANTIZACION_Y_DESPLIEGUE_AWS.md](docs/CUANTIZACION_Y_DESPLIEGUE_AWS.md): Cuantización ONNX/INT8, arquitectura serverless y despliegue elástico en AWS ECS/Fargate.
* [DISCUSION_LIMITACIONES_Y_TRABAJO_FUTURO.md](docs/DISCUSION_LIMITACIONES_Y_TRABAJO_FUTURO.md): Análisis crítico de resultados, discusión contra evaluadores zero-shot, limitaciones y trabajo futuro.
