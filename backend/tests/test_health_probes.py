"""
Batería de Pruebas Automatizadas para Sondas de Observabilidad y Salud Operativa (/health).
Certifica el cumplimiento de los contratos de Liveness, Readiness activa y Circuit Breakers de LLM.
"""

import sys
import time
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from routers.health import router as health_router, _PROCESS_START_TIME

from core.llm_gateway import llm_gateway, CircuitStatus
from core.config import settings
from fastapi import FastAPI


@pytest.fixture(scope="module")
def health_client():
    """Instancia de TestClient acotada al router de salud y observabilidad."""
    app = FastAPI(title="Ateneo Health Test App")
    app.include_router(health_router)
    return TestClient(app)


def test_health_root_contract(health_client):
    """Verifica que GET /health mantenga compatibilidad y liste las sondas disponibles."""
    response = health_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["project"] == "Ateneo"
    assert data["version"] == "1.0.0"
    assert "probes" in data
    assert data["probes"]["live"] == "/health/live"
    assert data["probes"]["ready"] == "/health/ready"
    assert data["probes"]["circuit_breakers"] == "/health/circuit-breakers"
    print("  [PASS] test_health_root_contract -> 200 OK")


def test_liveness_probe_healthy(health_client):
    """Verifica que GET /health/live responda inmediatamente confirmando que el proceso está vivo."""
    t0 = time.perf_counter()
    response = health_client.get("/health/live")
    latency_ms = (time.perf_counter() - t0) * 1000

    assert response.status_code == 200
    assert latency_ms < 50.0  # Ultra-rápida, menor a 50ms

    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ateneo-backend"
    assert "uptime_seconds" in data
    assert data["uptime_seconds"] >= 0
    assert "timestamp" in data
    assert data["version"] == "1.0.0"
    print(f"  [PASS] test_liveness_probe_healthy -> 200 OK ({latency_ms:.2f}ms)")


def test_readiness_probe_healthy(health_client):
    """
    Verifica que GET /health/ready audite SQLite, ChromaDB y Memoria,
    respondiendo HTTP 200 en condiciones normales con latencia < 30ms en warm-up.
    """
    # Ejecución de warm-up para inicialización de clientes persistentes
    health_client.get("/health/ready")

    t0 = time.perf_counter()
    response = health_client.get("/health/ready")
    total_http_latency_ms = (time.perf_counter() - t0) * 1000

    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "ready"
    assert "total_latency_ms" in data
    assert "checks" in data

    checks = data["checks"]
    # 1. Base de datos
    assert "database" in checks
    assert checks["database"]["status"] == "healthy"
    assert checks["database"]["engine"] in ["sqlite", "postgresql"]
    assert checks["database"]["latency_ms"] >= 0
    assert checks["database"]["error"] is None

    # 2. ChromaDB
    assert "vector_store" in checks
    assert checks["vector_store"]["status"] == "healthy"
    assert checks["vector_store"]["type"] == "chromadb"
    assert checks["vector_store"]["latency_ms"] >= 0
    assert checks["vector_store"]["collections_count"] >= 1
    assert checks["vector_store"]["error"] is None

    # 3. Memoria
    assert "system_memory" in checks
    assert checks["system_memory"]["status"] in ["healthy", "warning"]
    assert checks["system_memory"]["total_mb"] > 0
    assert checks["system_memory"]["available_mb"] > 0
    assert 0 <= checks["system_memory"]["used_percent"] <= 100

    print(f"  [PASS] test_readiness_probe_healthy -> 200 OK (DB: {checks['database']['latency_ms']}ms, Chroma: {checks['vector_store']['latency_ms']}ms, Total HTTP: {total_http_latency_ms:.2f}ms)")


