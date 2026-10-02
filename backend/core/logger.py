"""
Sistema de Logging Estructurado OpenTelemetry & Observabilidad Institucional (Ateneo+).
Provee formateo JSON estandarizado (JSON-Lines), enmascaramiento automático de secretos y datos sensibles,
correlación transversal mediante request_id, user_id y tenant_id, y métricas de latencia por acción.
"""

import sys
import os
import re
import json
import logging
import datetime
import contextvars
from typing import Any, Dict, Optional

# Variables de contexto asíncrono para trazabilidad distribuida
request_id_ctx: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("request_id", default=None)
user_id_ctx: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("user_id", default=None)
tenant_id_ctx: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("tenant_id", default=None)

# Patrones compilados para ofuscación y enmascaramiento de seguridad
SENSITIVE_KEYS = {
    "password", "contrasena", "contraseña", "passwd", "token", "access_token",
    "refresh_token", "secret", "secret_key", "jwt_secret_key", "api_key",
    "gemini_api_key", "authorization", "bearer"
}

BEARER_PATTERN = re.compile(r'(Bearer\s+)[A-Za-z0-9\-\._~\+\/]+=*', re.IGNORECASE)
GEMINI_KEY_PATTERN = re.compile(r'AIza[0-9A-Za-z-_]{20,}')


def redact_sensitive_data(data: Any) -> Any:
    """
    Enmascara recursivamente credenciales, tokens y llaves criptográficas
    en cadenas, diccionarios y listas para prevenir fugas en agregadores de logs.
    """
    if isinstance(data, str):
        masked = BEARER_PATTERN.sub(r'\1[REDACTED_JWT_TOKEN]', data)
        masked = GEMINI_KEY_PATTERN.sub('AIza[REDACTED_API_KEY]', masked)
        return masked
    elif isinstance(data, dict):
        sanitized = {}
        for k, v in data.items():
            if str(k).lower() in SENSITIVE_KEYS:
                sanitized[k] = "[REDACTED_SECRET]"
            else:
                sanitized[k] = redact_sensitive_data(v)
        return sanitized
    elif isinstance(data, list):
        return [redact_sensitive_data(item) for item in data]
    return data


class StructuredJsonFormatter(logging.Formatter):
    """
    Formateador de logs a JSON estructurado según el estándar OpenTelemetry / 12-Factor App.
    Compatible con Datadog, Grafana Loki, CloudWatch y Elasticsearch.
    """

    def format(self, record: logging.LogRecord) -> str:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        # Enmascarar mensaje principal
        raw_msg = record.getMessage()
        sanitized_msg = redact_sensitive_data(raw_msg)

        payload: Dict[str, Any] = {
            "timestamp": now,
            "level": record.levelname,
            "logger": record.name,
            "message": sanitized_msg,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "request_id": getattr(record, "request_id", None) or request_id_ctx.get(),
            "user_id": getattr(record, "user_id", None) or user_id_ctx.get(),
            "tenant_id": getattr(record, "tenant_id", None) or tenant_id_ctx.get(),
        }

        # Acción de dominio y latencia si fueron proporcionadas
        action = getattr(record, "action", None)
        if action:
            payload["action"] = action

        latency_ms = getattr(record, "latency_ms", None)
        if latency_ms is not None:
            payload["latency_ms"] = round(float(latency_ms), 3)

        # Campos adicionales pasados en extra={}
        extra_data = {}
        standard_attrs = {
            "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
            "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
            "created", "msecs", "relativeCreated", "thread", "threadName",
            "processName", "process", "message", "action", "latency_ms", "request_id",
            "user_id", "tenant_id"
        }
        for attr, val in record.__dict__.items():
            if attr not in standard_attrs and not attr.startswith("_"):
                extra_data[attr] = redact_sensitive_data(val)

        if extra_data:
            payload["data"] = extra_data

        # Traza de excepción si existe
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, ensure_ascii=False)


def setup_structured_logging(level: str = "INFO"):
    """
    Configura el manejador raíz de logs con el formateador JSON estructurado.
    """
    root_logger = logging.getLogger()
    log_level = getattr(logging, level.upper(), logging.INFO)
    root_logger.setLevel(log_level)

    # Evitar duplicación de handlers si ya existen
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(StructuredJsonFormatter())
    root_logger.addHandler(console_handler)

    # Silenciar logs ruidosos de dependencias externas
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("chromadb").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


def get_logger(name: str = "ateneo") -> logging.Logger:
    """Retorna un logger configurado para el espacio de nombres institucional."""
    return logging.getLogger(name)


def set_log_context(
    request_id: Optional[str] = None,
    user_id: Optional[str] = None,
    tenant_id: Optional[str] = None
):
    """Establece variables de contexto para enriquecer automáticamente todas las líneas de log."""
    if request_id is not None:
        request_id_ctx.set(request_id)
    if user_id is not None:
        user_id_ctx.set(user_id)
    if tenant_id is not None:
        tenant_id_ctx.set(tenant_id)


def clear_log_context():
    """Limpia el contexto de correlación."""
    request_id_ctx.set(None)
    user_id_ctx.set(None)
    tenant_id_ctx.set(None)
