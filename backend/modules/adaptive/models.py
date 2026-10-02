import datetime
from sqlalchemy import Column, Integer, String, Float, Text
from core.database import Base


class StudentMasteryModel(Base):
    """
    Entidad relacional persistida del estado consolidado de maestría BKT del estudiante.
    Agnóstica de motor (SQLite WAL / PostgreSQL).
    """
    __tablename__ = "student_mastery"

    user_id = Column(String(100), primary_key=True, index=True)
    state_json = Column(Text, nullable=False, default="{}")
    updated_at = Column(String(50), nullable=False, default=lambda: datetime.datetime.utcnow().isoformat())


class StudentSnapshotModel(Base):
    """
    Entidad relacional persistida de la trayectoria longitudinal de aprendizaje (snapshots BKT).
    Permite reconstruir curvas psicométricas sin recalcular el histórico completo.
    """
    __tablename__ = "student_learning_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(100), nullable=False, index=True)
    session_num = Column(Integer, nullable=False)
    score_obtained = Column(Float, nullable=False)
    state_json = Column(Text, nullable=False, default="{}")
    timestamp = Column(String(50), nullable=False, default=lambda: datetime.datetime.utcnow().isoformat())
