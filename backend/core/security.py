import os
import datetime
from typing import Optional
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from models.schemas import User

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "ateneo_clinical_rag_secret_key_2026_msp_ecuador")
if os.getenv("ENVIRONMENT") == "production" and SECRET_KEY == "ateneo_clinical_rag_secret_key_2026_msp_ecuador":
    raise RuntimeError("CRÍTICO: JWT_SECRET_KEY debe estar configurado en el entorno de producción.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))  # Default 2 horas

pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si la contraseña en texto plano coincide con el hash almacenado."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Genera el hash criptográfico robusto de la contraseña."""
    return pwd_context.hash(password)


def resolve_tenant_from_email_domain(email: str) -> str:
    """
    Resuelve el identificador de tenant a partir del dominio del correo institucional.
    Si el dominio no está mapeado, degrada defensivamente a 'tenant_default'.
    """
    if not email or "@" not in email:
        return "tenant_default"
    domain = email.split("@")[-1].strip().lower()
    domain_map = {
        "ateneo.edu.ec": "tenant_default",
        "uce.edu.ec": "tenant_uce",
        "usfq.edu.ec": "tenant_usfq",
        "msp.gob.ec": "tenant_msp"
    }
    return domain_map.get(domain, "tenant_default")


def create_access_token(user: User, expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Emite un token JWT firmado criptográficamente con los claims del usuario y tenant institucional."""
    now = datetime.datetime.now(datetime.timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    tenant_id = getattr(user, "tenant_id", None) or resolve_tenant_from_email_domain(user.email)

    to_encode = {
        "sub": user.email,
        "id": user.id,
        "nombre": user.nombre,
        "rol": user.rol.value if hasattr(user.rol, "value") else str(user.rol),
        "tenant_id": tenant_id,
        "exp": expire
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt



def decode_access_token(token: str) -> dict:
    """Decodifica y valida la firma criptográfica y expiración de un token JWT."""
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
