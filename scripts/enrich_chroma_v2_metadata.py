"""
Script de Enriquecimiento Idempotente de Metadatos en ChromaDB v2.
Inyecta numero de pagina PDF real (pagina_pdf), pagina impresa original (pagina_impresa_real),
ano de publicacion (anio) y eje curricular (eje_nombre) desde chunks_corpus_v2.json
en la coleccion 'gpc_msp_v2' sin recalcular embeddings (0 costo computacional GPU).
"""

import os
import sys
import json
import time
from pathlib import Path

# Resolver ruta de backend e importaciones
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if not (BACKEND_DIR / "config.py").exists() and Path("/app/config.py").exists():
    BACKEND_DIR = Path("/app")
    ROOT_DIR = Path("/")

sys.path.insert(0, str(BACKEND_DIR))

import chromadb
from core.config import settings

def enrich_metadata():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    print("=" * 70)
    print(" ENRIQUECIMIENTO DE METADATOS EN CHROMADB v2 (PAGINACIÓN REAL)")
    print("=" * 70)

    # 1. Cargar archivo canónico de fragmentos
    chunks_path = BACKEND_DIR / "data" / "extracted" / "chunks_corpus_v2.json"
    if not chunks_path.exists():
        print(f"[ERROR] No se encontró {chunks_path}")
        return False

    with open(chunks_path, "r", encoding="utf-8") as f:
        chunks_data = json.load(f)

    print(f"-> Total de fragmentos cargados de chunks_corpus_v2.json: {len(chunks_data)}")

    # 2. Conectar a ChromaDB v2
    chroma_dir = BACKEND_DIR / "data" / "chroma_db_v2"
    if not chroma_dir.exists():
        print(f"[ERROR] Directorio ChromaDB no existe: {chroma_dir}")
        return False

    client = chromadb.PersistentClient(path=str(chroma_dir))
    collection_name = settings.chroma_collection_name
    collection = client.get_collection(collection_name)
    total_vectors = collection.count()
    print(f"-> Colección '{collection_name}' conectada con {total_vectors} vectores.")

    # 3. Preparar lotes de actualización
    batch_size = 500
    total_chunks = len(chunks_data)
    start_time = time.time()
    updated_count = 0

    print(f"\n-> Iniciando actualización por lotes de {batch_size} registros...")

    for i in range(0, total_chunks, batch_size):
        batch = chunks_data[i : i + batch_size]
        batch_ids = [c["chunk_id"] for c in batch]
        
        # Recuperar metadatos actuales de ChromaDB para fusionar campos
        current_data = collection.get(ids=batch_ids)
        current_metas_map = {cid: meta for cid, meta in zip(current_data["ids"], current_data["metadatas"])}

        batch_metadatas = []
        for c in batch:
            cid = c["chunk_id"]
            existing_meta = current_metas_map.get(cid, {}) or {}
            
            # Construir metadatos enriquecidos sanitizando tipos (ChromaDB solo acepta str, int, float, bool)
            enriched = dict(existing_meta)
            enriched["chunk_id"] = str(cid)
            enriched["gpc_id"] = str(c.get("guia_archivo") or existing_meta.get("gpc_id", ""))
            enriched["gpc_titulo"] = str(c.get("guia_titulo") or existing_meta.get("gpc_titulo", ""))
            enriched["eje_clinico"] = str(c.get("eje_clinico") or existing_meta.get("eje_clinico", ""))
            enriched["eje_nombre"] = str(c.get("eje_nombre", ""))
            enriched["cie10"] = str(c.get("cie10") or existing_meta.get("cie10", ""))
            enriched["cie11"] = str(c.get("cie11") or existing_meta.get("cie11", ""))
            enriched["seccion"] = str(c.get("seccion") or existing_meta.get("seccion", "General"))
            enriched["tipo_contenido"] = str(c.get("tipo_contenido") or existing_meta.get("tipo_contenido", "texto"))
            enriched["hash_sha256"] = str(c.get("sha256") or existing_meta.get("hash_sha256", ""))
            enriched["num_tokens"] = int(c.get("num_tokens") or existing_meta.get("num_tokens", 0))

            # Inyección de paginación y cronología real
            pagina_pdf_val = c.get("pagina_pdf")
            p_val = int(pagina_pdf_val) if pagina_pdf_val is not None else 1
            enriched["pagina_pdf"] = p_val
            enriched["pagina"] = p_val
            
            pagina_imp_val = c.get("pagina_impresa_real")
            enriched["pagina_impresa_real"] = str(pagina_imp_val if pagina_imp_val is not None else "ND")

            anio_val = c.get("anio")
            enriched["anio"] = int(anio_val) if anio_val is not None else 2019

            batch_metadatas.append(enriched)

        # Actualizar en ChromaDB
        collection.update(ids=batch_ids, metadatas=batch_metadatas)
        updated_count += len(batch_ids)
        print(f"   Lote procesado: {updated_count}/{total_chunks} fragmentos ({(updated_count/total_chunks)*100:.1f}%)")

    elapsed = time.time() - start_time
    print(f"\n[OK] Actualización completada en {elapsed:.2f} segundos.")

    # 4. Verificación de consistencia y muestreo
    print("\n" + "=" * 70)
    print(" VERIFICACIÓN DE CALIDAD POST-ENRIQUECIMIENTO")
    print("=" * 70)

    import sqlite3
    db_path = chroma_dir / "chroma.sqlite3"
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    cur.execute("SELECT COUNT(DISTINCT id) FROM embedding_metadata WHERE key='pagina_pdf'")
    count_pdf = cur.fetchone()[0]
    cur.execute("SELECT COUNT(DISTINCT id) FROM embedding_metadata WHERE key='pagina_impresa_real'")
    count_imp = cur.fetchone()[0]
    conn.close()

    print(f"-> Vectores con clave 'pagina_pdf' en SQLite: {count_pdf}/{total_chunks}")
    print(f"-> Vectores con clave 'pagina_impresa_real' en SQLite: {count_imp}/{total_chunks}")

    # Muestreo de 5 casos canónicos
    sample_ids = [
        "gpc_MSP_Trastornos-hipertensivos-del-embarazo-con-portada-3_chunk_0082",
        "gpc_Guía-de-hemorragia-postparto_chunk_0031",
        "gpc_GP_Tuberculosis-1_chunk_0067",
        "gpc_gpc_VIH_acuerdo_ministerial05-07-2019_chunk_0365",
        "gpc_gpc_hta192019_chunk_0094"
    ]

    sample_res = collection.get(ids=sample_ids)
    print("\n-> Muestreo de Fragmentos Canónicos Clave:")
    for cid, meta in zip(sample_res["ids"], sample_res["metadatas"]):
        p_pdf = meta.get("pagina_pdf")
        p_imp = meta.get("pagina_impresa_real")
        gpc = meta.get("gpc_id")
        sec = meta.get("seccion", "")[:40]
        print(f"   [OK] {cid}")
        print(f"        Guía: {gpc} | Pág. PDF: {p_pdf} | Pág. Impresa: {p_imp} | Secc: {sec}...")

    if count_pdf == total_chunks and count_imp == total_chunks:
        print("\n" + "=" * 70)
        print(" SESIÓN 2 COMPLETADA EXITOSAMENTE: 100% METADATOS ENRIQUECIDOS")
        print("=" * 70)
        return True
    else:
        print("\n[ALERTA] Discrepancia en el conteo total de claves en SQLite.")
        return False

if __name__ == "__main__":
    success = enrich_metadata()
    sys.exit(0 if success else 1)
