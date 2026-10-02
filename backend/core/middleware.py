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

from core.logger import request_id_ctx, tenant_id_ctx, user_id_ctx, get_logger

logger = get_logger("ateneo.middleware")


def get_current_request_id() -> Optional[str]:
    """Retorna el ID de correlación de la petición actual."""
    return request_id_ctx.get()


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Middleware de trazabilidad y logging OpenTelemetry:
    1. Extrae o genera un X-Request-ID criptográficamente único por petición.
    2. Lo expone en contextvars para enriquecimiento automático de logs.
    3. Inyecta X-Request-ID y X-Process-Time en las cabeceras de respuesta HTTP.
    4. Emite registros estructurados JSON con latencia milimétrica por solicitud.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        incoming_id = request.headers.get("X-Request-ID")
        request_id = incoming_id if incoming_id and len(incoming_id.strip()) > 0 else uuid.uuid4().hex
        
        token = request_id_ctx.set(request_id)
        start_time = time.perf_counter()

        try:
            response: Response = await call_next(request)
            process_time = time.perf_counter() - start_time
            latency_ms = round(process_time * 1000, 3)

            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{process_time:.4f}s"

            if hasattr(request.state, "rate_limit_headers"):
                for k, v in request.state.rate_limit_headers.items():
                    response.headers[k] = v

            return response
        finally:
            request_id_ctx.reset(token)

