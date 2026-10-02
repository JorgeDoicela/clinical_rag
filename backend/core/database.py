import os
from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from core.config import settings

# Configuración del motor según el dialecto de base de datos
engine_kwargs = {}

if settings.is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Optimización para PostgreSQL u otros motores en producción
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_pre_ping"] = True

engine = create_engine(settings.database_url, **engine_kwargs)

# Si es SQLite, activar modo WAL (Write-Ahead Logging) para máxima concurrencia
if settings.is_sqlite:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Generador de sesión transaccional para inyección de dependencias con FastAPI.
    Garantiza el cierre seguro y rollback automático ante excepciones no controladas.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_database() -> None:
    """Crea todas las tablas declaradas en los modelos si aún no existen y siembra datos iniciales."""
    # Importar entidades para registrar sus esquemas en Base.metadata
    from modules.auth.models import UserModel
    from modules.analytics_history.models import EvaluationHistoryModel
    from modules.collaboration.models import AteneoRoomModel
    from modules.adaptive.models import StudentMasteryModel, StudentSnapshotModel

    Base.metadata.create_all(bind=engine)

    # Siembra defensiva e idempotente de usuarios institucionales si la tabla users está vacía
    with SessionLocal() as db:
        from modules.auth.repository import UserRepository
        from modules.auth.service import AuthService
        user_repo = UserRepository(db)
        auth_service = AuthService(user_repo)
        auth_service.seed_demo_users_if_needed()
