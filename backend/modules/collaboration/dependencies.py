from fastapi import Depends
from sqlalchemy.orm import Session
from core.database import get_db
from modules.collaboration.repository import RoomRepository
from modules.collaboration.service import CollaborationService
from modules.cases.dependencies import get_case_service
from modules.cases.service import CaseService


def get_room_repository(db: Session = Depends(get_db)) -> RoomRepository:
    return RoomRepository(db)


def get_collaboration_service(
    repo: RoomRepository = Depends(get_room_repository),
    case_service: CaseService = Depends(get_case_service)
) -> CollaborationService:
    return CollaborationService(repository=repo, case_service=case_service)
