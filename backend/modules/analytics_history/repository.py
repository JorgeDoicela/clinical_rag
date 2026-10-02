from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func
from modules.analytics_history.models import EvaluationHistoryModel


class HistoryRepository:
    """
    Repositorio desacoplado para persistencia y consultas de evaluaciones clínicas.
    Aísla completamente el motor de base de datos del resto de la aplicación y ejecuta
    agregaciones SQL analíticas de alto rendimiento sobre columnas e índices normalizados.
    """
    def __init__(self, db: Session):
        self.db = db

    def count(self, tenant_id: Optional[str] = None) -> int:
        query = self.db.query(EvaluationHistoryModel)
        if tenant_id:
            query = query.filter(EvaluationHistoryModel.tenant_id == tenant_id)
        return query.count()

    def get_all(self, limit: Optional[int] = None, tenant_id: Optional[str] = None) -> List[EvaluationHistoryModel]:
        query = self.db.query(EvaluationHistoryModel)
        if tenant_id:
            query = query.filter(EvaluationHistoryModel.tenant_id == tenant_id)
        query = query.order_by(desc(EvaluationHistoryModel.id))
        if limit:
            query = query.limit(limit)
        return query.all()

    def get_by_user(self, user_identifier: str, limit: int = 50, tenant_id: Optional[str] = None) -> List[EvaluationHistoryModel]:
        query = self.db.query(EvaluationHistoryModel).filter(
            or_(
                EvaluationHistoryModel.user_id == user_identifier,
                EvaluationHistoryModel.user_email == user_identifier,
            )
        )
        if tenant_id:
            query = query.filter(EvaluationHistoryModel.tenant_id == tenant_id)
        return query.order_by(desc(EvaluationHistoryModel.id)).limit(limit).all()

    def get_cohort_summary_stats(self, cohorte_id: Optional[str] = None, tenant_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Calcula estadísticas de cohorte en una única consulta SQL agregada nativa (func.avg, func.count)
        sobre las columnas normalizadas de primer orden, con aislamiento opcional por tenant.
        """
        query = self.db.query(
            func.count(EvaluationHistoryModel.id).label("total_evaluaciones"),
            func.count(func.distinct(EvaluationHistoryModel.user_id)).label("total_estudiantes"),
            func.avg(EvaluationHistoryModel.score).label("promedio_score"),
            func.avg(EvaluationHistoryModel.faithfulness_score).label("promedio_faithfulness"),
            func.avg(EvaluationHistoryModel.tiempo_segundos).label("promedio_tiempo_segundos")
        )
        if tenant_id:
            query = query.filter(EvaluationHistoryModel.tenant_id == tenant_id)
        if cohorte_id:
            query = query.filter(EvaluationHistoryModel.cohorte_id == cohorte_id)

        row = query.one()
        return {
            "total_evaluaciones": int(row.total_evaluaciones or 0),
            "total_estudiantes": int(row.total_estudiantes or 0),
            "promedio_score": round(float(row.promedio_score or 0.0), 2),
            "promedio_faithfulness": round(float(row.promedio_faithfulness or 0.0), 3),
            "promedio_tiempo_segundos": round(float(row.promedio_tiempo_segundos or 0.0), 1)
        }

    def get_guide_breakdown_stats(self, cohorte_id: Optional[str] = None, tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Calcula métricas agrupadas por guía clínica aprovechando el índice compuesto ix_eval_cohort_guide
        y el aislamiento opcional por tenant.
        """
        query = self.db.query(
            EvaluationHistoryModel.guia_asociada,
            func.count(EvaluationHistoryModel.id).label("conteo_evaluaciones"),
            func.avg(EvaluationHistoryModel.score).label("promedio_score"),
            func.avg(EvaluationHistoryModel.faithfulness_score).label("promedio_faithfulness")
        )
        if tenant_id:
            query = query.filter(EvaluationHistoryModel.tenant_id == tenant_id)
        if cohorte_id:
            query = query.filter(EvaluationHistoryModel.cohorte_id == cohorte_id)

        rows = query.group_by(EvaluationHistoryModel.guia_asociada).all()
        return [
            {
                "guia_asociada": r.guia_asociada,
                "conteo_evaluaciones": int(r.conteo_evaluaciones),
                "promedio_score": round(float(r.promedio_score or 0.0), 2),
                "promedio_faithfulness": round(float(r.promedio_faithfulness or 0.0), 3)
            }
            for r in rows
        ]


    def create(self, record: EvaluationHistoryModel, commit: bool = True) -> EvaluationHistoryModel:
        self.db.add(record)
        if commit:
            self.db.commit()
            self.db.refresh(record)
        else:
            self.db.flush()
        return record

    def delete_all(self) -> None:
        self.db.query(EvaluationHistoryModel).delete()
        self.db.commit()
