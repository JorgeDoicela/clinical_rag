import time
import datetime
import psutil
from typing import Dict, Any, Optional
from fastapi import APIRouter, Response, status
from sqlalchemy import text

from core.config import settings
from core.database import engine
from core.llm_gateway import llm_gateway

router = APIRouter(prefix="/health", tags=["Observabilidad y Salud"])

_PROCESS_START_TIME = time.time()
_CHROMA_CLIENT_INSTANCE = None


def _get_chroma_client():
    global _CHROMA_CLIENT_INSTANCE
    if _CHROMA_CLIENT_INSTANCE is None:
        import chromadb
        _CHROMA_CLIENT_INSTANCE = chromadb.PersistentClient(
            path=settings.chroma_persist_path,
            settings=chromadb.config.Settings(
                anonymized_telemetry=False,
                chroma_product_telemetry_impl="rag.chroma_telemetry.NoOpProductTelemetry"
            )
        )
    return _CHROMA_CLIENT_INSTANCE


@router.get("", summary="Estado general del servicio", status_code=status.HTTP_200_OK)
@router.get("/", include_in_schema=False)
async def health_root():
    """
    Endpoint de compatibilidad que retorna el estado general del backend
    y la lista de sondas especializadas de observabilidad.
    """
    return {
        "status": "ok",
        "project": "Ateneo",
        "version": "1.0.0",
        "probes": {
            "live": "/health/live",
            "ready": "/health/ready",
            "circuit_breakers": "/health/circuit-breakers"
        }
    }


@router.get("/live", summary="Liveness Probe", status_code=status.HTTP_200_OK)
async def liveness_probe():
    """
    Liveness probe de respuesta ultrarrápida.
    Verifica que el proceso de FastAPI está vivo y atendiendo solicitudes HTTP.
    """
    uptime = round(time.time() - _PROCESS_START_TIME, 2)
    return {
        "status": "healthy",
        "service": "ateneo-backend",
        "uptime_seconds": uptime,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "version": "1.0.0"
    }


@router.get("/ready", summary="Readiness Probe Activa")
async def readiness_probe(response: Response):
    """
    Readiness probe activa que audita:
    1. Conexión relacional a la base de datos (SELECT 1).
    2. Disponibilidad del almacén vectorial ChromaDB y conteo de documentos GPC.
    3. Memoria disponible del sistema host.

    Si algún recurso crítico falla, retorna HTTP 503 con el detalle del subsistema inoperativo.
    En condiciones normales, responde HTTP 200 en menos de 30 ms.
    """
    check_t0 = time.perf_counter()

    # 1. Auditoría Base de Datos Relacional
    db_healthy = True
    db_latency_ms = 0.0
    db_error: Optional[str] = None
    t_db = time.perf_counter()
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_latency_ms = round((time.perf_counter() - t_db) * 1000, 2)
    except Exception as exc:
        db_healthy = False
        db_latency_ms = round((time.perf_counter() - t_db) * 1000, 2)
        db_error = str(exc)

    # 2. Auditoría Base de Datos Vectorial (ChromaDB)
    chroma_healthy = True
    chroma_latency_ms = 0.0
    chroma_error: Optional[str] = None
    collections_count = 0
    documents_count = 0
    t_chroma = time.perf_counter()
    try:
        client = _get_chroma_client()
        client.heartbeat()
        collections = client.list_collections()
        collections_count = len(collections)
        try:
            gpc_col = client.get_collection(settings.chroma_collection_name)
            documents_count = gpc_col.count()
        except Exception:
            documents_count = 0
        chroma_latency_ms = round((time.perf_counter() - t_chroma) * 1000, 2)
    except Exception as exc:
        chroma_healthy = False
        chroma_latency_ms = round((time.perf_counter() - t_chroma) * 1000, 2)
        chroma_error = str(exc)

    # 3. Auditoría de Memoria del Sistema
    mem = psutil.virtual_memory()
    memory_status = "healthy" if mem.percent < 95.0 else "warning"
    memory_report = {
        "status": memory_status,
        "total_mb": round(mem.total / (1024 * 1024), 2),
        "available_mb": round(mem.available / (1024 * 1024), 2),
        "used_percent": mem.percent
    }

    total_latency_ms = round((time.perf_counter() - check_t0) * 1000, 2)
    is_ready = db_healthy and chroma_healthy

    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    db_engine_name = "sqlite" if settings.is_sqlite else "postgresql"

    return {
        "status": "ready" if is_ready else "unhealthy",
        "total_latency_ms": total_latency_ms,
        "checks": {
            "database": {
                "status": "healthy" if db_healthy else "unhealthy",
                "engine": db_engine_name,
                "latency_ms": db_latency_ms,
                "error": db_error
            },
            "vector_store": {
                "status": "healthy" if chroma_healthy else "unhealthy",
                "type": "chromadb",
                "latency_ms": chroma_latency_ms,
                "collections_count": collections_count,
                "documents_count": documents_count,
                "error": chroma_error
            },
            "system_memory": memory_report
        },
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }


@router.get("/circuit-breakers", summary="Estado de Circuit Breakers LLM", status_code=status.HTTP_200_OK)
async def circuit_breakers_probe():
    """
    Retorna el estado operativo de los disyuntores (Circuit Breakers) del LLM Gateway
    para cada modelo de la jerarquía de fallback, incluyendo timestamps de cooldown.
    """
    cb_status = llm_gateway.get_circuit_breakers_status()
    cb_status["timestamp"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return cb_status
