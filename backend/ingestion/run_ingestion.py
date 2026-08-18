import sys
import os
import unicodedata
from pathlib import Path

# Configurar encoding UTF-8 en consola para Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

sys.path.append(str(Path(__file__).resolve().parent.parent))

from config import RAW_PDFS_PATH
from ingestion.pdf_advanced_parser import extract_advanced_text_by_page
from ingestion.chunker import chunk_by_section
from ingestion.vectorize import build_vector_db

def load_seed_chunks() -> list:
    """Carga los fragmentos semilla normativos canónicos desde backend/data/seed_chunks.json."""
    import json
    seed_file = Path(__file__).resolve().parent.parent / "data" / "seed_chunks.json"
    if seed_file.exists():
        try:
            with open(seed_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                print(f"[INGESTA] Cargados {len(data)} fragmentos normativos canónicos (Seed Chunks).", flush=True)
                return data
        except Exception as e:
            print(f"[INGESTA WARNING] Error al leer {seed_file}: {e}", flush=True)
    return []

SEED_CHUNKS = load_seed_chunks()

def clean_name_display(name: str) -> str:
    """Normaliza cadenas para visualización segura en cualquier terminal."""
    return unicodedata.normalize("NFKC", str(name)).encode("ascii", "replace").decode("ascii")

def run_ingestion_pipeline():
    raw_dir = Path(RAW_PDFS_PATH)
    raw_dir.mkdir(parents=True, exist_ok=True)
    pdf_files = sorted(list(raw_dir.rglob("*.pdf")))

    all_chunks = list(SEED_CHUNKS)
    if pdf_files:
        print(f"[INGESTION] Encontrados {len(pdf_files)} PDFs en subcarpetas de {raw_dir}. Procesando con escaneo estructurado...", flush=True)
        total_pdf_chunks = 0
        for idx, pdf_file in enumerate(pdf_files, start=1):
            # Identificador único incluyendo el año para evitar colisiones
            guia_id = f"{pdf_file.parent.name}_{pdf_file.stem}".lower().replace("-", "_").replace(" ", "_")
            pages = extract_advanced_text_by_page(pdf_file)
            chunks = chunk_by_section(pages, guia_id=guia_id, max_chunk_size=800, overlap_size=150)
            all_chunks.extend(chunks)
            total_pdf_chunks += len(chunks)
            ano_detectado = pages[0].get("ano_publicacion") if pages else 2019
            
            clean_fname = clean_name_display(pdf_file.name)
            clean_parent = clean_name_display(pdf_file.parent.name)
            print(f"  [{idx:02d}/{len(pdf_files)}] [{clean_parent}] '{clean_fname}' (Ano: {ano_detectado}): {len(pages)} pags -> {len(chunks)} chunks.", flush=True)
            
        print(f"\n[INGESTION] Total de chunks estructurados a indexar (PDFs + Sembrados): {len(all_chunks)}", flush=True)
    else:
        print("[INGESTION] No se encontraron PDFs en raw_pdfs/. Indexando chunks sembrados de respaldo...", flush=True)
        all_chunks = SEED_CHUNKS

    collection = build_vector_db(all_chunks)
    print(f"\n[OK] Ingesta completada exitosamente. Coleccion ChromaDB 'gpc_msp' activa con {collection.count()} fragmentos vectorizados.")

if __name__ == "__main__":
    run_ingestion_pipeline()
