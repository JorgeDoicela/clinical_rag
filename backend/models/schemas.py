from enum import Enum
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional

class EjeClinico(str, Enum):
    DIAGNOSTICO = "diagnóstico"
    TRATAMIENTO = "tratamiento"
    PREVENCION = "prevención"
    SEGUIMIENTO = "seguimiento"

class CitaNormativa(BaseModel):
    guia: str = Field(default="GPC MSP Ecuador", description="Nombre de la Guía de Práctica Clínica del MSP Ecuador")
    seccion: str = Field(default="General", description="Sección o capítulo relevante dentro de la norma")
    pagina: Optional[int] = Field(default=None, description="Número de página de la norma si está disponible")
    texto_relevante: str = Field(default="Normativa oficial del Ministerio de Salud Pública.", description="Cita textual o fragmento normativo exacto de respaldo")

class CompetenciaDeficiente(BaseModel):
    eje: EjeClinico = Field(..., description="Eje clínico: diagnóstico, tratamiento, prevención o seguimiento")
    descripcion: str = Field(..., description="Breve detalle de la competencia deficiente o brecha respecto a la GPC")

    @field_validator("eje", mode="before")
    @classmethod
    def normalize_eje(cls, v: str) -> str:
        if not isinstance(v, str):
            return "tratamiento"
        val = v.lower().strip()
        # Mapeo de sinónimos y variaciones ortográficas
        if any(w in val for w in ["diag", "evalua", "sintom", "presun"]):
            return EjeClinico.DIAGNOSTICO.value
        elif any(w in val for w in ["trat", "terap", "farmac", "dosis", "manej", "medic"]):
            return EjeClinico.TRATAMIENTO.value
        elif any(w in val for w in ["prev", "profila", "promoc", "vacun"]):
            return EjeClinico.PREVENCION.value
        elif any(w in val for w in ["segui", "monit", "evoluc", "control", "alta"]):
            return EjeClinico.SEGUIMIENTO.value
        return EjeClinico.TRATAMIENTO.value

class EvaluationResult(BaseModel):
    score: float = Field(..., ge=0, le=10, description="Puntuación cualitativa/cuantitativa entre 0 y 10")
    score_max: int = Field(10, description="Puntuación máxima posible")
    aciertos: List[str] = Field(default_factory=list, description="Lista de aspectos clínicos acertados por el estudiante")
    omisiones: List[str] = Field(default_factory=list, description="Lista de Omisiones o elementos de la norma no abordados")
    competencias_deficientes: List[CompetenciaDeficiente] = Field(
        default_factory=list, 
        description="Lista de competencias deficientes categorizadas por eje clínico (diagnóstico, tratamiento, prevención, seguimiento)"
    )
    cita_normativa: CitaNormativa = Field(..., description="Referencia explícita a la norma MSP")
    retroalimentacion_general: str = Field(..., description="Retroalimentación formativa y constructiva para el estudiante")
    # Faithfulness Score — Diferenciador Científico 3 (Anti-Alucinación Normativa)
    faithfulness_score: Optional[float] = Field(None, description="Proporción de afirmaciones clínicas respaldadas por el fragmento normativo recuperado")
    total_claims: Optional[int] = Field(None, description="Total de afirmaciones clínicas evaluadas")
    grounded_claims: Optional[int] = Field(None, description="Afirmaciones verificadas en el corpus normativo")
    grounding_level: Optional[str] = Field(None, description="Nivel de grounding normativo: Alto / Moderado / Bajo")

class EvaluationRequest(BaseModel):
    case_id: str = Field(..., description="ID del caso clínico evaluado")
    respuesta_estudiante: str = Field(..., description="Texto libre con el razonamiento del estudiante")

class PhaseSchema(BaseModel):
    fase_numero: int = Field(..., description="Número ordinal de la fase (1, 2, 3...)")
    titulo: str = Field(..., description="Título del hito clínico (ej. Anamnesis & Sospecha)")
    descripcion: str = Field(..., description="Contexto del paciente revelado en esta fase")
    datos_revelados: Optional[str] = Field(None, description="Datos de anamnesis o paraclínicos que se desbloquean")
    estudios_adjuntos: Optional[List[str]] = Field(default_factory=list, description="Lista de URLs de imágenes o estudios disponibles")
    pregunta_evaluativa: str = Field(..., description="Pregunta específica a responder en esta fase")
    ejes_evaluados: List[str] = Field(default_factory=lambda: ["diagnóstico"], description="Ejes clínicos foco de la fase")

class PhaseEvaluationResult(BaseModel):
    fase_numero: int = Field(..., description="Número de fase evaluada")
    score_fase: float = Field(..., ge=0, le=10, description="Puntaje de la fase (0-10)")
    aciertos: List[str] = Field(default_factory=list, description="Aciertos en la fase")
    omisiones: List[str] = Field(default_factory=list, description="Omisiones en la fase")
    competencias_deficientes: List[CompetenciaDeficiente] = Field(default_factory=list)
    cita_normativa: CitaNormativa = Field(..., description="Cita de GPC relevante para esta fase")
    retroalimentacion_fase: str = Field(..., description="Retroalimentación formativa de la fase")
    desbloquea_siguiente: bool = Field(default=True, description="Indica si se aprueba avanzar a la siguiente fase")
    datos_fase_siguiente: Optional[dict] = Field(None, description="Datos adicionales revelados para la próxima fase")

class ClinicalCaseSchema(BaseModel):
    id: str
    guia_asociada: str
    titulo: str
    enunciado: str
    pregunta: str
    imagen_url: Optional[str] = None
    nivel_esperado: Optional[str] = "pregrado_avanzado"
    fragmento_gpc_ideal_id: Optional[str] = None
    modo_simulacion: Optional[str] = "single_turn" # "single_turn" | "fases"
    fases: Optional[List[PhaseSchema]] = None
    competencias_activadas: Optional[List[str]] = None

from enum import Enum

class UserRole(str, Enum):
    ADMINISTRADOR = "administrador"
    DOCENTE = "docente"
    ALUMNO = "alumno"

class User(BaseModel):
    id: str
    email: str
    nombre: str
    rol: UserRole
    hashed_password: str
    activo: bool = True

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    nombre: str
    rol: UserRole

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


