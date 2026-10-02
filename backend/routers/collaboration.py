from fastapi import APIRouter, HTTPException, Form, Depends
from typing import Optional, Dict, Any
from modules.collaboration.dependencies import get_collaboration_service
from modules.collaboration.service import CollaborationService
from modules.cases.dependencies import get_case_service
from modules.cases.service import CaseService
from rag.retriever import retrieve_relevant_chunk
from rag.evaluator import evaluate_clinical_reasoning
from auth.security import get_current_user, UserResponse

router = APIRouter(prefix="/api/ateneo", tags=["Ateneo de Sala Colaborativo"])

@router.post("/create")
async def create_ateneo_room(
    case_id: str = Form(...),
    docente_id: str = Form("usr_docente_001"),
    docente_nombre: str = Form("Dr. Carlos Andrade (Docente)"),
    current_user: Optional[UserResponse] = Depends(get_current_user),
    collab_service: CollaborationService = Depends(get_collaboration_service)
):
    """
    Docente crea una sala de Ateneo sincrónica para un caso clínico.
    """
    try:
        real_docente_id = current_user.id if current_user else docente_id
        real_docente_nombre = current_user.nombre if current_user else docente_nombre
        room = collab_service.create_room(case_id, real_docente_id, real_docente_nombre)
        return room
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/join")
async def join_ateneo_room(
    room_code: str = Form(...),
    user_id: str = Form("usr_alumno_001"),
    user_email: str = Form("alumno@ateneo.edu.ec"),
    user_nombre: str = Form("Estudiante María José Silva"),
    user_rol: str = Form("alumno"),
    current_user: Optional[UserResponse] = Depends(get_current_user),
    collab_service: CollaborationService = Depends(get_collaboration_service)
):
    """
    Unirse a una sala de Ateneo activa usando el room_code de 6 caracteres.
    """
    try:
        real_user_id = current_user.id if current_user else user_id
        real_user_email = current_user.email if current_user else user_email
        real_user_nombre = current_user.nombre if current_user else user_nombre
        real_user_rol = current_user.rol.value if current_user else user_rol

        room = collab_service.join_room(room_code, real_user_id, real_user_email, real_user_nombre, real_user_rol)
        return room
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/room/{room_code}")
async def get_room_state(
    room_code: str,
    collab_service: CollaborationService = Depends(get_collaboration_service)
):
    """
    Retorna el estado en tiempo real de la sala de Ateneo.
    """
    room = collab_service.get_room(room_code)
    if not room:
        raise HTTPException(status_code=404, detail=f"Sala '{room_code}' no encontrada.")
    return room

@router.post("/room/{room_code}/status")
async def update_room_status(
    room_code: str,
    nuevo_estado: str = Form(...),
    docente_id: str = Form("usr_docente_001"),
    current_user: Optional[UserResponse] = Depends(get_current_user),
    collab_service: CollaborationService = Depends(get_collaboration_service)
):
    """
    Docente cambia la fase de la sala ('espera' -> 'resolucion' -> 'discusion' -> 'finalizado').
    Requiere que el usuario autenticado sea docente o el creador de la sala.
    """
    if current_user and current_user.rol not in ["docente", "administrador"]:
        raise HTTPException(
            status_code=403,
            detail="Acceso denegado: solo el docente moderador o un administrador puede cambiar el estado de la sala."
        )

    try:
        room = collab_service.change_room_status(room_code, nuevo_estado, docente_id)
        return room
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/room/{room_code}/submit")
async def submit_ateneo_answer(
    room_code: str,
    user_email: str = Form(...),
    respuesta_estudiante: str = Form(...),
    collab_service: CollaborationService = Depends(get_collaboration_service),
    case_service: CaseService = Depends(get_case_service)
):
    """
    Estudiante envía su razonamiento dentro de la sala de Ateneo.
    Se ejecuta la evaluación RAG y se almacena en la sala para la fase de discusión.
    """
    room = collab_service.get_room(room_code)
    if not room:
        raise HTTPException(status_code=404, detail=f"La sala '{room_code}' no existe.")

    caso = case_service.get_case(room["case_id"])
    if not caso:
        raise HTTPException(status_code=404, detail="Caso clínico no encontrado.")

    # Recuperación RAG
    chunk = retrieve_relevant_chunk(
        query=respuesta_estudiante,
        guia_filtro=caso.guia_asociada
    )

    # Evaluación LLM Gemini
    resultado_eval = evaluate_clinical_reasoning(
        caso=caso,
        respuesta_estudiante=respuesta_estudiante,
        chunk=chunk
    )

    # Actualizar estado de respuesta del estudiante en la sala
    eval_dict = resultado_eval.model_dump() if hasattr(resultado_eval, "model_dump") else resultado_eval.dict()
    updated_room = collab_service.submit_student_answer(
        room_code=room_code,
        user_email=user_email,
        respuesta_estudiante=respuesta_estudiante,
        eval_result=eval_dict
    )

    return {
        "status": "ok",
        "evaluacion": resultado_eval,
        "room": updated_room
    }
