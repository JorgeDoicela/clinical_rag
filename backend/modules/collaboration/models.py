from sqlalchemy import Column, String, Text
from core.database import Base


class AteneoRoomModel(Base):
    """
    Entidad relacional persistida de las salas de Ateneo sincrónico en tiempo real.
    Agnóstica de motor (SQLite en desarrollo con WAL / PostgreSQL en producción).
    """
    __tablename__ = "ateneo_rooms"

    room_code = Column(String(20), primary_key=True, index=True)
    case_id = Column(String(100), nullable=False, index=True)
    docente_id = Column(String(100), nullable=False)
    docente_nombre = Column(String(150), nullable=False)
    estado = Column(String(50), nullable=False, default="espera")
    data_json = Column(Text, nullable=False, default="{}")
    updated_at = Column(String(50), nullable=False)
