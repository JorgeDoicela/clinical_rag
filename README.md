# Ateneo: Plataforma de Evaluación del Razonamiento Clínico mediante RAG y GPC del MSP Ecuador

**Ateneo** es una plataforma de software diseñada para la evaluación formativa y cuantitativa del razonamiento clínico (diagnóstico, terapéutico, preventivo y de seguimiento) en estudiantes de ciencias de la salud. El sistema contrasta de forma automatizada las respuestas en lenguaje natural contra el cuerpo normativo de las Guías de Práctica Clínica (GPC) del Ministerio de Salud Pública (MSP) del Ecuador, utilizando una arquitectura de Recuperación Aumentada por Generación (RAG) en dos etapas y un modelo recuperador supervisado mediante Fine-Tuning.

---

## 1. Especificaciones Técnicas del Sistema

| Componente | Tecnología / Librería | Versión | Función en el Sistema |
| :--- | :--- | :--- | :--- |
| **Backend Core** | FastAPI / Python | `0.115.6` / `3.11` | API REST, enrutamiento, controladores y middlewares. |
| **Validación de Datos** | Pydantic | `2.10.4` | Esquemas de entrada/salida, tipado estricto y normalizadores. |
| **Base Vectorial** | ChromaDB | `0.6.3` | Almacenamiento persistente de vectores densos con distancia coseno. |
| **Embeddings Base** | `BAAI/bge-m3` | `SentenceTransformers 3.3.1` | Encoder denso de 1024 dimensiones y 8,192 tokens de contexto. |
| **Modelo Fine-Tuned** | `ateneo-bge-m3-ecuador` | Local / Custom | Modelo ajustado con 480 tripletas clínicas del MSP Ecuador. |
| **Evaluador LLM** | Google Gemini API | `google-genai 0.1.0+` | Invocación multimodal (`gemini-3.5-flash` / `gemini-2.5-flash`). |
| **Persistencia SQL** | SQLite3 | Native | Historial de evaluaciones, analítica B2B y salas colaborativas. |
| **Seguridad / Auth** | PyJWT / Passlib | `2.13.0` / `1.7.4` | Autenticación JWT (HS256) y hashing PBKDF2/bcrypt. |
| **Frontend UI** | React / Vite | `18.3.1` / `6.0.5` | SPA/PWA con enrutamiento de React Router v6. |
| **Estilos & Iconos** | Tailwind CSS / Lucide | `3.4.17` / `0.469.0` | Sistema de diseño minimalista e iconografía vectorial plana. |

---

## 2. Estructura de Directorios del Proyecto

```text
clinical_rag/
├── backend/
│   ├── auth/              # Autenticación JWT, verificación de hash y roles RBAC (security.py)
│   ├── cases_data/        # Definición de casos clínicos (cases.json) e imágenes estáticas (images/)
│   ├── data/              # Base de datos SQLite (history.db), ChromaDB y pesos del modelo ajustado
│   ├── ingestion/         # Extracción PDF, chunker, creación de dataset y scripts de fine-tuning
│   ├── models/            # Esquemas Pydantic (schemas.py), modelos de casos, historial y salas
│   ├── rag/               # Motor recuperador (retriever.py), constructor de prompts y evaluador LLM
│   ├── routers/           # Controladores API REST (auth, cases, evaluation, history, collaboration)
│   ├── tests/             # Suite de métricas automatizadas (run_metrics.py y test_cases_fixture.json)
│   ├── config.py          # Configuración de variables de entorno y resolución de modelos
│   ├── main.py            # Inicialización de FastAPI, CORS, rutas estáticas y eventos de startup
│   └── requirements.txt   # Dependencias de Python fijadas
├── docs/                  # Documentación técnica y científica del proyecto
│   ├── ARQUITECTURA_RAG_Y_FINE_TUNING.md
│   ├── DESIGN_SYSTEM.md
│   ├── GUIA_FINE_TUNING_COLAB_Y_METRICAS.md
│   └── GUIA_INGESTA_Y_CASOS.md
├── frontend/              # Aplicación cliente React + Vite (PWA)
│   ├── src/
│   │   ├── api/           # Cliente HTTP Axios/Fetch (client.js)
│   │   ├── components/    # Componentes reutilizables de feedback, gráficas y loaders
│   │   ├── context/       # Estado global de autenticación (AuthContext.jsx)
│   │   ├── pages/         # Vistas de la aplicación (Login, CaseList, CaseSolve, AteneoRoom, etc.)
│   │   ├── App.jsx        # Enrutador principal y barra de navegación
│   │   └── main.jsx       # Punto de entrada de React DOM
│   └── vite.config.js     # Configuración de Vite, Proxy API y plugin PWA
├── docker-compose.yml     # Orquestación de contenedores Docker con passthrough de GPU NVIDIA
└── README.md
```

