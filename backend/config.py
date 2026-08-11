import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

CHROMA_PERSIST_PATH = str(BASE_DIR / os.getenv("CHROMA_PERSIST_PATH", "./data/chroma_db"))
RAW_PDFS_PATH = str(BASE_DIR / os.getenv("RAW_PDFS_PATH", "./data/raw_pdfs"))
CASES_FILE_PATH = str(BASE_DIR / os.getenv("CASES_FILE_PATH", "./cases_data/cases.json"))

FINE_TUNED_PATH = BASE_DIR / "data" / "ateneo-bge-m3-ecuador"
if FINE_TUNED_PATH.exists() and (FINE_TUNED_PATH / "config.json").exists():
    EMBEDDING_MODEL_NAME = str(FINE_TUNED_PATH)
else:
    EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "BAAI/bge-m3")

