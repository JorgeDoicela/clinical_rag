from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from modules.auth.models import UserModel


class UserRepository:
    """
    Repositorio de persistencia relacional para usuarios e identidades.
    Aísla las consultas SQL de la lógica de negocio de autenticación.
    """
    def __init__(self, db: Session):
        self.db = db

    def count(self) -> int:
        return self.db.query(func.count(UserModel.id)).scalar() or 0

    def get_by_id(self, user_id: str) -> Optional[UserModel]:
        return self.db.query(UserModel).filter(UserModel.id == user_id).first()

    def get_by_email(self, email: str) -> Optional[UserModel]:
        return self.db.query(UserModel).filter(UserModel.email == email.strip().lower()).first()

    def get_all(self) -> List[UserModel]:
        return self.db.query(UserModel).all()

    def create(self, user: UserModel) -> UserModel:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update(self, user: UserModel) -> UserModel:
        self.db.commit()
        self.db.refresh(user)
        return user
