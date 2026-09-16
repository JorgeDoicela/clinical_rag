import json
import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if not (BACKEND_DIR / "config.py").exists() and Path("/app/config.py").exists():
    BACKEND_DIR = Path("/app")
    ROOT_DIR = Path("/")

sys.path.insert(0, str(BACKEND_DIR))

from rag.retriever import get_embedding_model, get_chroma_client

def main():
    seed_path = BACKEND_DIR / "data" / "seed_chunks.json"
    if not seed_path.exists():
        print(f"Error: {seed_path} no existe.")
        return

    with open(seed_path, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    print(f"Cargando {len(chunks)} seed chunks...")
    model = get_embedding_model()
    client = get_chroma_client()
    collection = client.get_or_create_collection(name="gpc_msp")

    ids = [c["chunk_id"] for c in chunks]
    texts = [c["texto"] for c in chunks]
    metadatas = [{
        "guia_fuente": str(c.get("guia_fuente", "")),
        "pagina": int(c.get("pagina", 1)),
        "seccion": str(c.get("seccion", "General")),
        "ano_publicacion": int(c.get("ano_publicacion", 2019)),
        "cie10_codigo": str(c.get("cie10_codigo", "")),
        "cie10_descripcion": str(c.get("cie10_descripcion", "")),
        "especialidad": str(c.get("especialidad", "")),
        "grupo_etario": str(c.get("grupo_etario", ""))
    } for c in chunks]

    embeddings = model.encode(texts, convert_to_numpy=True).tolist()
    collection.upsert(ids=ids, documents=texts, metadatas=metadatas, embeddings=embeddings)
    print("Seed chunks upserted exitosamente en ChromaDB.")

if __name__ == "__main__":
    main()
