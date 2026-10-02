"""
Batería de Pruebas Automatizadas para el Pool Asíncrono de Reportes y Tareas Pesadas (Fase 8).
Certifica el despacho no bloqueante de PDFs ReportLab, gestión de estados (PENDING, PROCESSING,
COMPLETED, FAILED) y resistencia a concurrencia simultánea.
"""

import sys
import time
import io
import asyncio
from pathlib import Path
import pytest

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from fastapi import FastAPI
from core.background_worker import background_worker, TaskStatus
from routers.evaluation import router as eval_router
from routers.history import router as hist_router


@pytest.fixture(scope="module")
def async_tasks_client():
    """Instancia de TestClient con los routers de evaluación e historial montados."""
    app = FastAPI(title="Ateneo Background Worker Test App")
    app.include_router(eval_router)
    app.include_router(hist_router)
    background_worker.start()
    client = TestClient(app)
    yield client
    background_worker.shutdown()


def test_background_worker_unit_lifecycle():
    """Valida el ciclo de vida unitario de una tarea en segundo plano con artefacto binario."""
    background_worker.clear()
    background_worker.start()

    def dummy_cpu_task(nombre: str) -> io.BytesIO:
        buf = io.BytesIO()
        buf.write(f"%PDF-1.4 Dummy PDF Content for {nombre}".encode("utf-8"))
        buf.seek(0)
        return buf

    task_id = background_worker.submit_task_sync(
        task_type="dummy_test",
        fn=dummy_cpu_task,
        nombre="Dr. Jorge Doicela",
        filename="test_output.pdf"
    )
    assert task_id is not None

    # Esperar procesamiento
    for _ in range(50):
        task = background_worker.get_task(task_id)
        if task and task.status == TaskStatus.COMPLETED:
            break
        time.sleep(0.05)

    task = background_worker.get_task(task_id)
    assert task is not None
    assert task.status == TaskStatus.COMPLETED
    assert task.progress_percent == 100
    assert task.error is None

    artifact = background_worker.get_artifact(task_id)
    assert artifact is not None
    assert artifact.startswith(b"%PDF-1.4")
    print("  [PASS] test_background_worker_unit_lifecycle -> COMPLETED con artefacto")


def test_background_worker_failure_handling():
    """Verifica que excepciones en tareas pesadas transicionen a FAILED con registro del error."""
    background_worker.clear()
    background_worker.start()

    def failing_task():
        raise ValueError("Simulated CPU Failure: Corrupted Memory Buffer")

    task_id = background_worker.submit_task_sync(
        task_type="failing_test",
        fn=failing_task
    )
    for _ in range(50):
        task = background_worker.get_task(task_id)
        if task and task.status == TaskStatus.FAILED:
            break
        time.sleep(0.05)

    task = background_worker.get_task(task_id)
    assert task is not None
    assert task.status == TaskStatus.FAILED
    assert "Simulated CPU Failure" in (task.error or "")
    print("  [PASS] test_background_worker_failure_handling -> FAILED capturado limpiamente")



def test_evaluation_pdf_async_endpoint(async_tasks_client):
    """Verifica el flujo completo HTTP: POST 202 Accepted -> Polling de estado -> Descarga de PDF."""
    payload = {
        "case_id": "case_dengue_01",
        "case_title": "Paciente con Dengue Clásico",
        "student_name": "Estudiante de Medicina",
        "guia_asociada": "GPC Dengue MSP Ecuador",
        "student_answer": "Se indica hidratación oral con sales de rehidratación y paracetamol.",
        "eval_result": {
            "score": 9.0,
            "score_max": 10.0,
            "aciertos": ["Correcta hidratación según GPC.", "Evitó AINEs."],
            "omisiones": [],
            "competencias_deficientes": [],
            "cita_normativa": {
                "guia": "GPC Dengue MSP",
                "seccion": "Tratamiento Ambulatorio",
                "pagina": 18,
                "texto_relevante": "Paracetamol 500mg cada 6 horas. Contraindicados los AINEs."
            },
            "retroalimentacion_general": "Excelente razonamiento terapéutico conforme a la norma."
        }
    }

    # 1. Encolar tarea asíncrona
    res = async_tasks_client.post("/api/evaluate/export-pdf-async", json=payload)
    assert res.status_code == 202
    data = res.json()
    assert "task_id" in data
    assert data["status"] in ["PENDING", "PROCESSING", "COMPLETED"]
    task_id = data["task_id"]

    # 2. Polling de estado
    completed = False
    for _ in range(60):
        res_status = async_tasks_client.get(f"/api/evaluate/tasks/{task_id}")
        assert res_status.status_code == 200
        st_data = res_status.json()
        if st_data["status"] == "COMPLETED":
            completed = True
            break
        time.sleep(0.05)

    assert completed, f"La tarea {task_id} no completó en el tiempo esperado"

    # 3. Descarga del artefacto
    res_download = async_tasks_client.get(f"/api/evaluate/tasks/{task_id}/download")
    assert res_download.status_code == 200
    assert res_download.headers["content-type"] == "application/pdf"
    assert res_download.content.startswith(b"%PDF")
    print(f"  [PASS] test_evaluation_pdf_async_endpoint -> 202 Accepted -> COMPLETED -> {len(res_download.content)} bytes PDF")


