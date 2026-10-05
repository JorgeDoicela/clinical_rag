"""
Preparador del Paquete de Extraccion Fase 2 para Google Colab / GPU Cloud.
Ateneo+ v2.0 - Pipeline de Ingesta Cientifica.

Este script empaqueta de forma optimizada y ligera:
1. Las 45 GPCs oficiales del MSP en backend/data/raw_pdfs/ (4 ejes canonicos).
2. El manifiesto criptografico oficial backend/data/corpus_manifest.json.
3. El codigo orquestador de extraccion en backend/ingestion_v2/.

Genera 'fase2_marker_bundle.zip' en la raiz del proyecto (~120 MB),
listo para subirse a Google Colab en segundos.
"""

import os
import sys
import zipfile
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
OUTPUT_ZIP = ROOT_DIR / "fase2_marker_bundle.zip"

ITEMS_TO_INCLUDE = [
    ("backend/data/raw_pdfs", BACKEND_DIR / "data" / "raw_pdfs"),
    ("backend/data/corpus_manifest.json", BACKEND_DIR / "data" / "corpus_manifest.json"),
    ("backend/ingestion_v2", BACKEND_DIR / "ingestion_v2")
]


def create_bundle():
    print("=" * 80)
    print(" GENERADOR DEL PAQUETE FASE 2 (MARKER-PDF / GPU CLOUD)")
    print("=" * 80)
    print(f"Ruta base del proyecto : {ROOT_DIR}")
    print(f"Archivo de salida      : {OUTPUT_ZIP}\n")

    total_files = 0
    total_uncompressed_bytes = 0

    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zipf:
        for arc_prefix, src_path in ITEMS_TO_INCLUDE:
            if not src_path.exists():
                print(f"[ALERTA] Ruta no encontrada: {src_path}")
                continue

            if src_path.is_file():
                f_size = src_path.stat().st_size
                total_files += 1
                total_uncompressed_bytes += f_size
                print(f"  + [ARCHIVO] {arc_prefix} ({f_size / 1024:.1f} KB)")
                zipf.write(src_path, arcname=arc_prefix)
            elif src_path.is_dir():
                print(f"  + [CARPETA] {arc_prefix}/")
                for root, dirs, files in os.walk(src_path):
                    if "__pycache__" in root or ".ipynb_checkpoints" in root:
                        continue
                    for f in sorted(files):
                        full_p = Path(root) / f
                        if full_p.suffix.lower() == ".zip":
                            continue
                        rel_p = full_p.relative_to(src_path)
                        clean_rel = str(rel_p).replace("\\", "/")
                        arc_name = f"{arc_prefix}/{clean_rel}"
                        f_size = full_p.stat().st_size
                        total_files += 1
                        total_uncompressed_bytes += f_size
                        zipf.write(full_p, arcname=arc_name)

    compressed_size = OUTPUT_ZIP.stat().st_size
    ratio = (1 - (compressed_size / total_uncompressed_bytes)) * 100 if total_uncompressed_bytes > 0 else 0

    print("\n" + "-" * 80)
    print(f" Total archivos empaquetados : {total_files}")
    print(f" Tamano descomprimido        : {total_uncompressed_bytes / (1024 * 1024):.2f} MB")
    print(f" Tamano final comprimido     : {compressed_size / (1024 * 1024):.2f} MB ({ratio:.1f}% compresion)")
    print("-" * 80)
    print(f"[OK] Paquete generado exitosamente: {OUTPUT_ZIP.name}")
    print("=" * 80)


if __name__ == "__main__":
    create_bundle()