---

## 3. Instalación y Puesta en Marcha Local

### Prerrequisitos
- Python 3.11 o superior.
- Node.js 18.x o superior con npm.
- Clave de API activa de Google Gemini (`GEMINI_API_KEY`).

### 3.1 Configuración del Entorno Backend
1. Clonar el repositorio y navegar a la carpeta del backend:
   ```bash
   cd backend
   ```
2. Crear y activar un entorno virtual de Python:
   ```bash
   python -m venv venv
   # En Windows:
   .\venv\Scripts\activate
   # En Linux/macOS:
   source venv/bin/activate
   ```
3. Instalar dependencias:
   ```bash
   pip install -r requirements.txt
   ```
4. Configurar el archivo de entorno `.env` en `backend/.env`:
   ```env
   GEMINI_API_KEY=tu_clave_api_gemini_aqui
   GEMINI_MODEL=gemini-2.5-flash
   CHROMA_PERSIST_PATH=./data/chroma_db
   RAW_PDFS_PATH=./data/raw_pdfs
   CASES_FILE_PATH=./cases_data/cases.json
   ```
5. Iniciar el servidor backend:
   ```bash
   python main.py
   ```
   El backend iniciará en `http://localhost:8000` (documentación Swagger disponible en `http://localhost:8000/docs`).

### 3.2 Configuración del Entorno Frontend
1. En una nueva terminal, navegar al directorio `frontend`:
   ```bash
   cd frontend
   ```
2. Instalar dependencias de Node:
   ```bash
   npm install
   ```
3. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   El frontend estará disponible en `http://localhost:5173`.

---

## 4. Pipeline de Datos y Fine-Tuning

### 4.1 Ingesta Vectorial
Para procesar nuevos documentos PDF de las GPC:
1. Colocar los archivos PDF en `backend/data/raw_pdfs/`.
2. Ejecutar la pipeline de ingesta:
   ```bash
   cd backend
   python ingestion/run_ingestion.py
   ```

### 4.2 Generación de Dataset y Fine-Tuning
1. Generar el dataset de 480 tripletas clínicas:
   ```bash
   python ingestion/create_ft_dataset.py
   ```
2. Cargar el notebook `backend/ingestion/colab_fine_tuning.ipynb` y el archivo `backend/data/ft_dataset.json` en Google Colab con aceleradora GPU T4 (`batch_size=2`, `max_seq_length=512`, `epochs=3`).
3. Descargar el archivo resultante `ateneo-bge-m3-ecuador.zip` y extraerlo en `backend/data/ateneo-bge-m3-ecuador/`.

---

## 5. Despliegue en Cualquier Otra Computadora (Paso a Paso)

Para desplegar y correr **Ateneo** en una computadora nueva (con o sin GPU NVIDIA), sigue este procedimiento:

### Paso 5.1: Preparar la Carpeta del Modelo Fine-Tuned
1. Asegúrate de tener los pesos del modelo ajustado extraídos en:
   `backend/data/ateneo-bge-m3-ecuador/`
2. Debe contener el archivo `config.json`, `model.safetensors`, `tokenizer.json`, etc.
> ℹ️ **Resolución Automática:** Si la carpeta `ateneo-bge-m3-ecuador` existe, el backend utilizará tu modelo ajustado automáticamente. Si no existe, el sistema conmutará defensivamente al modelo base `BAAI/bge-m3` de HuggingFace.