def test_cohort_pdf_async_endpoint(async_tasks_client):
    """Verifica el flujo asíncrono para reportes de cohorte institucionales."""
    # 1. Encolar tarea de cohorte
    res = async_tasks_client.post("/api/history/export-cohort-pdf-async?cohorte_id=cohorte_2026_medicina")
    assert res.status_code == 202
    data = res.json()
    task_id = data["task_id"]

    # 2. Polling de estado
    completed = False
    for _ in range(60):
        res_status = async_tasks_client.get(f"/api/history/tasks/{task_id}")
        assert res_status.status_code == 200
        if res_status.json()["status"] == "COMPLETED":
            completed = True
            break
        time.sleep(0.05)

    assert completed, f"El reporte de cohorte {task_id} no finalizó a tiempo"

    # 3. Descarga
    res_download = async_tasks_client.get(f"/api/history/tasks/{task_id}/download")
    assert res_download.status_code == 200
    assert res_download.headers["content-type"] == "application/pdf"
    assert res_download.content.startswith(b"%PDF")
    print(f"  [PASS] test_cohort_pdf_async_endpoint -> 202 Accepted -> COMPLETED -> {len(res_download.content)} bytes PDF")


def test_concurrent_pdf_export_stress_test(async_tasks_client):
    """
    Prueba de estrés de concurrencia: Encola 10 tareas de PDF simultáneamente.
    Valida la ausencia de condiciones de carrera, bloqueos del bucle o corrupción de memoria.
    """
    payload_base = {
        "case_id": "case_preeclampsia_01",
        "case_title": "Gestante con Trastorno Hipertensivo",
        "student_name": "Estudiante Concurrente",
        "guia_asociada": "GPC Preeclampsia MSP",
        "student_answer": "Esquema de Sulfato de Magnesio de Zuspan.",
        "eval_result": {
            "score": 9.5,
            "score_max": 10.0,
            "aciertos": ["Sulfato de magnesio correcto."],
            "omisiones": [],
            "competencias_deficientes": [],
            "cita_normativa": {"guia": "MSP", "seccion": "Tratamiento", "pagina": 25, "texto_relevante": "Zuspan."},
            "retroalimentacion_general": "Manejo óptimo."
        }
    }

    t0 = time.perf_counter()
    task_ids = []

    # Encolar 10 tareas en ráfaga
    for i in range(10):
        p = dict(payload_base)
        p["student_name"] = f"Estudiante_{i+1}"
        res = async_tasks_client.post("/api/evaluate/export-pdf-async", json=p)
        assert res.status_code == 202
        task_ids.append(res.json()["task_id"])

    # Esperar que las 10 tareas finalicen
    all_done = False
    for _ in range(100):
        completed_count = 0
        for tid in task_ids:
            st = async_tasks_client.get(f"/api/evaluate/tasks/{tid}").json()
            if st["status"] == "COMPLETED":
                completed_count += 1
        if completed_count == len(task_ids):
            all_done = True
            break
        time.sleep(0.08)

    elapsed_ms = (time.perf_counter() - t0) * 1000
    assert all_done, f"Solo {completed_count}/{len(task_ids)} tareas finalizaron a tiempo"

    # Verificar que todos los artefactos sean PDFs válidos
    for tid in task_ids:
        dl = async_tasks_client.get(f"/api/evaluate/tasks/{tid}/download")
        assert dl.status_code == 200
        assert dl.content.startswith(b"%PDF")

    print(f"  [PASS] test_concurrent_pdf_export_stress_test -> 10 reportes compilados en paralelo en {elapsed_ms:.2f}ms")


def test_task_error_responses(async_tasks_client):
    """Verifica códigos HTTP apropiados para tareas inexistentes o en estado incompleto."""
    # 1. Tarea inexistente -> 404
    r404 = async_tasks_client.get("/api/evaluate/tasks/non-existent-uuid")
    assert r404.status_code == 404

    r404_dl = async_tasks_client.get("/api/evaluate/tasks/non-existent-uuid/download")
    assert r404_dl.status_code == 404

    # 2. Descarga de tarea aún no completada -> 400
    task_id = "test-pending-task"
    from core.background_worker import BackgroundTaskRecord
    import datetime
    with background_worker._lock:
        background_worker._tasks[task_id] = BackgroundTaskRecord(
            task_id=task_id,
            task_type="test",
            status=TaskStatus.PROCESSING,
            created_at=datetime.datetime.now(datetime.timezone.utc).isoformat()
        )

    r400 = async_tasks_client.get(f"/api/evaluate/tasks/{task_id}/download")
    assert r400.status_code == 400
    assert "no ha finalizado" in r400.json()["detail"]
    print("  [PASS] test_task_error_responses -> 404 y 400 validados correctamente")


if __name__ == "__main__":
    app = FastAPI(title="Ateneo Background Worker Test App")
    app.include_router(eval_router)
    app.include_router(hist_router)
    background_worker.start()
    client = TestClient(app)

    print("\n" + "=" * 70)
    print(" EJECUTANDO SUITE DE POOL ASÍNCRONO DE REPORTES (FASE 8)")
    print("=" * 70)
    test_background_worker_unit_lifecycle()
    test_background_worker_failure_handling()
    test_evaluation_pdf_async_endpoint(client)
    test_cohort_pdf_async_endpoint(client)
    test_concurrent_pdf_export_stress_test(client)
    test_task_error_responses(client)
    print("=" * 70)
    print(" [EXITO] TODAS LAS PRUEBAS DE POOL ASÍNCRONO APROBADAS (100% PASS)")
    print("=" * 70 + "\n")
    background_worker.shutdown()
