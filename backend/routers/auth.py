from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from models.schemas import LoginRequest, TokenResponse, UserResponse, UserRole
from auth.security import (
    DEMO_USERS_DB,
    verify_password,
    create_access_token,
    get_current_user,
    require_roles
)

router = APIRouter(prefix="/auth", tags=["Autenticación"])

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    email_clean = req.email.strip().lower()
    user = DEMO_USERS_DB.get(email_clean)
    
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo electrónico o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario está desactivada"
        )
    
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

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: UserResponse = Depends(get_current_user)):
    return current_user

@router.get("/users", response_model=List[UserResponse])
async def list_users(current_user: UserResponse = Depends(require_roles([UserRole.ADMINISTRADOR]))):
    return [
        UserResponse(id=u.id, email=u.email, nombre=u.nombre, rol=u.rol)
        for u in DEMO_USERS_DB.values()
    ]
