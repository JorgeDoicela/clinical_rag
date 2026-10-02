from sqlalchemy import Column, String, Text, ForeignKey, func
from core.database import Base, SafeDateTime
from modules.auth.models import UserModel, TenantModel  # noqa: F401


class AteneoRoomModel(Base):
    """
    Entidad relacional persistida de las salas de Ateneo sincrónico en tiempo real.
    Agnóstica de motor (SQLite en desarrollo con WAL / PostgreSQL en producción).
    """
    __tablename__ = "ateneo_rooms"

    room_code = Column(String(20), primary_key=True, index=True)
    case_id = Column(String(100), nullable=False, index=True)
    docente_id = Column(String(100), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    docente_nombre = Column(String(150), nullable=False)
    estado = Column(String(50), nullable=False, default="espera")
    tenant_id = Column(
        String(50),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        nullable=False,
        default="tenant_default",
        server_default="tenant_default",
        index=True
    )
    data_json = Column(Text, nullable=False, default="{}")
    created_at = Column(SafeDateTime, server_default=func.now(), nullable=False)
    updated_at = Column(SafeDateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

