"""
Manejador centralizado de errores estandarizados bajo la especificación RFC 7807 (Problem Details).
Provee respuestas semánticas homogéneas, preservando total retrocompatibilidad con la clave 'detail'.
"""
import datetime
import logging
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from core.middleware import get_current_request_id

logger = logging.getLogger("ateneo.errors")


class ProblemDetails(BaseModel):
    """Esquema de error estructurado conforme a RFC 7807."""
    type: str = Field(default="about:blank", description="URI de referencia al tipo de problema")
    title: str = Field(..., description="Resumen breve y legible del problema")
    status: int = Field(..., description="Código de estado HTTP")
    detail: str = Field(..., description="Explicación detallada del error específico")
    instance: Optional[str] = Field(None, description="URI relativa del endpoint que originó la falla")
    request_id: Optional[str] = Field(None, description="Identificador único de correlación de la solicitud")
    timestamp: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    invalid_params: Optional[List[Dict[str, Any]]] = Field(None, description="Detalle de validaciones fallidas en DTOs")


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Maneja excepciones HTTP explícitas de FastAPI / Starlette."""
    request_id = get_current_request_id()
    problem = ProblemDetails(
        type=f"https://ateneo.edu.ec/errors/http-{exc.status_code}",
        title=_get_http_title(exc.status_code),
        status=exc.status_code,
        detail=str(exc.detail),
        instance=request.url.path,
        request_id=request_id
    )
    
    headers = getattr(exc, "headers", None) or {}
    if request_id:
        headers["X-Request-ID"] = request_id

    return JSONResponse(
        status_code=exc.status_code,
        content=problem.model_dump(exclude_none=True),
        headers=headers
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Maneja errores de validación de esquemas Pydantic (HTTP 422)."""
    request_id = get_current_request_id()
    
    invalid_params = []
    for err in exc.errors():
        loc = " -> ".join(str(p) for p in err.get("loc", []))
        invalid_params.append({
            "param": loc,
            "msg": err.get("msg", "Valor inválido"),
            "type": err.get("type", "value_error")
        })

    problem = ProblemDetails(
        type="https://ateneo.edu.ec/errors/validation-error",
        title="Unprocessable Entity",
        status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="Los datos proporcionados en la solicitud no cumplen con el contrato de validación.",
        instance=request.url.path,
        request_id=request_id,
        invalid_params=invalid_params
    )

    headers = {"X-Request-ID": request_id} if request_id else {}
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=problem.model_dump(exclude_none=True),
        headers=headers
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Captura fallas no controladas (HTTP 500) registrando trazabilidad completa."""
    request_id = get_current_request_id()
    logger.exception("Falla no controlada en [%s %s] (Request ID: %s): %s", 
                     request.method, request.url.path, request_id, str(exc))

    problem = ProblemDetails(
        type="https://ateneo.edu.ec/errors/internal-server-error",
        title="Internal Server Error",
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Ocurrió un error inesperado al procesar la solicitud en el servidor clínico.",
        instance=request.url.path,
        request_id=request_id
    )

    headers = {"X-Request-ID": request_id} if request_id else {}
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=problem.model_dump(exclude_none=True),
        headers=headers
    )


def _get_http_title(status_code: int) -> str:
    """Retorna un título canónico según el código de estado HTTP."""
    titles = {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        405: "Method Not Allowed",
        409: "Conflict",
        422: "Unprocessable Entity",
        500: "Internal Server Error",
        502: "Bad Gateway",
        503: "Service Unavailable",
        504: "Gateway Timeout"
    }
    return titles.get(status_code, "HTTP Error")
