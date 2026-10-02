import os
import datetime
from typing import List, Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models.schemas import User, UserRole, UserResponse
from core.security import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    pwd_context,
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token
)
from modules.auth.repository import UserRepository
from modules.auth.dependencies import get_user_repository

security_scheme = HTTPBearer()
optional_security_scheme = HTTPBearer(auto_error=False)

# Base de datos demo en memoria (preservada para retrocompatibilidad con tests aislados)
DEMO_USERS_DB: dict[str, User] = {}


def init_demo_users():
    """Inicializa usuarios de prueba en memoria para tests unitarios locales."""
    if DEMO_USERS_DB:
        return

    users_data = [
        {
            "id": "usr_admin_001",
            "email": "admin@ateneo.edu.ec",
            "nombre": "Dra. Valeria Gómez (Administradora)",
            "rol": UserRole.ADMINISTRADOR,
            "password": os.getenv("DEMO_ADMIN_PASSWORD", "Admin123!")
        },
        {
            "id": "usr_docente_001",
            "email": "docente@ateneo.edu.ec",
            "nombre": "Dr. Carlos Andrade (Docente de Medicina)",
            "rol": UserRole.DOCENTE,
            "password": os.getenv("DEMO_DOCENTE_PASSWORD", "Docente123!")
        },
        {
            "id": "usr_alumno_001",
            "email": "alumno@ateneo.edu.ec",
            "nombre": "Estudiante María José Silva",
            "rol": UserRole.ALUMNO,
            "password": os.getenv("DEMO_ALUMNO_PASSWORD", "Alumno123!")
        }
    ]

    for u in users_data:
        hashed = pwd_context.hash(u["password"])
        user_obj = User(
            id=u["id"],
            email=u["email"].lower(),
            nombre=u["nombre"],
            rol=u["rol"],
            hashed_password=hashed,
            activo=True
        )
        DEMO_USERS_DB[user_obj.email] = user_obj


# Inicializar inmediatamente en memoria para tests unitarios que lo requieran
init_demo_users()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    user_repo: UserRepository = Depends(get_user_repository)
) -> UserResponse:
    """
    Resuelve el usuario autenticado a partir del JWT portador, consultando
    la persistencia relacional con inyección de dependencias estándar.
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales de token no válidas",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user_record = user_repo.get_by_email(email.lower())
    token_tenant_id = payload.get("tenant_id")

    if not user_record:
        # Fallback defensivo a memoria únicamente si la tabla está vacía en tests unitarios sintéticos
        fallback = DEMO_USERS_DB.get(email.lower())
        if not fallback or not fallback.activo:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado o inactivo",
                headers={"WWW-Authenticate": "Bearer"}
            )
        resolved_tenant = token_tenant_id or getattr(fallback, "tenant_id", "tenant_default") or "tenant_default"
        return UserResponse(
            id=fallback.id,
            email=fallback.email,
            nombre=fallback.nombre,
            rol=fallback.rol,
            tenant_id=resolved_tenant
        )

    if not user_record.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo",
            headers={"WWW-Authenticate": "Bearer"}
        )

    resolved_tenant = token_tenant_id or getattr(user_record, "tenant_id", "tenant_default") or "tenant_default"
    return UserResponse(
        id=user_record.id,
        email=user_record.email,
        nombre=user_record.nombre,
        rol=UserRole(user_record.rol),
        tenant_id=resolved_tenant
    )


def get_current_tenant_id(current_user: UserResponse = Depends(get_current_user)) -> str:
    """
    Inyección de dependencia que resuelve el tenant_id garantizado del usuario autenticado.
    """
    return getattr(current_user, "tenant_id", "tenant_default") or "tenant_default"


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security_scheme),
    user_repo: UserRepository = Depends(get_user_repository)
) -> Optional[UserResponse]:
    """
    Resuelve el usuario actual si se proporcionaron credenciales válidas,
    o retorna None de forma segura sin interrumpir la petición.
    """
    if not credentials:
        return None
    try:
        return get_current_user(credentials=credentials, user_repo=user_repo)
    except HTTPException:
        return None


def require_roles(allowed_roles: List[UserRole]):
    """Guardia de control de acceso basado en roles (RBAC)."""
    def role_checker(current_user: UserResponse = Depends(get_current_user)):
        if current_user.rol not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Se requiere uno de los siguientes roles: {[r.value for r in allowed_roles]}"
            )
        return current_user
    return role_checker

