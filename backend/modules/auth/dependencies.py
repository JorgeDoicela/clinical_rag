from fastapi import Depends
from sqlalchemy.orm import Session
from core.database import get_db
from modules.auth.repository import UserRepository
from modules.auth.service import AuthService


def get_user_repository(db: Session = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


def get_auth_service(repo: UserRepository = Depends(get_user_repository)) -> AuthService:
    service = AuthService(repository=repo)
    service.seed_demo_users_if_needed()
    return service
