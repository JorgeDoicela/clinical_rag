"""
Capa de compatibilidad y delegación para el historial de evaluaciones clínicas.
Delega directamente en el módulo desacoplado modules/analytics_history (SQLAlchemy + Repository Pattern).
"""
from typing import List, Dict, Any, Optional
from core.database import SessionLocal, init_database
from modules.analytics_history.repository import HistoryRepository
from modules.analytics_history.service import AnalyticsHistoryService

# Garantizar que las tablas de SQLAlchemy existan en la base de datos
init_database()


def _get_service() -> AnalyticsHistoryService:
    db = SessionLocal()
    repo = HistoryRepository(db)
    return AnalyticsHistoryService(repo)


def init_history_db() -> None:
    """Inicializa la base de datos mediante SQLAlchemy."""
    init_database()


def seed_rich_history_data() -> None:
    """Siembra evaluaciones de demostración si la base de datos está vacía."""
    db = SessionLocal()
    try:
        repo = HistoryRepository(db)
        service = AnalyticsHistoryService(repo)
        service.seed_default_history_if_needed()
    finally:
        db.close()


def save_evaluation_record(
    user_id: str,
    user_email: str,
    case_id: str,
    guia_asociada: str,
    case_title: str,
    eval_result: Dict[str, Any]
) -> int:
    """Guarda un registro de evaluación clínica utilizando el servicio desacoplado."""
    db = SessionLocal()
    try:
        repo = HistoryRepository(db)
        service = AnalyticsHistoryService(repo)
        return service.save_evaluation(
            user_id=user_id,
            user_email=user_email,
            case_id=case_id,
            guia_asociada=guia_asociada,
            case_title=case_title,
            eval_result=eval_result
        )
    finally:
        db.close()


def get_user_evaluation_history(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Obtiene el historial de evaluaciones del usuario."""
    db = SessionLocal()
    try:
        repo = HistoryRepository(db)
        service = AnalyticsHistoryService(repo)
        return service.get_user_history(user_id, limit=limit)
    finally:
        db.close()


def analyze_user_trends(user_id: str) -> Dict[str, Any]:
    """Calcula analítica longitudinal, radar de competencias y brechas del estudiante."""
    db = SessionLocal()
    try:
        repo = HistoryRepository(db)
        service = AnalyticsHistoryService(repo)
        return service.get_student_advanced_analytics(user_id)
    finally:
        db.close()


def analyze_coordinator_cohort_analytics(cohorte_id: Optional[str] = None) -> Dict[str, Any]:
    """Calcula la analítica institucional B2B para directores y docentes."""
    db = SessionLocal()
    try:
        repo = HistoryRepository(db)
        service = AnalyticsHistoryService(repo)
        return service.analyze_coordinator_cohort_analytics(cohorte_id)
    finally:
        db.close()


# Sembrar datos de demostración automáticamente al cargar el módulo si la BD está vacía
seed_rich_history_data()
