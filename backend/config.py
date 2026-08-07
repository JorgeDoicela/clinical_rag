import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

CHROMA_PERSIST_PATH = str(BASE_DIR / os.getenv("CHROMA_PERSIST_PATH", "./data/chroma_db"))
RAW_PDFS_PATH = str(BASE_DIR / os.getenv("RAW_PDFS_PATH", "./data/raw_pdfs"))
CASES_FILE_PATH = str(BASE_DIR / os.getenv("CASES_FILE_PATH", "./cases_data/cases.json"))

EMBEDDING_MODEL_NAME = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
