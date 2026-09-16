import os
import sys
import json
from pathlib import Path
from typing import Dict, Any, List

# Configurar encoding UTF-8 en consola
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if not (BACKEND_DIR / "config.py").exists() and Path("/app/config.py").exists():
    BACKEND_DIR = Path("/app")
    ROOT_DIR = Path("/")

sys.path.insert(0, str(BACKEND_DIR))

SEED_FILE = BACKEND_DIR / "data" / "seed_chunks.json"
CATALOG_FILE = BACKEND_DIR / "data" / "catalogo_cie10_gpc.json"

def add_seed_chunk(chunk_id: str, guia_fuente: str, pagina: int, seccion: str, ano_publicacion: int, texto: str, cie10_codigo: str = None, especialidad: str = None, grupo_etario: str = "Población General"):
    """
    Agrega o actualiza de forma segura un fragmento normativo canónico en data/seed_chunks.json.
    """
    seeds = []
    if SEED_FILE.exists():
        with open(SEED_FILE, "r", encoding="utf-8") as f:
            seeds = json.load(f)

    # Si no se pasan metadatos nosológicos, resolver desde el catálogo maestro
    catalog = {}
    if CATALOG_FILE.exists():
        with open(CATALOG_FILE, "r", encoding="utf-8") as f:
            catalog = json.load(f)

    g_meta = catalog.get(guia_fuente, {})
    final_cie10 = cie10_codigo or g_meta.get("cie10_codigo", "Z00.0")
    final_cie_desc = g_meta.get("cie10_descripcion", "Normativa MSP General")
    final_esp = especialidad or g_meta.get("especialidad", "Medicina General")
    final_grupo = grupo_etario or g_meta.get("grupo_etario", "Población General")

    new_chunk = {
        "chunk_id": chunk_id,
        "guia_fuente": guia_fuente,
        "pagina": int(pagina),
        "seccion": seccion,
        "ano_publicacion": int(ano_publicacion),
        "cie10_codigo": final_cie10,
        "cie10_descripcion": final_cie_desc,
        "especialidad": final_esp,
        "grupo_etario": final_grupo,
        "texto": texto.strip()
    }

    # Reemplazar si existe chunk_id, si no agregar
    filtered = [s for s in seeds if s["chunk_id"] != chunk_id]
    filtered.append(new_chunk)

    SEED_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SEED_FILE, "w", encoding="utf-8") as f:
        json.dump(filtered, f, indent=2, ensure_ascii=False)

    print(f"[OK] Seed chunk '{chunk_id}' agregado/actualizado exitosamente en {SEED_FILE.name}")
    print(f"     Guía: {guia_fuente} | CIE-10: {final_cie10} ({final_cie_desc}) | Esp: {final_esp}")

if __name__ == "__main__":
    print(f"Total de seed chunks actuales: {len(json.load(open(SEED_FILE, encoding='utf-8'))) if SEED_FILE.exists() else 0}")
