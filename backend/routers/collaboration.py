from fastapi import APIRouter, HTTPException, Form, Body, Depends
from typing import Optional, Dict, Any
from models.room_session import create_room, get_room, join_room, change_room_status, submit_student_answer
from models.clinical_case import get_case_by_id
from rag.retriever import retrieve_relevant_chunk
from rag.evaluator import evaluate_clinical_reasoning
from auth.security import get_current_user, UserResponse

router = APIRouter(prefix="/api/ateneo", tags=["Ateneo de Sala Colaborativo"])

@router.post("/create")
async def create_ateneo_room(
    case_id: str = Form(...),
    docente_id: str = Form("usr_docente_001"),
    docente_nombre: str = Form("Dr. Carlos Andrade (Docente)"),
    current_user: Optional[UserResponse] = Depends(get_current_user)
):
    """
    Docente crea una sala de Ateneo sincrónica para un caso clínico.
    """
    try:
        real_docente_id = current_user.id if current_user else docente_id
        real_docente_nombre = current_user.nombre if current_user else docente_nombre
        room = create_room(case_id, real_docente_id, real_docente_nombre)
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
    current_user: Optional[UserResponse] = Depends(get_current_user)
):
    """
    Unirse a una sala de Ateneo activa usando el room_code de 6 caracteres.
    """
    try:
        real_user_id = current_user.id if current_user else user_id
        real_user_email = current_user.email if current_user else user_email
        real_user_nombre = current_user.nombre if current_user else user_nombre
        real_user_rol = current_user.rol.value if current_user else user_rol

        room = join_room(room_code, real_user_id, real_user_email, real_user_nombre, real_user_rol)
        return room
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/room/{room_code}")
async def get_room_state(room_code: str):
    """
    Retorna el estado en tiempo real de la sala de Ateneo.
    """
    room = get_room(room_code)
    if not room:
        raise HTTPException(status_code=404, detail=f"Sala '{room_code}' no encontrada.")
    return room

@router.post("/room/{room_code}/status")
async def update_room_status(
    room_code: str,
    nuevo_estado: str = Form(...),
    docente_id: str = Form("usr_docente_001"),
    current_user: Optional[UserResponse] = Depends(get_current_user)
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
        room = change_room_status(room_code, nuevo_estado, docente_id)
        return room
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/room/{room_code}/submit")
async def submit_ateneo_answer(
    room_code: str,
    user_email: str = Form(...),
    respuesta_estudiante: str = Form(...)
):
    """
    Estudiante envía su razonamiento dentro de la sala de Ateneo.
    Se ejecuta la evaluación RAG y se almacena en la sala para la fase de discusión.
    """
    room = get_room(room_code)
    if not room:
        raise HTTPException(status_code=404, detail=f"La sala '{room_code}' no existe.")

    caso = get_case_by_id(room["case_id"])
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
    updated_room = submit_student_answer(
        room_code=room_code,
        user_email=user_email,
        respuesta_estudiante=respuesta_estudiante,
        eval_result=resultado_eval.dict()
    )

    return {
        "status": "ok",
        "evaluacion": resultado_eval,
        "room": updated_room
    }
