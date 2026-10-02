from fastapi import APIRouter, Depends, Query
from typing import Optional, Dict, Any, List
from auth.security import get_optional_current_user, UserResponse
from modules.adaptive.dependencies import get_adaptive_service
from modules.adaptive.service import AdaptiveCurriculumService

router = APIRouter(prefix="/api/adaptive", tags=["Currículo Adaptativo e Inteligencia ITS"])

@router.get("/next-case", response_model=Dict[str, Any])
async def get_adaptive_next_case(
    student_id: Optional[str] = Query(None, description="ID del estudiante"),
    current_user: Optional[UserResponse] = Depends(get_optional_current_user),
    adaptive_service: AdaptiveCurriculumService = Depends(get_adaptive_service)
):
    """
    Retorna la recomendación proactiva del caso clínico óptimo según KST, BKT y la ZDP de Vygotsky.
    """
    target_id = student_id or (current_user.id if current_user else "usr_alumno_001")
    return adaptive_service.get_optimal_next_case(target_id)

@router.get("/knowledge-state", response_model=Dict[str, Any])
async def get_adaptive_knowledge_state(
    student_id: Optional[str] = Query(None, description="ID del estudiante"),
    current_user: Optional[UserResponse] = Depends(get_optional_current_user),
    adaptive_service: AdaptiveCurriculumService = Depends(get_adaptive_service)
):
    """
    Retorna el estado de dominio continuo de las 7 competencias clínicas del grafo KST.
    """
    target_id = student_id or (current_user.id if current_user else "usr_alumno_001")
    return adaptive_service.get_knowledge_state(target_id)

@router.get("/learning-path", response_model=List[Dict[str, Any]])
async def get_adaptive_learning_path(
    student_id: Optional[str] = Query(None, description="ID del estudiante"),
    current_user: Optional[UserResponse] = Depends(get_optional_current_user),
    adaptive_service: AdaptiveCurriculumService = Depends(get_adaptive_service)
):
    """
    Retorna la trayectoria longitudinal de aprendizaje del estudiante (snapshots BKT).
    """
    target_id = student_id or (current_user.id if current_user else "usr_alumno_001")
    return adaptive_service.get_learning_path(target_id)

@router.get("/topology", response_model=Dict[str, Any])
async def get_adaptive_topology(
    adaptive_service: AdaptiveCurriculumService = Depends(get_adaptive_service)
):
    """
    Retorna la estructura estática del grafo de competencias y prerrequisitos KST.
    """
    return adaptive_service.get_topology()
