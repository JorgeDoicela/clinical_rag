import os
import zipfile
import sys
from pathlib import Path

# Configurar encoding UTF-8 en consola
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_ZIP = BASE_DIR.parent / "ateneo_colab_bundle.zip"

print(f"[ATENEO MLOps] Preparando paquete maestro para Google Colab A100...", flush=True)
print(f"Ruta base del proyecto: {BASE_DIR}", flush=True)

ITEMS_TO_INCLUDE = [
    ("data/raw_pdfs", BASE_DIR / "data" / "raw_pdfs"),
    ("data/ateneo-bge-m3-ecuador", BASE_DIR / "data" / "ateneo-bge-m3-ecuador"),
    ("data/catalogo_cie10_gpc.json", BASE_DIR / "data" / "catalogo_cie10_gpc.json"),
    ("data/seed_chunks.json", BASE_DIR / "data" / "seed_chunks.json"),
    ("test_cases_fixture.json", BASE_DIR / "tests" / "test_cases_fixture.json")
]

with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zipf:
    for arc_prefix, src_path in ITEMS_TO_INCLUDE:
        if not src_path.exists():
            print(f"[ADVERTENCIA] No se encontró: {src_path}", flush=True)
            continue
        
        if src_path.is_file():
            print(f"  + Agregando archivo: {arc_prefix}", flush=True)
            zipf.write(src_path, arcname=arc_prefix)
        elif src_path.is_dir():
            print(f"  + Agregando carpeta: {arc_prefix}/", flush=True)
            for root, dirs, files in os.walk(src_path):
                # Omitir checkpoints temporales si existen
                if "checkpoints" in root:
                    continue
                for f in files:
                    full_p = Path(root) / f
                    rel_p = full_p.relative_to(src_path)
                    zipf.write(full_p, arcname=f"{arc_prefix}/{rel_p}")

size_mb = OUTPUT_ZIP.stat().st_size / (1024 * 1024)
print(f"\n[ÉXITO] Paquete maestro generado en: {OUTPUT_ZIP} ({size_mb:.2f} MB)", flush=True)
print(f"Instrucción: Arrastra este archivo 'ateneo_colab_bundle.zip' directamente a Google Colab.", flush=True)