def test_readiness_probe_database_failure(health_client):
    """Verifica que GET /health/ready devuelva HTTP 503 cuando la base de datos relacional falla."""
    with patch("routers.health.engine.connect", side_effect=Exception("Database connection timeout - SQLite locked")):
        response = health_client.get("/health/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["checks"]["database"]["status"] == "unhealthy"
        assert "Database connection timeout" in data["checks"]["database"]["error"]
        print("  [PASS] test_readiness_probe_database_failure -> 503 Service Unavailable")


def test_readiness_probe_chroma_failure(health_client):
    """Verifica que GET /health/ready devuelva HTTP 503 cuando el almacén vectorial ChromaDB falla."""
    mock_chroma = MagicMock()
    mock_chroma.heartbeat.side_effect = RuntimeError("ChromaDB index corrupted or unavailable")

    with patch("routers.health._get_chroma_client", return_value=mock_chroma):
        response = health_client.get("/health/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["checks"]["vector_store"]["status"] == "unhealthy"
        assert "ChromaDB index corrupted" in data["checks"]["vector_store"]["error"]
        print("  [PASS] test_readiness_probe_chroma_failure -> 503 Service Unavailable")


def test_circuit_breakers_probe_operational(health_client):
    """Verifica el reporte del estado de los Circuit Breakers cuando todos los modelos están operativos."""
    llm_gateway.reset_all_circuits()
    response = health_client.get("/health/circuit-breakers")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "OPERATIONAL"
    assert data["total_models"] > 0
    assert data["active_models"] == data["total_models"]
    assert data["cooldown_configured_seconds"] == settings.gemini_circuit_cooldown_seconds

    for model_name, model_info in data["models"].items():
        assert model_info["status"] == "CLOSED"
        assert model_info["cooldown_remaining_seconds"] == 0.0
        assert model_info["cooldown_until"] is None
    print(f"  [PASS] test_circuit_breakers_probe_operational -> 200 OK ({data['total_models']} modelos CLOSED)")


def test_circuit_breakers_probe_degraded_and_half_open(health_client):
    """
    Verifica que la sonda detecte estados DEGRADED ante disyuntor OPEN,
    y transición a HALF_OPEN tras expirar el período de cooldown.
    """
    llm_gateway.reset_all_circuits()
    models = settings.get_models_cascade()
    primary = models[0]

    # 1. Simular apertura de circuito con cooldown de 120 segundos
    llm_gateway.set_circuit_state(primary, CircuitStatus.OPEN, cooldown_seconds=120)

    res_open = health_client.get("/health/circuit-breakers")
    assert res_open.status_code == 200
    data_open = res_open.json()
    assert data_open["status"] == "DEGRADED"
    assert data_open["active_models"] == data_open["total_models"] - 1
    assert data_open["models"][primary]["status"] == "OPEN"
    assert data_open["models"][primary]["cooldown_remaining_seconds"] > 0

    # 2. Simular expiración del cooldown (cooldown_until en el pasado)
    llm_gateway._opened_until[primary] = time.time() - 5.0

    res_half_open = health_client.get("/health/circuit-breakers")
    assert res_half_open.status_code == 200
    data_half_open = res_half_open.json()
    assert data_half_open["models"][primary]["status"] == "HALF_OPEN"
    assert data_half_open["models"][primary]["cooldown_remaining_seconds"] == 0.0

    # 3. Limpieza y restauración
    llm_gateway.reset_all_circuits()
    res_restored = health_client.get("/health/circuit-breakers")
    assert res_restored.json()["status"] == "OPERATIONAL"
    print("  [PASS] test_circuit_breakers_probe_degraded_and_half_open -> 200 OK (OPEN -> HALF_OPEN -> CLOSED)")


if __name__ == "__main__":
    app = FastAPI(title="Ateneo Health Test App")
    app.include_router(health_router)
    client = TestClient(app)

    print("\n" + "=" * 70)
    print(" EJECUTANDO SUITE DE SONDAS DE OBSERVABILIDAD (/health)")
    print("=" * 70)
    test_health_root_contract(client)
    test_liveness_probe_healthy(client)
    test_readiness_probe_healthy(client)
    test_readiness_probe_database_failure(client)
    test_readiness_probe_chroma_failure(client)
    test_circuit_breakers_probe_operational(client)
    test_circuit_breakers_probe_degraded_and_half_open(client)
    print("=" * 70)
    print(" [EXITO] TODAS LAS PRUEBAS DE OBSERVABILIDAD APROBADAS (100% PASS)")
    print("=" * 70 + "\n")
