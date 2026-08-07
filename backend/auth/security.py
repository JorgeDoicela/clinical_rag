import os
import datetime
from typing import List, Optional
import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models.schemas import User, UserRole, UserResponse

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "ateneo_clinical_rag_secret_key_2026_msp_ecuador")
if os.getenv("ENVIRONMENT") == "production" and SECRET_KEY == "ateneo_clinical_rag_secret_key_2026_msp_ecuador":
    raise RuntimeError("CRÍTICO: JWT_SECRET_KEY debe estar configurado en el entorno de producción.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))  # Default 2 horas

pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")
security_scheme = HTTPBearer()

# Base de datos demo en memoria de usuarios preconfigurados para evaluación
DEMO_USERS_DB: dict[str, User] = {}

def init_demo_users():
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

# Inicializar inmediatamente
init_demo_users()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(user: User, expires_delta: Optional[datetime.timedelta] = None) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": user.email,
        "id": user.id,
        "nombre": user.nombre,
        "rol": user.rol.value,
        "exp": expire
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token de sesión ha expirado",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación no válido",
            headers={"WWW-Authenticate": "Bearer"}
        )

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> UserResponse:
    token = credentials.credentials
    payload = decode_access_token(token)
    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales de token no válidas"
        )
    
    user = DEMO_USERS_DB.get(email.lower())
    if not user or not user.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo"
        )
    
    return UserResponse(
        id=user.id,
        email=user.email,
        nombre=user.nombre,
        rol=user.rol
    )

def require_roles(allowed_roles: List[UserRole]):
    def role_checker(current_user: UserResponse = Depends(get_current_user)):
        if current_user.rol not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Se requiere uno de los siguientes roles: {[r.value for r in allowed_roles]}"
            )
        return current_user
    return role_checker
