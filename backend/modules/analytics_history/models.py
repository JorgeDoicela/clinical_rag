from sqlalchemy import Column, Integer, String, Float, Text
from core.database import Base


class EvaluationHistoryModel(Base):
    """
    Entidad relacional persistida de cada simulación diagnóstica evaluada por el sistema RAG.
    Agnóstica de motor (compatible con SQLite y clústeres PostgreSQL en producción).
    """
    __tablename__ = "evaluation_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(100), nullable=False, index=True)
    user_email = Column(String(150), nullable=False, index=True)
    case_id = Column(String(100), nullable=False, index=True)
    guia_asociada = Column(String(150), nullable=False)
    case_title = Column(String(255), nullable=False)
    score = Column(Float, nullable=False)
    score_max = Column(Integer, nullable=False, default=10)
    aciertos_json = Column(Text, nullable=False, default="[]")
    omisiones_json = Column(Text, nullable=False, default="[]")
    competencias_json = Column(Text, nullable=False, default="[]")
    cita_normativa_json = Column(Text, nullable=False, default="{}")
    retroalimentacion_general = Column(Text, nullable=False, default="")
    timestamp = Column(String(50), nullable=False, index=True)
