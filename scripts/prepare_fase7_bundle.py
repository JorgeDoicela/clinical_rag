"""
Preparador del Paquete de Insumos Fase 7 y 8 para Google Colab.
Ateneo+ v2.0 - Pipeline Cientifico de Ingesta y Evaluacion.

Este script empaqueta:
1. chunks_corpus_v2.json (7,052 fragmentos normativos del MSP, 13.9 MB).
2. retrieval_test_blind.json (283 tripletas de evaluacion ciega OOD, 856 KB).
3. retrieval_val.json (249 tripletas de validacion).

Genera 'fase7_insumos_colab.zip' en la raiz del proyecto (~3.5 MB comprimido),
listo para subirse a Google Drive en la carpeta 'Ateneo/Version 2' o directamente a Colab.
"""

import os
import sys
import zipfile
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "backend" / "data"
OUTPUT_ZIP = ROOT_DIR / "fase7_insumos_colab.zip"

FILES_TO_PACK = [
    ("chunks_corpus_v2.json", DATA_DIR / "extracted" / "chunks_corpus_v2.json"),
    ("retrieval_test_blind.json", DATA_DIR / "datasets" / "retrieval_test_blind.json"),
    ("retrieval_val.json", DATA_DIR / "datasets" / "retrieval_val.json"),
]


def create_bundle():
    print("=" * 80)
    print(" EMPAQUETADOR DE INSUMOS FASE 7 & 8 (INDEXACION Y BENCHMARK COLAB)")
    print("=" * 80)
    print(f"Ruta base del proyecto : {ROOT_DIR}")
    print(f"Archivo de salida      : {OUTPUT_ZIP}\n")

    total_uncompressed = 0
    packed_count = 0

    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
        for arcname, src_path in FILES_TO_PACK:
            if not src_path.exists():
                print(f"[ALERTA] Archivo no encontrado: {src_path}")
                continue
            
            f_size = src_path.stat().st_size
            total_uncompressed += f_size
            packed_count += 1
            print(f"  + [ARCHIVO] {arcname} ({f_size / (1024 * 1024):.2f} MB)")
            zipf.write(src_path, arcname=arcname)

    compressed_size = OUTPUT_ZIP.stat().st_size
    ratio = (1 - (compressed_size / total_uncompressed)) * 100 if total_uncompressed > 0 else 0

    print("\n" + "-" * 80)
    print(f" Total archivos empaquetados : {packed_count}")
    print(f" Tamano descomprimido        : {total_uncompressed / (1024 * 1024):.2f} MB")
    print(f" Tamano final comprimido     : {compressed_size / (1024 * 1024):.2f} MB ({ratio:.1f}% compresion)")
    print("-" * 80)
    print(f"[OK] Paquete generado exitosamente: {OUTPUT_ZIP.name}")
    print("=" * 80)


if __name__ == "__main__":
    create_bundle()
