import chromadb
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
from config import CHROMA_PERSIST_PATH, EMBEDDING_MODEL_NAME

def build_vector_db(chunks: List[Dict[str, Any]], persist_path: str = CHROMA_PERSIST_PATH):
    """
    Genera embeddings multilingües locales y los almacena en ChromaDB de forma persistente.
    Preserva metadatos de guía, página, sección, año de publicación, CIE-10 y especialidad médica.
    """
    from rag.retriever import get_embedding_model, get_chroma_client

    import os
    import torch
    num_cores = os.cpu_count() or 4
    torch.set_num_threads(num_cores)

    model = get_embedding_model()
    client = get_chroma_client(persist_path)

    try:
        client.delete_collection(name="gpc_msp")
        print("[RAG] Recreando colección ChromaDB con metadatos CIE-10 enriquecidos...", flush=True)
    except Exception:
        pass

    collection = client.get_or_create_collection(
        name="gpc_msp",
        metadata={"hnsw:space": "cosine"}
    )

    if not chunks:
        return collection

    texts = [str(c["texto"]) for c in chunks]
    ids = [str(c["chunk_id"]) for c in chunks]
    metadatas = [{
        "guia_fuente": str(c.get("guia_fuente") or "MSP Ecuador"),
        "pagina": int(c.get("pagina") or 1),
        "seccion": str(c.get("seccion") or "General"),
        "ano_publicacion": int(c.get("ano_publicacion") or 2019),
        "cie10_codigo": str(c.get("cie10_codigo") or "Z00.0"),
        "cie10_descripcion": str(c.get("cie10_descripcion") or "Examen general"),
        "especialidad": str(c.get("especialidad") or "Medicina Interna"),
        "grupo_etario": str(c.get("grupo_etario") or "Población General")
    } for c in chunks]

    embeddings = model.encode(texts, show_progress_bar=True).tolist()

    try:
        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas
        )
    except Exception as e:
        print(f"[RAG] Reintentando upsert tras limpiar colección: {e}", flush=True)
        try:
            client.delete_collection(name="gpc_msp")
        except Exception:
            pass
        collection = client.get_or_create_collection(
            name="gpc_msp",
            metadata={"hnsw:space": "cosine"}
        )
        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas
        )

    return collection
