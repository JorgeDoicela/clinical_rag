# Ateneo - Evaluación del Razonamiento Clínico mediante RAG

**Ateneo** es un sistema inteligente y formativo diseñado para evaluar el razonamiento diagnóstico y terapéutico de estudiantes de ciencias de la salud, comparando sus respuestas contra las Guías de Práctica Clínica (GPC) oficiales del Ministerio de Salud Pública (MSP) del Ecuador.

## Arquitectura Técnica

- **Backend:** FastAPI (Python 3.11), Pydantic v2, ChromaDB (Vector Store local).
- **Embeddings:** `BAAI/bge-m3` (SentenceTransformers, soporte multi-idioma de hasta 8192 tokens).
- **LLM Evaluador:** Google Gemini API (`google-genai` / `gemini-2.5-flash`) con salida JSON estructurada forzada.
- **Frontend / PWA:** React + Vite, Vanilla/Tailwind CSS, `vite-plugin-pwa`.

## Instalación y Ejecución Local

### 1. Clonar y Configurar Entorno
```bash
cp .env.example backend/.env
# Editar backend/.env y colocar tu GEMINI_API_KEY
```

### 2. Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Ingesta de GPC en ChromaDB
```bash
# Coloca tus PDFs en backend/data/raw_pdfs/ y ejecuta:
python ingestion/run_ingestion.py
```

### 4. Frontend (React PWA)
```bash
cd frontend
npm install
npm run dev
```

### 5. Ejecutar Evaluación de Métricas de Reproducibilidad
```bash
cd backend
python tests/run_metrics.py
```
