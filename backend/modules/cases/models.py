"""
Entidad relacional para Casos Clínicos persistidos en base de datos.
Permite a los docentes crear, versionar y publicar casos dinámicos institucionales.
"""
from sqlalchemy import Column, String, Text, JSON, ForeignKey, func
from core.database import Base, SafeDateTime
from modules.auth.models import UserModel, TenantModel  # noqa: F401


class ClinicalCaseModel(Base):
    __tablename__ = "clinical_cases"

    id = Column(String(64), primary_key=True, index=True)
    guia_asociada = Column(String(128), nullable=False, index=True)
    titulo = Column(String(255), nullable=False)
    enunciado = Column(Text, nullable=False)
    pregunta = Column(Text, nullable=False)
    imagen_url = Column(String(255), nullable=True)
    nivel_esperado = Column(String(64), default="pregrado_avanzado")
    fragmento_gpc_ideal_id = Column(String(64), nullable=True)
    modo_simulacion = Column(String(32), default="single_turn")
    fases = Column(JSON, nullable=True)
    competencias_activadas = Column(JSON, nullable=True)
    creado_por = Column(String(100), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    tenant_id = Column(
        String(50),
        ForeignKey("tenants.id", ondelete="SET NULL"),
        nullable=True,
        default="tenant_default",
        server_default="tenant_default",
        index=True
    )
    created_at = Column(SafeDateTime, server_default=func.now())
    updated_at = Column(SafeDateTime, onupdate=func.now())

