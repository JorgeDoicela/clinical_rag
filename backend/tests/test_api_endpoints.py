import sys
from pathlib import Path
from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parent.parent))

from main import app
from auth.security import init_demo_users

init_demo_users()
client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    print("  [PASS] GET /health -> 200 OK")

def test_auth_endpoints():
    # Login exitoso con alumno
    res_alumno = client.post("/api/auth/login", json={
        "email": "alumno@ateneo.edu.ec",
        "password": "Alumno123!"
    })
    assert res_alumno.status_code == 200
    data_alumno = res_alumno.json()
    assert "access_token" in data_alumno
    assert data_alumno["user"]["rol"] == "alumno"
    print("  [PASS] POST /api/auth/login (Alumno) -> 200 OK (JWT emitido)")

    # Login exitoso con administrador
    res_admin = client.post("/api/auth/login", json={
        "email": "admin@ateneo.edu.ec",
        "password": "Admin123!"
    })
    assert res_admin.status_code == 200
    admin_token = res_admin.json()["access_token"]
    print("  [PASS] POST /api/auth/login (Admin) -> 200 OK")
    
    # Catálogo de usuarios protegido por RBAC (Admin)
    headers = {"Authorization": f"Bearer {admin_token}"}
    res_users = client.get("/api/auth/users", headers=headers)
    assert res_users.status_code == 200
    users = res_users.json()
    assert len(users) >= 3
    print(f"  [PASS] GET /api/auth/users (RBAC Admin) -> 200 OK ({len(users)} usuarios)")

def test_cases_endpoints():
    # Listar casos
    res = client.get("/api/cases")
    assert res.status_code == 200
    cases = res.json()
    assert len(cases) >= 12
    print(f"  [PASS] GET /api/cases -> 200 OK ({len(cases)} casos clínicos)")
    
    # Obtener caso específico
    first_id = cases[0]["id"]
    res_single = client.get(f"/api/cases/{first_id}")
    assert res_single.status_code == 200
    assert res_single.json()["id"] == first_id
    print(f"  [PASS] GET /api/cases/{first_id} -> 200 OK")
    
    # Caso inexistente -> 404
    res_404 = client.get("/api/cases/caso_inexistente_999")
    assert res_404.status_code == 404
    print("  [PASS] GET /api/cases/404 -> 404 Not Found (Correcto)")

def test_scientific_benchmark_endpoint():
    res = client.get("/api/evaluate/benchmark-scientific")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "benchmark" in data
    print("  [PASS] GET /api/evaluate/benchmark-scientific -> 200 OK")

def test_history_and_analytics_endpoints():
    res_auth = client.post("/api/auth/login", json={
        "email": "alumno@ateneo.edu.ec",
        "password": "Alumno123!"
    })
    token = res_auth.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Historial de estudiante
    res = client.get("/api/history", headers=headers)
    assert res.status_code == 200
    print("  [PASS] GET /api/history -> 200 OK")
    
    # Analítica de tendencias (trends)
    res_trends = client.get("/api/history/trends", headers=headers)
    assert res_trends.status_code == 200
    print("  [PASS] GET /api/history/trends -> 200 OK (Tendencias y Radar)")
    
    # Analítica B2B de coordinadores
    res_coord = client.get("/api/history/coordinator-analytics")
    assert res_coord.status_code == 200
    assert "top_deficiencias_institucionales" in res_coord.json()
    assert "modulos_analizados" in res_coord.json()
    print("  [PASS] GET /api/history/coordinator-analytics -> 200 OK (Panel B2B de Inteligencia Institucional)")

def test_collaboration_rooms_endpoints():
    res_auth = client.post("/api/auth/login", json={
        "email": "docente@ateneo.edu.ec",
        "password": "Docente123!"
    })
    token = res_auth.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res_create = client.post("/api/ateneo/create", data={
        "case_id": "case_dengue_01",
        "docente_id": "usr_docente_001",
        "docente_nombre": "Dr. Carlos Andrade"
    }, headers=headers)
    assert res_create.status_code == 200
    room = res_create.json()
    room_code = room["room_code"]
    print(f"  [PASS] POST /api/ateneo/create -> 200 OK (Sala creada: {room_code})")

    res_room = client.get(f"/api/ateneo/room/{room_code}")
    assert res_room.status_code == 200
    print(f"  [PASS] GET /api/ateneo/room/{room_code} -> 200 OK (Estado sincrónico)")


def test_pdf_export_endpoint():
    payload = {
        "case_id": "case_dengue_01",
        "case_title": "Paciente con Dengue",
        "student_name": "Estudiante Test",
        "guia_asociada": "dengue",
        "student_answer": "Respuesta de prueba...",
        "eval_result": {
            "score": 8.5,
            "score_max": 10,
            "aciertos": ["Diagnóstico correcto"],
            "omisiones": ["Dosis de líquidos"],
            "competencias_deficientes": [{"eje": "tratamiento", "descripcion": "Dosis"}],
            "cita_normativa": {"guia": "GPC Dengue", "seccion": "Terapéutica", "pagina": 12, "texto_relevante": "Norma"},
            "retroalimentacion_general": "Buen desempeño."
        }
    }
    # Probar endpoint primario y alias defensivo
    res1 = client.post("/api/evaluate/export-pdf", json=payload)
    assert res1.status_code == 200
    assert res1.headers["content-type"] == "application/pdf"
    
    res2 = client.post("/api/history/export-pdf", json=payload)
    assert res2.status_code == 200
    assert res2.headers["content-type"] == "application/pdf"
    print("  [PASS] POST /api/evaluate/export-pdf & /api/history/export-pdf -> 200 OK (PDF generado)")

def test_phase_evaluation_endpoint():
    res = client.post("/api/evaluate/phase", data={
        "case_id": "case_hta_01",
        "fase_numero": 1,
        "respuesta_estudiante": "Sospecha de Hipertensión Arterial Grado 2 según la GPC del MSP. Presenta cifras tensionales de 155/96 mmHg en repetidas ocasiones."
    })
    assert res.status_code == 200
    phase_res = res.json()
    assert phase_res["fase_numero"] == 1
    assert "score_fase" in phase_res
    assert "cita_normativa" in phase_res
    print(f"  [PASS] POST /api/evaluate/phase -> 200 OK (Fase 1 evaluada, Score: {phase_res['score_fase']})")


if __name__ == "__main__":
    print("\n" + "#"*70)
    print(" SUITE DE PRUEBAS DE INTEGRACIÓN HTTP ENDPOINTS - ATENEO+ API")
    print("#"*70 + "\n")
    
    test_health_check()
    test_auth_endpoints()
    test_cases_endpoints()
    test_scientific_benchmark_endpoint()
    test_history_and_analytics_endpoints()
    test_collaboration_rooms_endpoints()
    test_pdf_export_endpoint()
    test_phase_evaluation_endpoint()
    
    print("\n" + "#"*70)
    print(" TODOS LOS ENDPOINTS DE LA API FUNCIONAN CORRECTAMENTE (PASS)")
    print("#"*70 + "\n")

