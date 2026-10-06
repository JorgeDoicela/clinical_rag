"""
Módulo de compatibilidad para backend/config.py.
Delega directamente en la configuración centralizada en core/config.py.
"""
from core.config import (
    AppSettings,
    settings,
    BASE_DIR,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GEMINI_FALLBACK_MODELS,
    GEMINI_CIRCUIT_COOLDOWN_SECONDS,
    CHROMA_PERSIST_PATH,
    CHROMA_COLLECTION_NAME,
    BM25_INDEX_PATH,
    RAW_PDFS_PATH,
    CASES_FILE_PATH,
    DATABASE_URL,
    EMBEDDING_MODEL_NAME,
    JWT_SECRET_KEY,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALLOWED_ORIGINS,
)

__all__ = [
    "AppSettings",
    "settings",
    "BASE_DIR",
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "GEMINI_FALLBACK_MODELS",
    "GEMINI_CIRCUIT_COOLDOWN_SECONDS",
    "CHROMA_PERSIST_PATH",
    "CHROMA_COLLECTION_NAME",
    "BM25_INDEX_PATH",
    "RAW_PDFS_PATH",
    "CASES_FILE_PATH",
    "DATABASE_URL",
    "EMBEDDING_MODEL_NAME",
    "JWT_SECRET_KEY",
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "ALLOWED_ORIGINS",
]

