"""
Middleware transversal de observabilidad, correlación de peticiones y métricas de procesamiento.
Asigna un identificador único X-Request-ID por cada solicitud HTTP para trazabilidad extremo a extremo.
"""
import time
import uuid
import contextvars
from typing import Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Variable de contexto asíncrono para correlación de logs
request_id_ctx: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("request_id", default=None)


def get_current_request_id() -> Optional[str]:
    """Retorna el ID de correlación de la petición actual."""
    return request_id_ctx.get()


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Middleware de trazabilidad:
    1. Extrae o genera un X-Request-ID criptográficamente único por petición.
    2. Lo expone en contextvars para enriquecimiento de logging estructurado.
    3. Inyecta X-Request-ID y X-Process-Time en las cabeceras de respuesta HTTP.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Extraer ID entrante o generar uno nuevo
        incoming_id = request.headers.get("X-Request-ID")
        request_id = incoming_id if incoming_id and len(incoming_id.strip()) > 0 else uuid.uuid4().hex
        
        # Almacenar en contexto de ejecución asíncrono
        token = request_id_ctx.set(request_id)
        start_time = time.perf_counter()

        try:
            response: Response = await call_next(request)
            process_time = time.perf_counter() - start_time
            
            # Inyectar cabeceras estándar de trazabilidad
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{process_time:.4f}s"
            return response
        finally:
            request_id_ctx.reset(token)
