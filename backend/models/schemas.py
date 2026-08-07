from pydantic import BaseModel, Field
from typing import List, Optional

class CitaNormativa(BaseModel):
    guia: str = Field(..., description="Nombre de la Guía de Práctica Clínica del MSP Ecuador")
    seccion: str = Field(..., description="Sección o capítulo relevante dentro de la norma")
    pagina: Optional[int] = Field(None, description="Número de página de la norma si está disponible")
    texto_relevante: str = Field(..., description="Cita textual o fragmento normativo exacto de respaldo")

class EvaluationResult(BaseModel):
    score: float = Field(..., ge=0, le=10, description="Puntuación cualitativa/cuantitativa entre 0 y 10")
    score_max: int = Field(10, description="Puntuación máxima posible")
    aciertos: List[str] = Field(default_factory=list, description="Lista de aspectos clínicos acertados por el estudiante")
    omisiones: List[str] = Field(default_factory=list, description="Lista de Omisiones o elementos de la norma no abordados")
    cita_normativa: CitaNormativa = Field(..., description="Referencia explícita a la norma MSP")
    retroalimentacion_general: str = Field(..., description="Retroalimentación formativa y constructiva para el estudiante")

class EvaluationRequest(BaseModel):
    case_id: str = Field(..., description="ID del caso clínico evaluado")
    respuesta_estudiante: str = Field(..., description="Texto libre con el razonamiento del estudiante")

class ClinicalCaseSchema(BaseModel):
    id: str
    guia_asociada: str
    titulo: str
    enunciado: str
    pregunta: str
    nivel_esperado: Optional[str] = "pregrado_avanzado"
    fragmento_gpc_ideal_id: Optional[str] = None
