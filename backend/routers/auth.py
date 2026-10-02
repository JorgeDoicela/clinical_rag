from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from models.schemas import LoginRequest, TokenResponse, UserResponse, UserRole
from auth.security import get_current_user, require_roles
from modules.auth.dependencies import get_auth_service
from modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Autenticación"])

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, auth_service: AuthService = Depends(get_auth_service)):
    try:
        result = auth_service.authenticate(req)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Correo electrónico o contraseña incorrectos",
                headers={"WWW-Authenticate": "Bearer"}
            )
        return result
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: UserResponse = Depends(get_current_user)):
    return current_user

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    current_user: UserResponse = Depends(require_roles([UserRole.ADMINISTRADOR])),
    auth_service: AuthService = Depends(get_auth_service)
):
    return auth_service.list_users()
