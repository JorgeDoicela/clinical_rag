"""
Suite de Pruebas Unitarias e Integración para el Patrón Unit of Work (ACID).
Verifica atomicidad estricta, commits coordinados multi-repositorio y rollbacks automáticos ante excepciones.
"""
import pytest
import datetime
from core.unit_of_work import SqlAlchemyUnitOfWork
from core.database import SessionLocal
from modules.analytics_history.models import EvaluationHistoryModel
from modules.adaptive.models import StudentSnapshotModel


def test_unit_of_work_commit_success():
    """
    Verifica que las operaciones multi-repositorio coordinadas dentro del bloque
    with uow: se persistan atómicamente al invocar uow.commit().
    """
    uow = SqlAlchemyUnitOfWork()
    test_user = "usr_alumno_001"
    timestamp_mark = datetime.datetime.now(datetime.timezone.utc)

    with uow:
        # 1. Crear registro en repositorio de historial
        eval_record = EvaluationHistoryModel(
            user_id=test_user,
            user_email="alumno@ateneo.edu.ec",
            case_id="case_preeclampsia_01",
            guia_asociada="MSP_Trastornos-hipertensivos-del-embarazo-con-portada-3.pdf",
            case_title="Caso Preeclampsia UoW Commit Test",
            score=9.0,
            score_max=10,
            faithfulness_score=0.95,
            cohorte_id="test_cohort",
            tiempo_segundos=120.0,
            aciertos_json="[\"Diagnóstico certero\"]",
            omisiones_json="[]",
            competencias_json="[]",
            cita_normativa_json="{}",
            retroalimentacion_general="Excelente",
            timestamp=timestamp_mark
        )
        uow.history.create(eval_record, commit=False)

        # 2. Crear snapshot en repositorio adaptativo
        uow.adaptive.add_snapshot(
            user_id=test_user,
            session_num=999,
            score=9.0,
            state={"diagnostico": 0.85},
            commit=False
        )

        # 3. Confirmar transacción atómica
        uow.commit()

    # Verificar persistencia efectiva fuera del contexto del UoW
    with SessionLocal() as db:
        saved_eval = db.query(EvaluationHistoryModel).filter(
            EvaluationHistoryModel.case_title == "Caso Preeclampsia UoW Commit Test"
        ).first()
        saved_snap = db.query(StudentSnapshotModel).filter(
            StudentSnapshotModel.user_id == test_user,
            StudentSnapshotModel.session_num == 999
        ).first()

        assert saved_eval is not None, "El registro de evaluación debió persistirse."
        assert saved_snap is not None, "El snapshot psicométrico debió persistirse."
        assert saved_eval.score == 9.0

        # Limpiar datos de prueba
        db.delete(saved_eval)
        db.delete(saved_snap)
        db.commit()


def test_unit_of_work_automatic_rollback_on_exception():
    """
    Verifica que ante una excepción inducida durante una operación compuesta,
    el contexto UoW ejecute rollback automático y NINGÚN dato parcial quede persistido.
    """
    uow = SqlAlchemyUnitOfWork()
    test_user = "usr_alumno_001"

    # Conteo previo en base de datos
    with SessionLocal() as db:
        initial_eval_count = db.query(EvaluationHistoryModel).filter(
            EvaluationHistoryModel.case_title == "Caso Rollback Test"
        ).count()
        initial_snap_count = db.query(StudentSnapshotModel).filter(
            StudentSnapshotModel.session_num == 888
        ).count()

    error_triggered = False
    try:
        with uow:
            # 1. Añadir evaluación (sin commit individual)
            eval_record = EvaluationHistoryModel(
                user_id=test_user,
                user_email="alumno@ateneo.edu.ec",
                case_id="case_preeclampsia_01",
                guia_asociada="MSP_Trastornos-hipertensivos-del-embarazo-con-portada-3.pdf",
                case_title="Caso Rollback Test",
                score=5.0,
                score_max=10,
                faithfulness_score=0.4,
                cohorte_id="test_cohort",
                tiempo_segundos=45.0,
                aciertos_json="[]",
                omisiones_json="[]",
                competencias_json="[]",
                cita_normativa_json="{}",
                retroalimentacion_general="Fallo inducido",
                timestamp=datetime.datetime.now(datetime.timezone.utc)
            )
            uow.history.create(eval_record, commit=False)

            # 2. Simular fallo fatal en la lógica subsecuente antes del commit
            raise RuntimeError("Fallo forzado simulado para verificar atomicidad ACID.")
    except RuntimeError:
        error_triggered = True

    assert error_triggered, "La excepción debió ser capturada."

    # Verificar que el rollback automático impidió la inserción de la evaluación
    with SessionLocal() as db:
        final_eval_count = db.query(EvaluationHistoryModel).filter(
            EvaluationHistoryModel.case_title == "Caso Rollback Test"
        ).count()
        final_snap_count = db.query(StudentSnapshotModel).filter(
            StudentSnapshotModel.session_num == 888
        ).count()

        assert final_eval_count == initial_eval_count, "La evaluación NO debió persistirse tras el fallo."
        assert final_snap_count == initial_snap_count, "El snapshot NO debió persistirse tras el fallo."


if __name__ == "__main__":
    print("Ejecutando test_unit_of_work_commit_success...")
    test_unit_of_work_commit_success()
    print("[PASS] test_unit_of_work_commit_success aprobado.")

    print("Ejecutando test_unit_of_work_automatic_rollback_on_exception...")
    test_unit_of_work_automatic_rollback_on_exception()
    print("[PASS] test_unit_of_work_automatic_rollback_on_exception aprobado.")

    print("\nTODOS LOS TESTS DE UNIT OF WORK APROBADOS AL 100%.")
