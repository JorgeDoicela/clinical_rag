import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv
from pydantic import BaseModel, Field, field_validator

BASE_DIR = Path(__file__).resolve().parent.parent

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
            "gemini-3.7-flash,gemini-3.5-flash,gemini-flash-latest,gemini-flash-lite-latest"
        )
    )
    gemini_circuit_cooldown_seconds: int = Field(
        default_factory=lambda: int(os.getenv("GEMINI_CIRCUIT_COOLDOWN_SECONDS", "300"))
    )

    # Persistencia de Datos Agnóstica (SQLite en dev / PostgreSQL en prod)
    database_url: str = Field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL",
            f"sqlite:///{BASE_DIR / 'data' / 'ateneo_clinical.db'}"
        )
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

    # Rate Limiting & Cuotas Defensivas
    rate_limit_enabled: bool = Field(
        default_factory=lambda: os.getenv("RATE_LIMIT_ENABLED", "true").lower() in ("true", "1", "yes")
    )
    rate_limit_requests_per_minute: int = Field(
        default_factory=lambda: int(os.getenv("RATE_LIMIT_REQUESTS_PER_MINUTE", "60"))
    )
    rate_limit_inference_per_minute: int = Field(
        default_factory=lambda: int(os.getenv("RATE_LIMIT_INFERENCE_PER_MINUTE", "20"))
    )

    # Caché Semántica y Léxica RAG
    rag_cache_enabled: bool = Field(
        default_factory=lambda: os.getenv("RAG_CACHE_ENABLED", "true").lower() in ("true", "1", "yes")
    )
    rag_cache_max_entries: int = Field(
        default_factory=lambda: int(os.getenv("RAG_CACHE_MAX_ENTRIES", "2000"))
    )
    rag_cache_ttl_seconds: int = Field(
        default_factory=lambda: int(os.getenv("RAG_CACHE_TTL_SECONDS", "3600"))
    )
    rag_cache_similarity_threshold: float = Field(
        default_factory=lambda: float(os.getenv("RAG_CACHE_SIMILARITY_THRESHOLD", "0.98"))
    )

    # Propiedades calculadas / validadas
    @property
    def fallback_models(self) -> List[str]:
        return [m.strip() for m in self.gemini_fallback_models_raw.split(",") if m.strip()]

    @property
    def allowed_origins(self) -> List[str]:
        if self.allowed_origins_raw.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.allowed_origins_raw.split(",") if o.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    def get_models_cascade(self) -> List[str]:
        models = [self.gemini_primary_model]
        for m in self.fallback_models:
            if m not in models:
                models.append(m)
        return models


# Instancia única de configuración
settings = AppSettings()

# Alias de compatibilidad a nivel de módulo
GEMINI_API_KEY = settings.gemini_api_key
GEMINI_MODEL = settings.gemini_primary_model
GEMINI_FALLBACK_MODELS = settings.gemini_fallback_models_raw
GEMINI_CIRCUIT_COOLDOWN_SECONDS = settings.gemini_circuit_cooldown_seconds
CHROMA_PERSIST_PATH = settings.chroma_persist_path
RAW_PDFS_PATH = settings.raw_pdfs_path
CASES_FILE_PATH = settings.cases_file_path
DATABASE_URL = settings.database_url
_v2_model_path = BASE_DIR / "data" / "models" / "ateneo-bge-m3-ecuador-v2"
_has_valid_v2_model = _v2_model_path.is_dir() and (_v2_model_path / "config.json").exists()
EMBEDDING_MODEL_NAME = os.getenv(
    "EMBEDDING_MODEL_NAME",
    str(_v2_model_path) if _has_valid_v2_model else "BAAI/bge-m3"
)
JWT_SECRET_KEY = settings.jwt_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes
ALLOWED_ORIGINS = settings.allowed_origins_raw
