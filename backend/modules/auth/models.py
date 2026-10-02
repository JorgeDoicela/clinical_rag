from sqlalchemy import Column, String, Boolean, Text, ForeignKey, func
from core.database import Base, SafeDateTime


class TenantModel(Base):
    """
    Entidad relacional persistida de Institución / Tenant (Universidad, Hospital o Red de Salud).
    Agnóstica de motor (SQLite en desarrollo con modo WAL / PostgreSQL en producción).
    Permite particionado lógico y gobernanza multi-institucional.
    """
    __tablename__ = "tenants"

    id = Column(String(50), primary_key=True, index=True)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nombre_institucional = Column(String(200), nullable=False)
    dominio_email = Column(String(100), nullable=False, index=True)
    gpc_activas_json = Column(Text, nullable=False, default="[]")
    activo = Column(Boolean, nullable=False, default=True)
    created_at = Column(SafeDateTime, server_default=func.now(), nullable=False)
    updated_at = Column(SafeDateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


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
    tenant_id = Column(
        String(50),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        nullable=False,
        default="tenant_default",
        server_default="tenant_default",
        index=True
    )
    created_at = Column(SafeDateTime, server_default=func.now(), nullable=False)

