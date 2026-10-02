from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, Index, func
from core.database import Base, SafeDateTime
from modules.auth.models import UserModel  # noqa: F401


class StudentMasteryModel(Base):
    """
    Entidad relacional persistida del estado consolidado de maestría BKT del estudiante.
    Agnóstica de motor (SQLite WAL / PostgreSQL).
    """
    __tablename__ = "student_mastery"

    user_id = Column(String(100), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True)
    state_json = Column(Text, nullable=False, default="{}")
    updated_at = Column(SafeDateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class StudentSnapshotModel(Base):
    """
    Entidad relacional persistida de la trayectoria longitudinal de aprendizaje (snapshots BKT).
    Permite reconstruir curvas psicométricas sin recalcular el histórico completo.
    """
    __tablename__ = "student_learning_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(100), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_num = Column(Integer, nullable=False)
    score_obtained = Column(Float, nullable=False)
    state_json = Column(Text, nullable=False, default="{}")
    timestamp = Column(SafeDateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_snapshot_user_session", "user_id", "session_num"),
    )
