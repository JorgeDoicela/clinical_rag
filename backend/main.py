from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from routers.cases import router as cases_router
from routers.evaluation import router as evaluation_router
from routers.auth import router as auth_router
from routers.history import router as history_router
from routers.collaboration import router as collaboration_router

app = FastAPI(
    title="Ateneo API - Evaluación del Razonamiento Clínico mediante RAG",
    description="Sistema RAG para evaluación formativa de razonamiento clínico basado en GPCs del MSP Ecuador.",
    version="1.0.0"
)

allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")
allowed_origins = [origin.strip() for origin in allowed_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir imágenes estáticas de los casos clínicos
images_dir = os.path.join(os.path.dirname(__file__), "cases_data", "images")
os.makedirs(images_dir, exist_ok=True)
app.mount("/static/images", StaticFiles(directory=images_dir), name="static_images")

app.include_router(auth_router, prefix="/api")
app.include_router(cases_router)
app.include_router(evaluation_router)
app.include_router(history_router)
app.include_router(collaboration_router)


@app.on_event("startup")
async def startup_event():
    print("[STARTUP] Servidor FastAPI de Ateneo iniciado correctamente.", flush=True)
    # Precargar el modelo en segundo plano asíncrono para no bloquear la disponibilidad de la API
    import asyncio
    def _preload():
        try:
            from rag.retriever import get_embedding_model
            get_embedding_model()
        except Exception as e:
            print(f"[STARTUP] Error al precargar modelo: {e}", flush=True)
    asyncio.create_task(asyncio.to_thread(_preload))

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "project": "Ateneo", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
