from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from modules.auth.models import UserModel, TenantModel


class TenantRepository:
    """
    Repositorio de persistencia relacional para Instituciones / Tenants.
    Permite administrar facultades, hospitales y redes de salud con particionado lógico.
    """
    def __init__(self, db: Session):
        self.db = db

    def count(self) -> int:
        return self.db.query(func.count(TenantModel.id)).scalar() or 0

    def get_by_id(self, tenant_id: str) -> Optional[TenantModel]:
        return self.db.query(TenantModel).filter(TenantModel.id == tenant_id).first()

    def get_by_codigo(self, codigo: str) -> Optional[TenantModel]:
        return self.db.query(TenantModel).filter(TenantModel.codigo == codigo.strip().lower()).first()

    def get_by_dominio(self, dominio: str) -> Optional[TenantModel]:
        return self.db.query(TenantModel).filter(TenantModel.dominio_email == dominio.strip().lower()).first()

    def get_all(self, solo_activos: bool = False) -> List[TenantModel]:
        query = self.db.query(TenantModel)
        if solo_activos:
            query = query.filter(TenantModel.activo == True)
        return query.all()

    def create(self, tenant: TenantModel, commit: bool = True) -> TenantModel:
        self.db.add(tenant)
        if commit:
            self.db.commit()
            self.db.refresh(tenant)
        else:
            self.db.flush()
        return tenant

    def update(self, tenant: TenantModel, commit: bool = True) -> TenantModel:
        if commit:
            self.db.commit()
            self.db.refresh(tenant)
        else:
            self.db.flush()
        return tenant



class UserRepository:
    """
    Repositorio de persistencia relacional para usuarios e identidades.
    Aísla las consultas SQL de la lógica de negocio de autenticación y soporta
    filtrado por tenant institucional.
    """
    def __init__(self, db: Session):
        self.db = db

    def count(self, tenant_id: Optional[str] = None) -> int:
        query = self.db.query(func.count(UserModel.id))
        if tenant_id:
            query = query.filter(UserModel.tenant_id == tenant_id)
        return query.scalar() or 0

    def get_by_id(self, user_id: str) -> Optional[UserModel]:
        return self.db.query(UserModel).filter(UserModel.id == user_id).first()

    def get_by_email(self, email: str) -> Optional[UserModel]:
        return self.db.query(UserModel).filter(UserModel.email == email.strip().lower()).first()

    def get_all(self, tenant_id: Optional[str] = None) -> List[UserModel]:
        query = self.db.query(UserModel)
        if tenant_id:
            query = query.filter(UserModel.tenant_id == tenant_id)
        return query.all()

    def get_by_tenant(self, tenant_id: str) -> List[UserModel]:
        return self.db.query(UserModel).filter(UserModel.tenant_id == tenant_id).all()

    def create(self, user: UserModel, commit: bool = True) -> UserModel:
        self.db.add(user)
        if commit:
            self.db.commit()
            self.db.refresh(user)
        else:
            self.db.flush()
        return user

    def update(self, user: UserModel, commit: bool = True) -> UserModel:
        if commit:
            self.db.commit()
            self.db.refresh(user)
        else:
            self.db.flush()
        return user


