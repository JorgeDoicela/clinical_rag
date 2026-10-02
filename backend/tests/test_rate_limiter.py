"""
Suite de Pruebas Unitarias e Integración para Rate Limiting y Cuotas Defensivas (RFC 7807).
Verifica el algoritmo Sliding Window, inyección de cabeceras RFC y bloqueo HTTP 429.
"""
import time
import pytest
from core.rate_limiter import SlidingWindowRateLimiter, RateLimitGuard
from tests.client_helper import get_test_client


def test_sliding_window_allows_within_limit():
    """Verifica que el limitador permita peticiones dentro del umbral y decremente remaining."""
    limiter = SlidingWindowRateLimiter()
    key = "test_user_1"
    limit = 3
    window = 10

    # Petición 1
    allowed, lim, rem, reset = limiter.check_and_record(key, limit, window)
    assert allowed is True
    assert rem == 2
    assert reset <= 10

    # Petición 2
    allowed, lim, rem, reset = limiter.check_and_record(key, limit, window)
    assert allowed is True
    assert rem == 1

    # Petición 3
    allowed, lim, rem, reset = limiter.check_and_record(key, limit, window)
    assert allowed is True
    assert rem == 0

    # Petición 4 (Excedida)
    allowed, lim, rem, reset = limiter.check_and_record(key, limit, window)
    assert allowed is False
    assert rem == 0
    assert reset >= 1


def test_sliding_window_resets_after_expiration():
    """Verifica que la cuota se renueve una vez transcurrida la ventana de expiración."""
    limiter = SlidingWindowRateLimiter()
    key = "test_user_fast_reset"
    limit = 2
    window = 1  # 1 segundo de ventana

    limiter.check_and_record(key, limit, window)
    limiter.check_and_record(key, limit, window)
    allowed, _, rem, _ = limiter.check_and_record(key, limit, window)
    assert allowed is False
    assert rem == 0

    # Esperar expiración de la ventana
    time.sleep(1.1)

    allowed, _, rem, _ = limiter.check_and_record(key, limit, window)
    assert allowed is True
    assert rem == 1


def test_http_endpoint_rate_limit_headers_and_429():
    """
    Verifica la integración HTTP con FastAPI:
    1. Cabeceras RFC presentes (X-RateLimit-Limit, Remaining, Reset).
    2. Bloqueo estricto con HTTP 429 y RFC 7807 (Problem Details) ante exceso.
    """
    from core.rate_limiter import rate_limit_export, global_rate_limiter
    global_rate_limiter.clear()

    client = get_test_client()

    payload = {
        "case_id": "case_dengue_01",
        "case_title": "Dengue con signos de alarma",
        "student_name": "Test Student",
        "guia_asociada": "dengue",
        "student_answer": "Respuesta clínica",
        "eval_result": {
            "score": 8.0,
            "score_max": 10,
            "aciertos": ["Diagnóstico correcto"],
            "omisiones": [],
            "competencias_deficientes": [],
            "cita_normativa": {"guia": "MSP", "pagina": 1},
            "retroalimentacion_general": "Bien"
        }
    }

    # 1. Petición normal: debe contener cabeceras estándar
    res1 = client.post("/api/evaluate/export-pdf", json=payload)
    assert res1.status_code == 200
    assert "X-RateLimit-Limit" in res1.headers
    assert "X-RateLimit-Remaining" in res1.headers
    assert "X-RateLimit-Reset" in res1.headers

    # 2. Simular saturación forzando el límite del guardia de exportación
    original_limit = rate_limit_export.limit
    rate_limit_export.limit = 2

    try:
        # Petición 2 (dentro del límite)
        res2 = client.post("/api/evaluate/export-pdf", json=payload)
        assert res2.status_code == 200
        assert res2.headers.get("X-RateLimit-Remaining") == "0"

        # Petición 3 (debe ser rechazada con HTTP 429)
        res3 = client.post("/api/evaluate/export-pdf", json=payload)
        assert res3.status_code == 429, f"Esperado 429, obtenido: {res3.status_code}"
        assert res3.headers.get("X-RateLimit-Remaining") == "0"
        assert "Retry-After" in res3.headers

        # Verificar estructura RFC 7807 Problem Details
        body = res3.json()
        assert body.get("status") == 429
        assert "Too Many Requests" in body.get("title", "")
        assert "Cuota de peticiones excedida" in body.get("detail", "")
        assert "instance" in body
    finally:
        # Restaurar límite y limpiar
        rate_limit_export.limit = original_limit
        global_rate_limiter.clear()


if __name__ == "__main__":
    print("Ejecutando test_sliding_window_allows_within_limit...")
    test_sliding_window_allows_within_limit()
    print("[PASS] test_sliding_window_allows_within_limit aprobado.")

    print("Ejecutando test_sliding_window_resets_after_expiration...")
    test_sliding_window_resets_after_expiration()
    print("[PASS] test_sliding_window_resets_after_expiration aprobado.")

    print("Ejecutando test_http_endpoint_rate_limit_headers_and_429...")
    test_http_endpoint_rate_limit_headers_and_429()
    print("[PASS] test_http_endpoint_rate_limit_headers_and_429 aprobado.")

    print("\nTODOS LOS TESTS DE RATE LIMITING APROBADOS AL 100%.")
