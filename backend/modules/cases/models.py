"""
Entidad relacional para Casos Clínicos persistidos en base de datos.
Permite a los docentes crear, versionar y publicar casos dinámicos institucionales.
"""
from sqlalchemy import Column, String, Text, JSON, DateTime, func
from core.database import Base


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
    creado_por = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
