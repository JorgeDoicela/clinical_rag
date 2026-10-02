import os
import datetime
from typing import List, Optional
from core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
)
from models.schemas import LoginRequest, TokenResponse, UserResponse, UserRole, User
from modules.auth.models import UserModel
from modules.auth.repository import UserRepository


class AuthService:
    """
    Servicio de Dominio para Autenticación e Identidad.
    Centraliza el login, verificación de credenciales y emisión de tokens JWT,
    apoyado en un repositorio de persistencia durable.
    """
    def __init__(self, repository: UserRepository):
        self.repository = repository

    def seed_demo_users_if_needed(self) -> None:
        """Siembra los 3 perfiles demo institucionales si la base de datos de usuarios está vacía."""
        if self.repository.count() > 0:
            return

        demo_users = [
            {
                "id": "usr_admin_001",
                "email": "admin@ateneo.edu.ec",
                "nombre": "Dra. Valeria Gómez (Administradora)",
                "rol": UserRole.ADMINISTRADOR.value,
                "password": os.getenv("DEMO_ADMIN_PASSWORD", "Admin123!")
            },
            {
                "id": "usr_docente_001",
                "email": "docente@ateneo.edu.ec",
                "nombre": "Dr. Carlos Andrade (Docente de Medicina)",
                "rol": UserRole.DOCENTE.value,
                "password": os.getenv("DEMO_DOCENTE_PASSWORD", "Docente123!")
            },
            {
                "id": "usr_alumno_001",
                "email": "alumno@ateneo.edu.ec",
                "nombre": "Estudiante María José Silva",
                "rol": UserRole.ALUMNO.value,
                "password": os.getenv("DEMO_ALUMNO_PASSWORD", "Alumno123!")
            },
            {
                "id": "usr_estudiante_002",
                "email": "juan.perez@ateneo.edu.ec",
                "nombre": "Estudiante Juan Pérez",
                "rol": UserRole.ALUMNO.value,
                "password": os.getenv("DEMO_ALUMNO_PASSWORD", "Alumno123!")
            },
            {
                "id": "usr_estudiante_003",
                "email": "carolina.mendoza@ateneo.edu.ec",
                "nombre": "Estudiante Carolina Mendoza",
                "rol": UserRole.ALUMNO.value,
                "password": os.getenv("DEMO_ALUMNO_PASSWORD", "Alumno123!")
            },
            {
                "id": "usr_estudiante_004",
                "email": "mateo.torres@ateneo.edu.ec",
                "nombre": "Estudiante Mateo Torres",
                "rol": UserRole.ALUMNO.value,
                "password": os.getenv("DEMO_ALUMNO_PASSWORD", "Alumno123!")
            },
            {
                "id": "usr_estudiante_005",
                "email": "sofia.gallegos@ateneo.edu.ec",
                "nombre": "Estudiante Sofía Gallegos",
                "rol": UserRole.ALUMNO.value,
                "password": os.getenv("DEMO_ALUMNO_PASSWORD", "Alumno123!")
            },
            {
                "id": "usr_estudiante_006",
                "email": "david.moreno@ateneo.edu.ec",
                "nombre": "Estudiante David Moreno",
                "rol": UserRole.ALUMNO.value,
                "password": os.getenv("DEMO_ALUMNO_PASSWORD", "Alumno123!")
            },
            {
                "id": "usr_estudiante_007",
                "email": "valeria.castro@ateneo.edu.ec",
                "nombre": "Estudiante Valeria Castro",
                "rol": UserRole.ALUMNO.value,
                "password": os.getenv("DEMO_ALUMNO_PASSWORD", "Alumno123!")
            }
        ]

        now = datetime.datetime.utcnow().isoformat()
        for u in demo_users:
            record = UserModel(
                id=u["id"],
                email=u["email"].lower(),
                nombre=u["nombre"],
                rol=u["rol"],
                hashed_password=get_password_hash(u["password"]),
                activo=True,
                tenant_id="tenant_default",
                created_at=now
            )
            self.repository.create(record)

    def authenticate(self, req: LoginRequest) -> Optional[TokenResponse]:
        email_clean = req.email.strip().lower()
        user_record = self.repository.get_by_email(email_clean)

        if not user_record or not verify_password(req.password, user_record.hashed_password):
            return None

        if not user_record.activo:
            raise PermissionError("La cuenta de usuario está desactivada")

        role_enum = UserRole(user_record.rol)
        resolved_tenant = getattr(user_record, "tenant_id", "tenant_default") or "tenant_default"
        user_domain = User(
            id=user_record.id,
            email=user_record.email,
            nombre=user_record.nombre,
            rol=role_enum,
            hashed_password=user_record.hashed_password,
            activo=user_record.activo,
            tenant_id=resolved_tenant
        )

        access_token = create_access_token(user_domain)
        user_res = UserResponse(
            id=user_record.id,
            email=user_record.email,
            nombre=user_record.nombre,
            rol=role_enum,
            tenant_id=resolved_tenant
        )

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_res
        )

    def list_users(self, tenant_id: Optional[str] = None) -> List[UserResponse]:
        records = self.repository.get_all(tenant_id=tenant_id)
        return [
            UserResponse(
                id=u.id,
                email=u.email,
                nombre=u.nombre,
                rol=UserRole(u.rol),
                tenant_id=getattr(u, "tenant_id", "tenant_default") or "tenant_default"
            )
            for u in records
        ]

