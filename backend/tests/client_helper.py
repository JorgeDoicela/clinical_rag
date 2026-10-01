"""
Helper de cliente HTTP para pruebas automatizadas (Ateneo+).
Detecta si el servidor FastAPI ya se encuentra activo en http://127.0.0.1:8000 para
reutilizar el proceso cargado en memoria (evitando re-cargas pesadas de transformers),
o recurre a TestClient(app) como fallback transparente.
"""

import httpx

def get_test_client():
    live_url = "http://127.0.0.1:8000"
    try:
        r = httpx.get(f"{live_url}/health", timeout=2.0)
        if r.status_code == 200:
            return httpx.Client(base_url=live_url, timeout=httpx.Timeout(120.0, connect=10.0))
    except Exception:
        pass

    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)
