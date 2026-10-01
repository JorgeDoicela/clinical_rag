import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from auth.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
    init_demo_users,
    DEMO_USERS_DB,
    UserRole
)

def test_password_hashing():
    raw_password = "PasswordSeguro123!"
    hashed = get_password_hash(raw_password)
    
    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("PasswordErroneo", hashed) is False
    print("  [PASS] Hash y verificación de contraseñas (bcrypt/pbkdf2) validado.")

def test_jwt_token_lifecycle():
    from models.schemas import User
    user = User(
        id="usr_test_001",
        email="test@ateneo.edu.ec",
        nombre="Test Interno",
        rol=UserRole.ALUMNO,
        hashed_password="hash_simulado_test",
        activo=True
    )
    token = create_access_token(user)
    assert isinstance(token, str) and len(token) > 20
    
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "test@ateneo.edu.ec"
    assert payload["id"] == "usr_test_001"
    assert payload["rol"] == UserRole.ALUMNO.value
    assert "exp" in payload
    print("  [PASS] Generación, firma criptográfica y decodificación de JWT validado.")

def test_demo_users_database():
    init_demo_users()
    assert len(DEMO_USERS_DB) >= 3
    
    admin = DEMO_USERS_DB.get("admin@ateneo.edu.ec")
    assert admin is not None
    assert admin.rol == UserRole.ADMINISTRADOR
    assert verify_password("Admin123!", admin.hashed_password) is True

    alumno = DEMO_USERS_DB.get("alumno@ateneo.edu.ec")
    assert alumno is not None
    assert alumno.rol == UserRole.ALUMNO
    assert verify_password("Alumno123!", alumno.hashed_password) is True
    print("  [PASS] Catálogo base RBAC (Admin, Docente, Alumno) validado.")

if __name__ == "__main__":
    print("\n" + "="*70)
    print(" SUITE DE PRUEBAS UNITARIAS DE SEGURIDAD Y RBAC - ATENEO+")
    print("="*70)
    test_password_hashing()
    test_jwt_token_lifecycle()
    test_demo_users_database()
    print("="*70)
    print(" TODAS LAS PRUEBAS DE SEGURIDAD PASARON (PASS)\n")
