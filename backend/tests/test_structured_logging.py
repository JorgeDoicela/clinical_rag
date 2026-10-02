"""
Batería de Pruebas Automatizadas para Logging Estructurado OpenTelemetry-Ready (Fase 9).
Certifica:
1. Formato JSON estándar de logs (timestamp, level, logger, message).
2. Propagación de metadatos contextuales (request_id, user_id, tenant_id).
3. Enmascaramiento y sanitización de credenciales y datos sensibles (JWT, API keys, passwords).
4. Asignación e inyección de X-Request-ID en middleware FastAPI.
"""
import io
import json
import logging
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from core.logger import (
    StructuredJsonFormatter,
    get_logger,
    request_id_ctx,
    user_id_ctx,
    tenant_id_ctx,
    redact_sensitive_data
)
from main import app

client = TestClient(app)


def test_structured_json_formatter_basic():
    """Valida que el formateador emita JSON válido con campos canónicos."""
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(StructuredJsonFormatter())

    test_logger = logging.getLogger("test.structured.basic")
    test_logger.setLevel(logging.INFO)
    test_logger.addHandler(handler)

    test_logger.info("Prueba de mensaje estructurado", extra={"action": "test_action", "latency_ms": 12.5})

    handler.flush()
    output = stream.getvalue().strip()
    data = json.loads(output)

    assert data["level"] == "INFO"
    assert data["logger"] == "test.structured.basic"
    assert data["message"] == "Prueba de mensaje estructurado"
    assert data["action"] == "test_action"
    assert data["latency_ms"] == 12.5
    assert "timestamp" in data
    print("  [PASS] test_structured_json_formatter_basic -> Formato JSON y campos canonicos validados")


def test_context_vars_propagation():
    """Valida que las variables de contexto request_id, user_id y tenant_id se inyecten automáticamente."""
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(StructuredJsonFormatter())

    test_logger = logging.getLogger("test.structured.context")
    test_logger.setLevel(logging.INFO)
    test_logger.addHandler(handler)

    token_req = request_id_ctx.set("req-test-999")
    token_usr = user_id_ctx.set("usr-456")
    token_ten = tenant_id_ctx.set("hospital-quito")

    try:
        test_logger.info("Log con contexto inyectado")
    finally:
        request_id_ctx.reset(token_req)
        user_id_ctx.reset(token_usr)
        tenant_id_ctx.reset(token_ten)

    handler.flush()
    output = stream.getvalue().strip()
    data = json.loads(output)

    assert data["request_id"] == "req-test-999"
    assert data["user_id"] == "usr-456"
    assert data["tenant_id"] == "hospital-quito"
    print("  [PASS] test_context_vars_propagation -> Variables de contexto request/user/tenant inyectadas")


def test_sensitive_data_redaction():
    """Valida la ofuscación de tokens JWT, claves y contraseñas sensibles."""
    # 1. Enmascaramiento directo de strings con Bearer token JWT
    jwt_msg = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doicela"
    redacted_msg = redact_sensitive_data(jwt_msg)
    assert "Bearer [REDACTED_JWT_TOKEN]" in redacted_msg
    assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in redacted_msg

    # 2. Enmascaramiento de API Key de Google
    api_key_msg = "Usando key AIzaSyD98f7ds9f8dsf8ds9f7dsf8ds7"
    redacted_api = redact_sensitive_data(api_key_msg)
    assert "AIza[REDACTED_API_KEY]" in redacted_api

    # 3. Enmascaramiento de diccionarios anidados
    sensitive_dict = {
        "usuario": "jorge",
        "password": "PasswordSuperSecreta123",
        "auth": {
            "access_token": "token_secreto_xyz",
            "refresh_token": "refresh_secreto_abc"
        }
    }
    cleaned = redact_sensitive_data(sensitive_dict)
    assert cleaned["password"] == "[REDACTED_SECRET]"
    assert cleaned["auth"]["access_token"] == "[REDACTED_SECRET]"
    assert cleaned["auth"]["refresh_token"] == "[REDACTED_SECRET]"
    assert cleaned["usuario"] == "jorge"
    print("  [PASS] test_sensitive_data_redaction -> JWT, API keys y contrasenas ofuscadas exitosamente")


def test_middleware_request_id_header_and_logging():
    """Valida que el middleware asigne X-Request-ID y se pueda registrar correctamente."""
    response = client.get("/health")
    assert response.status_code == 200
    assert "x-request-id" in response.headers
    request_id = response.headers["x-request-id"]
    assert len(request_id) > 0
    print(f"  [PASS] test_middleware_request_id_header_and_logging -> Header X-Request-ID emitido: {request_id[:8]}...")


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print(" EJECUTANDO SUITE DE LOGGING ESTRUCTURADO OPENTELEMETRY (FASE 9)")
    print("=" * 70)
    test_structured_json_formatter_basic()
    test_context_vars_propagation()
    test_sensitive_data_redaction()
    test_middleware_request_id_header_and_logging()
    print("=" * 70)
    print(" [EXITO] TODAS LAS PRUEBAS DE LOGGING ESTRUCTURADO APROBADAS (100% PASS)")
    print("=" * 70 + "\n")
