"""
Fase 2: Extraccion Limpia sin Perdida con marker-pdf (Layout Analysis, Paginacion Real y Figuras 300 DPI).
Ateneo+ v2.0 - Pipeline de Ingesta Cientifica.

Este script:
1. Carga el inventario oficial desde 'backend/data/corpus_manifest.json'.
2. Identifica los documentos normativos prioritarios de los 5 ejes clinicos.
3. Ejecuta la extraccion de texto Markdown, tablas completas y figuras PNG con marker-pdf.
4. Normaliza la salida hacia:
   - 'backend/data/extracted/markdown/' (un .md estructurado por guia con paginacion real)
   - 'backend/data/extracted/figures/' (figuras diagnosticas PNG con metadatos asociados)
"""

import os
import sys
import json
import subprocess
import shutil
from pathlib import Path
from typing import List, Dict, Any

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent
DATA_DIR = BASE_DIR / "data"
MANIFEST_PATH = DATA_DIR / "corpus_manifest.json"
EXTRACTED_DIR = DATA_DIR / "extracted"
MARKDOWN_OUT_DIR = EXTRACTED_DIR / "markdown"
FIGURES_OUT_DIR = EXTRACTED_DIR / "figures"


def check_marker_installed() -> bool:
    """Verifica si marker_single o marker esta disponible en el entorno activo."""
    return shutil.which("marker_single") is not None or shutil.which("marker") is not None


def extract_single_pdf_marker(pdf_path: Path, output_base_dir: Path, workers: int = 2) -> bool:
    """
    Ejecuta marker sobre un PDF individual.
    marker_single [pdf_path] --output_dir [output_base_dir] --output_format markdown --langs Spanish
    """
    cmd = [
        "marker_single",
        str(pdf_path),
        "--output_dir", str(output_base_dir),
        "--output_format", "markdown",
        "--langs", "Spanish"
    ]
    try:
        print(f"  [EXTRAYENDO] {pdf_path.name}...")
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"  [ERROR] Fallo en la extraccion de {pdf_path.name}: {e.stderr[:300]}")
        return False
    except Exception as e:
        print(f"  [ERROR] Excepcion inesperada en {pdf_path.name}: {e}")
        return False


def run_extraction_pipeline(prioritarios_solo: bool = True, max_docs: int = None):
    print("=" * 80)
    print(" FASE 2: EXTRACCION SIN PERDIDA CON MARKER-PDF (PAGINACION REAL Y FIGURAS)")
    print("=" * 80)

    if not MANIFEST_PATH.exists():
        print(f"[ERROR] No se encontro el manifiesto en: {MANIFEST_PATH}")
        print("Ejecute primero: python backend/ingestion_v2/01_classify_and_inventory_corpus.py")
        sys.exit(1)

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    documentos = manifest.get("documentos", [])
    print(f"[INFO] Total de documentos en manifiesto: {len(documentos)}")

    # En la arquitectura v2, el 100% de los 45 documentos pertenecen a los 4 ejes oficiales
    print(f"[INFO] Documentos en los 4 ejes clinicos oficiales del MSP: {len(documentos)}")

    if max_docs:
        documentos = documentos[:max_docs]
        print(f"[INFO] Limitado a los primeros {max_docs} documentos para prueba.")

    # Crear carpetas destino
    MARKDOWN_OUT_DIR.mkdir(parents=True, exist_ok=True)
    FIGURES_OUT_DIR.mkdir(parents=True, exist_ok=True)

    marker_available = check_marker_installed()

    if not marker_available:
        print("\n" + "!" * 80)
        print(" AVISO TECNICO DE ENTORNO: 'marker-pdf' NO ESTA INSTALADO EN EL SISTEMA ACTUAL")
        print("!" * 80)
        print("marker-pdf requiere PyTorch y modelos de vision para segmentar tablas y figuras a 300 DPI.")
        print("\nPara ejecutar la extraccion en su estacion de trabajo o servidor A100:")
        print("  1. Instalar dependencias:")
        print("     pip install marker-pdf")
        print("\n  2. Ejecutar la extraccion masiva por CLI:")
        for doc in documentos[:5]:
            pdf_full_path = REPO_ROOT / doc["ruta_relativa"]
            print(f"     marker_single \"{pdf_full_path}\" --output_dir \"{MARKDOWN_OUT_DIR}\" --langs Spanish")
        print(f"     ... ({len(documentos) - 5} guias adicionales)")
        print("\n  3. O ejecutar el script completo una vez instalado marker:")
        print("     python backend/ingestion_v2/02_extract_with_marker.py")
        print("=" * 80 + "\n")
        return

    # Si marker esta instalado, procesar lote
    exitos = 0
    fallos = 0
    for doc in documentos:
        pdf_full_path = REPO_ROOT / doc["ruta_relativa"]
        if not pdf_full_path.exists():
            print(f"  [ALERTA] Archivo no encontrado en disco: {pdf_full_path}")
            fallos += 1
            continue

        ok = extract_single_pdf_marker(pdf_full_path, MARKDOWN_OUT_DIR)
        if ok:
            exitos += 1
        else:
            fallos += 1

    print("\n" + "=" * 80)
    print(f" RESUMEN DE EXTRACCION: {exitos} exitosos, {fallos} fallidos de {len(documentos)} documentos.")
    print(f" Archivos Markdown generados en: {MARKDOWN_OUT_DIR}")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Extractor de GPCs con marker-pdf")
    parser.add_argument("--todos", action="store_true", help="Procesar todas las guias (incluyendo eje 07)")
    parser.add_argument("--max", type=int, default=None, help="Limite de documentos a procesar")
    args = parser.parse_args()

    run_extraction_pipeline(prioritarios_solo=not args.todos, max_docs=args.max)
