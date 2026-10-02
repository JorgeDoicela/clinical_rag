import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv
from pydantic import BaseModel, Field, field_validator

BASE_DIR = Path(__file__).resolve().parent

# Cargar .env con prioridad a la raíz del repositorio, luego local
root_env = BASE_DIR.parent / ".env"
backend_env = BASE_DIR / ".env"
if root_env.exists():
    load_dotenv(root_env, override=True)
elif backend_env.exists():
    load_dotenv(backend_env, override=True)
else:
    load_dotenv(override=False)


class AppSettings(BaseModel):
    """
    Configuración centralizada y tipada del sistema Ateneo+.
    Valida variables de entorno al arranque (Fail-Fast) según el estándar 12-Factor App.
    """
    # LLM & IA Resilient Gateway
    gemini_api_key: str = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    gemini_primary_model: str = Field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-3.8-flash"))
    gemini_fallback_models_raw: str = Field(
        default_factory=lambda: os.getenv(
            "GEMINI_FALLBACK_MODELS",
            "gemini-flash-lite-latest,gemini-flash-latest,gemini-3.5-flash-lite,gemini-3.7-flash"
        )
    )
    gemini_circuit_cooldown_seconds: int = Field(
        default_factory=lambda: int(os.getenv("GEMINI_CIRCUIT_COOLDOWN_SECONDS", "300"))
    )

    # Rutas del Core
    chroma_persist_path: str = Field(
        default_factory=lambda: str(BASE_DIR / os.getenv("CHROMA_PERSIST_PATH", "./data/chroma_db"))
    )
    raw_pdfs_path: str = Field(
        default_factory=lambda: str(BASE_DIR / os.getenv("RAW_PDFS_PATH", "./data/raw_pdfs"))
    )
    cases_file_path: str = Field(
        default_factory=lambda: str(BASE_DIR / os.getenv("CASES_FILE_PATH", "./cases_data/cases.json"))
    )

    # Seguridad & Auth
    jwt_secret_key: str = Field(
        default_factory=lambda: os.getenv("JWT_SECRET_KEY", "ateneo_clinical_rag_secret_key_2026_msp_ecuador")
    )
    access_token_expire_minutes: int = Field(
        default_factory=lambda: int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))
    )
    allowed_origins_raw: str = Field(
        default_factory=lambda: os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
        )
    )

    @field_validator("gemini_api_key")
    @classmethod
    def validate_api_key(cls, v: str) -> str:
        v = v.strip()
        return v

    def get_models_cascade(self) -> List[str]:
        """
        Retorna la lista ordenada y única de modelos para la cadena de fallback.
        El modelo primario siempre encabeza la lista.
        """
        cascade = [self.gemini_primary_model.strip()]
        for m in self.gemini_fallback_models_raw.split(","):
            cleaned = m.strip()
            if cleaned and cleaned not in cascade:
                cascade.append(cleaned)
        return cascade

    def get_allowed_origins(self) -> List[str]:
        if not self.allowed_origins_raw or self.allowed_origins_raw.strip() == "*":
            return ["*"]
        return [orig.strip() for orig in self.allowed_origins_raw.split(",") if orig.strip()]


# Instancia única validada (Singleton de configuración)
settings = AppSettings()

# Exportaciones canónicas para retrocompatibilidad
GEMINI_API_KEY = settings.gemini_api_key
GEMINI_MODEL = settings.gemini_primary_model
GEMINI_MODELS_CASCADE = settings.get_models_cascade()
GEMINI_CIRCUIT_COOLDOWN_SECONDS = settings.gemini_circuit_cooldown_seconds

CHROMA_PERSIST_PATH = settings.chroma_persist_path
RAW_PDFS_PATH = settings.raw_pdfs_path
CASES_FILE_PATH = settings.cases_file_path

JWT_SECRET_KEY = settings.jwt_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes
ALLOWED_ORIGINS = settings.get_allowed_origins()

FINE_TUNED_PATH = BASE_DIR / "data" / "ateneo-bge-m3-ecuador"
if FINE_TUNED_PATH.exists() and (FINE_TUNED_PATH / "config.json").exists():
    EMBEDDING_MODEL_NAME = str(FINE_TUNED_PATH)
else:
    EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "BAAI/bge-m3")
