from fastapi import Depends
from sqlalchemy.orm import Session
from core.database import get_db
from modules.adaptive.repository import AdaptiveRepository
from modules.adaptive.service import AdaptiveCurriculumService
from modules.analytics_history.dependencies import get_history_repository
from modules.analytics_history.repository import HistoryRepository


def get_adaptive_repository(db: Session = Depends(get_db)) -> AdaptiveRepository:
    return AdaptiveRepository(db)


def get_adaptive_service(
    adaptive_repo: AdaptiveRepository = Depends(get_adaptive_repository),
    history_repo: HistoryRepository = Depends(get_history_repository)
) -> AdaptiveCurriculumService:
    return AdaptiveCurriculumService(
        repository=adaptive_repo,
        history_repository=history_repo
    )
