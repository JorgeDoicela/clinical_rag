import os
os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["CHROMA_TELEMETRY"] = "False"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from core.middleware import CorrelationIdMiddleware
from core.errors import (
    http_exception_handler,
    validation_exception_handler,
    unhandled_exception_handler
)

from routers.cases import router as cases_router
from routers.evaluation import router as evaluation_router
from routers.auth import router as auth_router
from routers.history import router as history_router
from routers.collaboration import router as collaboration_router
from routers.adaptive import router as adaptive_router

from contextlib import asynccontextmanager
from core.config import settings
from core.database import init_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[STARTUP] Inicializando base de datos relacional (SQLAlchemy)...", flush=True)
    init_database()
    print("[STARTUP] Servidor FastAPI de Ateneo iniciado correctamente.", flush=True)
    import asyncio
    def _preload():
        try:
            from rag.retriever import get_embedding_model
            get_embedding_model()
        except Exception as e:
            print(f"[STARTUP] Error al precargar modelo: {e}", flush=True)
    asyncio.create_task(asyncio.to_thread(_preload))
    yield

app = FastAPI(
    title="Ateneo API - Evaluación del Razonamiento Clínico mediante RAG",
    description="Sistema RAG para evaluación formativa de razonamiento clínico basado en GPCs del MSP Ecuador.",
    version="1.0.0",
    lifespan=lifespan
)


# Configuración de CORS según AppSettings
_open_cors = settings.allowed_origins == ["*"]

if _open_cors:
    _allow_origins = []
    _origin_regex = r"^https?://.*"
else:
    _static_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
    _extra = [o for o in settings.allowed_origins if o != "*"]
    _allow_origins = list(set(_static_origins + _extra))
    _origin_regex = r"^https?://192\.168\.[0-9]+\.[0-9]+:[0-9]+$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_origin_regex=_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(CorrelationIdMiddleware)

# Estandarización de errores conforme a RFC 7807 (Problem Details)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# Servir imágenes estáticas de los casos clínicos
images_dir = os.path.join(os.path.dirname(__file__), "cases_data", "images")
os.makedirs(images_dir, exist_ok=True)
app.mount("/static/images", StaticFiles(directory=images_dir), name="static_images")

# Servir PDFs oficiales de las GPC del MSP para el Visor Integrado
pdfs_dir = os.path.join(os.path.dirname(__file__), "data", "raw_pdfs")
os.makedirs(pdfs_dir, exist_ok=True)
app.mount("/static/pdfs", StaticFiles(directory=pdfs_dir), name="static_pdfs")

app.include_router(auth_router, prefix="/api")
app.include_router(cases_router)
app.include_router(evaluation_router)
app.include_router(history_router)
app.include_router(collaboration_router)
app.include_router(adaptive_router)




@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "project": "Ateneo", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
