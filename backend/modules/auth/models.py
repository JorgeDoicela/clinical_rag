import datetime
from sqlalchemy import Column, String, Boolean
from core.database import Base


class UserModel(Base):
    """
    Entidad relacional persistida de usuarios e identidades del sistema Ateneo+.
    Agnóstica de motor (SQLite en desarrollo con modo WAL / PostgreSQL en producción).
    """
    __tablename__ = "users"

    id = Column(String(100), primary_key=True, index=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    nombre = Column(String(200), nullable=False)
    rol = Column(String(50), nullable=False, default="alumno")
    hashed_password = Column(String(255), nullable=False)
    activo = Column(Boolean, nullable=False, default=True)
    created_at = Column(String(50), nullable=False, default=lambda: datetime.datetime.utcnow().isoformat())
