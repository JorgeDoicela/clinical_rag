"""
Rate Limiting Defensivo y Gestión de Cuotas de Inferencia para Ateneo+ API.
Implementa el algoritmo Sliding Window en memoria con soporte de cabeceras RFC estándar:
X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset y Retry-After.
Protege contra saturación de cuotas en Google Gemini y denegación de servicio.
"""
import time
import math
import logging
import threading
from typing import Dict, List, Tuple, Optional
from fastapi import Request, Response, HTTPException, status
from core.config import settings
from core.security import decode_access_token

logger = logging.getLogger("ateneo.rate_limiter")


class SlidingWindowRateLimiter:
    """
    Gestor de ventana deslizante thread-safe para control de tasa y cuotas.
    Mantiene registros temporales discretos para cada identificador de cliente.
    """
    def __init__(self):
        self._history: Dict[str, List[float]] = {}
        self._lock = threading.Lock()

    def check_and_record(
        self,
        key: str,
        limit: int,
        window_seconds: int
    ) -> Tuple[bool, int, int, int]:
        """
        Evalúa si la solicitud está permitida dentro de la ventana deslizante actual.
        Retorna:
            (allowed: bool, limit: int, remaining: int, reset_seconds: int)
        """
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            timestamps = self._history.get(key, [])
            # Limpiar marcas de tiempo expiradas fuera de la ventana
            valid_timestamps = [t for t in timestamps if t > window_start]

            if len(valid_timestamps) >= limit:
                # Cuota excedida: calcular tiempo para expiración del evento más antiguo
                oldest = valid_timestamps[0]
                reset_seconds = max(1, math.ceil(oldest + window_seconds - now))
                remaining = 0
                self._history[key] = valid_timestamps
                return False, limit, remaining, reset_seconds

            # Petición aceptada: registrar nueva marca
            valid_timestamps.append(now)
            self._history[key] = valid_timestamps
            remaining = max(0, limit - len(valid_timestamps))
            reset_seconds = max(1, math.ceil(valid_timestamps[0] + window_seconds - now))
            return True, limit, remaining, reset_seconds

    def clear(self) -> None:
        """Limpia todo el historial en memoria (utilizado para tests unitarios)."""
        with self._lock:
            self._history.clear()


# Instancia singleton global del limitador en memoria
global_rate_limiter = SlidingWindowRateLimiter()


def resolve_client_key(request: Request) -> str:
    """
    Extrae la identidad del cliente priorizando el usuario autenticado (JWT)
    y utilizando la IP de origen como contingencia para clientes anónimos.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            return f"usr:{payload['sub']}"
        elif payload and "user_id" in payload:
            return f"usr:{payload['user_id']}"

    # Fallback a IP del cliente
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "anonymous"

    return f"ip:{client_ip}"


class RateLimitGuard:
    """
    Guardia de inyección de dependencias para rutas FastAPI.
    Valida la cuota del cliente e inyecta las cabeceras estándar en la respuesta.
    """
    def __init__(
        self,
        limit: int,
        window_seconds: int = 60,
        name: str = "general",
        limiter: Optional[SlidingWindowRateLimiter] = None
    ):
        self.limit = limit
        self.window_seconds = window_seconds
        self.name = name
        self.limiter = limiter or global_rate_limiter

    async def __call__(self, request: Request, response: Response) -> None:
        if not settings.rate_limit_enabled:
            return

        client_id = resolve_client_key(request)
        rate_key = f"{self.name}:{client_id}"

        allowed, limit, remaining, reset_seconds = self.limiter.check_and_record(
            key=rate_key,
            limit=self.limit,
            window_seconds=self.window_seconds
        )

        # Inyectar cabeceras estándar en la respuesta y registrar en request.state
        rate_headers = {
            "X-RateLimit-Limit": str(limit),
            "X-RateLimit-Remaining": str(remaining),
            "X-RateLimit-Reset": str(reset_seconds),
        }
        for k, v in rate_headers.items():
            response.headers[k] = v
        request.state.rate_limit_headers = rate_headers

        if not allowed:
            logger.warning(
                "[RateLimit] Límite excedido para '%s' en grupo '%s'. Cuota: %d/%ds. Reset en %ds.",
                client_id, self.name, limit, self.window_seconds, reset_seconds
            )
            error_headers = {
                "Retry-After": str(reset_seconds),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(reset_seconds),
            }
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Cuota de peticiones excedida ({self.name}). Límite permitido: {limit} solicitudes por cada {self.window_seconds} segundos. Intente nuevamente en {reset_seconds}s.",
                headers=error_headers
            )


# Guardias canónicos de infraestructura
rate_limit_inference = RateLimitGuard(
    limit=settings.rate_limit_inference_per_minute,
    window_seconds=60,
    name="inferencia_ia"
)

rate_limit_export = RateLimitGuard(
    limit=15,
    window_seconds=60,
    name="exportacion_pdf"
)

rate_limit_standard = RateLimitGuard(
    limit=settings.rate_limit_requests_per_minute,
    window_seconds=60,
    name="general"
)
