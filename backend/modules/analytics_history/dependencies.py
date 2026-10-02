from fastapi import Depends
from sqlalchemy.orm import Session
from core.database import get_db
from modules.analytics_history.repository import HistoryRepository
from modules.analytics_history.service import AnalyticsHistoryService


def get_history_repository(db: Session = Depends(get_db)) -> HistoryRepository:
    return HistoryRepository(db)


def get_analytics_service(
    repo: HistoryRepository = Depends(get_history_repository)
) -> AnalyticsHistoryService:
    return AnalyticsHistoryService(repo)
