"""
Módulo de compatibilidad para backend/models/room_session.py.
Delega en modules/collaboration/service.py (SQLAlchemy + Repository Pattern).
"""
from typing import Dict, Any, Optional
from core.database import SessionLocal, init_database
from modules.collaboration.repository import RoomRepository
from modules.collaboration.service import CollaborationService
from modules.cases.dependencies import get_case_service

init_database()

ATENEO_ROOMS_DB: Dict[str, Dict[str, Any]] = {}


def _get_service() -> CollaborationService:
    db = SessionLocal()
    repo = RoomRepository(db)
    case_service = get_case_service()
    return CollaborationService(repository=repo, case_service=case_service)


def calculate_room_analytics(room: Dict[str, Any]) -> Dict[str, Any]:
    service = _get_service()
    return service.calculate_room_analytics(room)


def create_room(case_id: str, docente_id: str, docente_nombre: str, custom_code: Optional[str] = None) -> Dict[str, Any]:
    service = _get_service()
    room = service.create_room(case_id, docente_id, docente_nombre, custom_code)
    ATENEO_ROOMS_DB[room["room_code"]] = room
    return room


def get_room(room_code: str) -> Optional[Dict[str, Any]]:
    service = _get_service()
    room = service.get_room(room_code)
    if room:
        ATENEO_ROOMS_DB[room["room_code"]] = room
    return room


def join_room(room_code: str, user_id: str, user_email: str, user_nombre: str, user_rol: str) -> Dict[str, Any]:
    service = _get_service()
    room = service.join_room(room_code, user_id, user_email, user_nombre, user_rol)
    ATENEO_ROOMS_DB[room["room_code"]] = room
    return room


def change_room_status(room_code: str, nuevo_estado: str, docente_id: str) -> Dict[str, Any]:
    service = _get_service()
    room = service.change_room_status(room_code, nuevo_estado, docente_id)
    ATENEO_ROOMS_DB[room["room_code"]] = room
    return room


def submit_student_answer(room_code: str, user_email: str, respuesta_estudiante: str, eval_result: Dict[str, Any]) -> Dict[str, Any]:
    service = _get_service()
    room = service.submit_student_answer(room_code, user_email, respuesta_estudiante, eval_result)
    ATENEO_ROOMS_DB[room["room_code"]] = room
    return room


def seed_demo_ateneo_rooms() -> None:
    service = _get_service()
    service.seed_demo_rooms_if_needed()


# Sembrar salas demo automáticamente
seed_demo_ateneo_rooms()
