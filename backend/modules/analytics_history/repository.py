from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from modules.analytics_history.models import EvaluationHistoryModel


class HistoryRepository:
    """
    Repositorio desacoplado para persistencia y consultas de evaluaciones clínicas.
    Aísla completamente el motor de base de datos del resto de la aplicación.
    """
    def __init__(self, db: Session):
        self.db = db

    def count(self) -> int:
        return self.db.query(EvaluationHistoryModel).count()

    def get_all(self, limit: Optional[int] = None) -> List[EvaluationHistoryModel]:
        query = self.db.query(EvaluationHistoryModel).order_by(desc(EvaluationHistoryModel.id))
        if limit:
            query = query.limit(limit)
        return query.all()

    def get_by_user(self, user_identifier: str, limit: int = 50) -> List[EvaluationHistoryModel]:
        return (
            self.db.query(EvaluationHistoryModel)
            .filter(
                or_(
                    EvaluationHistoryModel.user_id == user_identifier,
                    EvaluationHistoryModel.user_email == user_identifier,
                )
            )
            .order_by(desc(EvaluationHistoryModel.id))
            .limit(limit)
            .all()
        )

    def create(self, record: EvaluationHistoryModel) -> EvaluationHistoryModel:
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def delete_all(self) -> None:
        self.db.query(EvaluationHistoryModel).delete()
        self.db.commit()
