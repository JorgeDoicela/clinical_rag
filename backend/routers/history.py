from fastapi import APIRouter, Depends, Query
from typing import Optional, Dict, Any, List
from models.history_db import get_user_evaluation_history, analyze_user_trends, analyze_coordinator_cohort_analytics
from auth.security import get_current_user, UserResponse

router = APIRouter(prefix="/api/history", tags=["Historial y Analítica de Razonamiento"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_history(
    user_id: Optional[str] = Query(None, description="ID o email del usuario opcional"),
    current_user: Optional[UserResponse] = Depends(get_current_user)
):
    """
    Retorna la lista del historial de evaluaciones del estudiante.
    """
    target_user = user_id or (current_user.email if current_user else "usr_alumno_001")
    return get_user_evaluation_history(target_user)

@router.get("/trends", response_model=Dict[str, Any])
async def get_trends(
    user_id: Optional[str] = Query(None, description="ID o email del usuario opcional"),
    current_user: Optional[UserResponse] = Depends(get_current_user)
):
    """
    Retorna las métricas de analítica de tendencias:
    - Gráfica de score en el tiempo por área de GPC.
    - Punto débil principal detectado ("Tu punto débil: ...").
    - Lista de patrones de omisiones más frecuentes.
    - Radar de competencias por eje clínico.
    """
    target_user = user_id or (current_user.email if current_user else "usr_alumno_001")
    return analyze_user_trends(target_user)

@router.get("/coordinator-analytics", response_model=Dict[str, Any])
async def get_coordinator_analytics(
    cohorte_id: Optional[str] = Query(None, description="ID de la cohorte académica opcional")
):
    """
    Retorna el reporte de Inteligencia Institucional B2B para Coordinación Académica:
    - Porcentaje de falla por módulo GPC en la cohorte (ej: 'El 68% de tus estudiantes falla en...').
    - Desglose de brechas masivas por módulo y ranking de deficiencias institucionales.
    """
    return analyze_coordinator_cohort_analytics(cohorte_id)
