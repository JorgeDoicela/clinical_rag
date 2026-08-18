import os
import sys
import json
from pathlib import Path
from typing import Dict, Any, List

# Configurar encoding UTF-8 en consola
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = Path(__file__).resolve().parent.parent
SEED_FILE = BASE_DIR / "data" / "seed_chunks.json"
CATALOG_FILE = BASE_DIR / "data" / "catalogo_cie10_gpc.json"

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

    # Reemplazar si ya existe o agregar al final
    existing_idx = next((i for i, c in enumerate(seeds) if c["chunk_id"] == chunk_id), None)
    if existing_idx is not None:
        seeds[existing_idx] = new_chunk
        print(f"[SEED GENERATOR] Fragmento '{chunk_id}' actualizado en seed_chunks.json.")
    else:
        seeds.append(new_chunk)
        print(f"[SEED GENERATOR] Nuevo fragmento '{chunk_id}' agregado exitosamente (Total: {len(seeds)}).")

    with open(SEED_FILE, "w", encoding="utf-8") as f:
        json.dump(seeds, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    print("=== GENERADOR Y GESTOR DE SEED CHUNKS CANÓNICOS (GROUND TRUTH) ===")
    print(f"Ruta del archivo: {SEED_FILE}")
    if SEED_FILE.exists():
        with open(SEED_FILE, "r", encoding="utf-8") as f:
            current = json.load(f)
        print(f"Fragmentos canónicos actualmente registrados: {len(current)}")
        for c in current:
            print(f"  - [{c['chunk_id']}] {c['guia_fuente']} (Pág {c['pagina']}) - CIE-10: {c['cie10_codigo']}")
