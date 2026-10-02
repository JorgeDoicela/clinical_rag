from typing import List, Optional
from auth.security import (
    DEMO_USERS_DB,
    verify_password,
    create_access_token,
)
from models.schemas import LoginRequest, TokenResponse, UserResponse, User


class AuthService:
    """
    Servicio de Dominio para Autenticación e Identidad.
    Centraliza el login, verificación de credenciales y emisión de tokens JWT.
    """
    def authenticate(self, req: LoginRequest) -> Optional[TokenResponse]:
        email_clean = req.email.strip().lower()
        user = DEMO_USERS_DB.get(email_clean)

        if not user or not verify_password(req.password, user.hashed_password):
            return None

        if not user.activo:
            raise PermissionError("La cuenta de usuario está desactivada")

        access_token = create_access_token(user)
        user_res = UserResponse(
            id=user.id,
            email=user.email,
            nombre=user.nombre,
            rol=user.rol
        )

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_res
        )

    def list_users(self) -> List[UserResponse]:
        return [
            UserResponse(id=u.id, email=u.email, nombre=u.nombre, rol=u.rol)
            for u in DEMO_USERS_DB.values()
        ]