### Paso 5.2: Colocar las Guías de Práctica Clínica (PDFs)
Coloca los archivos PDF normativos del MSP Ecuador en:
`backend/data/raw_pdfs/`

### Paso 5.3: Configurar Variables de Entorno
Crea o edita el archivo `backend/.env` con tu clave de API de Gemini:
```env
GEMINI_API_KEY=tu_clave_api_gemini_aqui
GEMINI_MODEL=gemini-3.5-flash
CHROMA_PERSIST_PATH=./data/chroma_db
RAW_PDFS_PATH=./data/raw_pdfs
CASES_FILE_PATH=./cases_data/cases.json
```

### Paso 5.4: Indexación Vectorial Inicial
Ejecuta la ingesta para poblar la base vectorial ChromaDB con las representaciones del modelo ajustado:
```bash
# En Windows (usando el lanzador py):
py backend/ingestion/run_ingestion.py

# En Linux / macOS:
python3 backend/ingestion/run_ingestion.py
```

### Paso 5.5: Despliegue con Docker Compose

#### A) En equipos con CPU (Por defecto)
Simplemente ejecuta desde la raíz del proyecto:
```bash
docker compose up --build
```

#### B) En equipos con GPU NVIDIA y `nvidia-container-toolkit`
Si la nueva PC cuenta con tarjeta gráfica NVIDIA y soporte de GPU en Docker, puedes activar el passthrough de GPU agregando el bloque `reservations` bajo `deploy.resources` en [docker-compose.yml](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/docker-compose.yml):
```yaml
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

### Paso 5.6: Acceso a la Plataforma
* **Aplicación Web (PWA):** `http://localhost:5173`
* **Swagger API Docs:** `http://localhost:8000/docs`
* **Healthcheck:** `http://localhost:8000/health`

### Paso 5.7: Ingesta Nativa en Docker (Recomendación de Producción)
Para evitar incompatibilidades de esquemas entre el sistema operativo host (Windows/macOS) y los contenedores Linux en `ChromaDB` (errores de deserialización `KeyError: '_type'`), se recomienda ejecutar la ingesta nativa directamente dentro de la imagen de Docker:
```bash
# 1. Detener servicios activos
docker compose stop backend

# 2. Eliminar carpeta vectorial previa
rm -rf backend/data/chroma_db

# 3. Ejecutar ingesta nativa limpia en contenedor aislado
docker compose run --rm backend python ingestion/run_ingestion.py

# 4. Iniciar la aplicación
docker compose up -d
```

---

## 6. Validación de Métricas Benchmark

Para ejecutar el banco de pruebas automatizado de latencia, precisión de retrieval y salida JSON:
```bash
py backend/tests/run_metrics.py
```
El informe detallado de rendimiento se guardará en `backend/tests/resultados_metricas.json`.

---

## 7. Documentación Adicional

La especificación completa del sistema se encuentra dividida en los siguientes documentos técnicos en la carpeta `docs/`:
- [ARQUITECTURA_RAG_Y_FINE_TUNING.md](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/docs/ARQUITECTURA_RAG_Y_FINE_TUNING.md): Explicación detallada de la arquitectura RAG, función de pérdida MNRL y parser JSON.
- [GUIA_INGESTA_Y_CASOS.md](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/docs/GUIA_INGESTA_Y_CASOS.md): Especificación de esquemas de datos, API REST, SQLite e imágenes multimodales.
- [GUIA_FINE_TUNING_COLAB_Y_METRICAS.md](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/docs/GUIA_FINE_TUNING_COLAB_Y_METRICAS.md): Guía de entrenamiento en GPU cloud, memoria VRAM y resultados del benchmark.
- [DESIGN_SYSTEM.md](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/docs/DESIGN_SYSTEM.md): Tokens del sistema de diseño, componentes UI/UX y configuración PWA.
