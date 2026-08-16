import chromadb
from typing import List, Dict, Any
from config import CHROMA_PERSIST_PATH, EMBEDDING_MODEL_NAME

def build_vector_db(chunks: List[Dict[str, Any]], persist_path: str = CHROMA_PERSIST_PATH):
    """
    Genera embeddings densos locales y los almacena en ChromaDB en lotes seguros.
    Aplica deduplicación estricta de chunk_ids y preserva metadatos CIE-10.
    """
    from rag.retriever import get_embedding_model, get_chroma_client

    import os
    import torch
    num_cores = os.cpu_count() or 4
    torch.set_num_threads(num_cores)

    # 1. Deduplicación estricta por chunk_id
    seen_ids = set()
    unique_chunks = []
    for c in chunks:
        cid = str(c.get("chunk_id", ""))
        if cid and cid not in seen_ids:
            seen_ids.add(cid)
            unique_chunks.append(c)

    print(f"[RAG] Chunks únicos a indexar tras deduplicación: {len(unique_chunks)} (originales: {len(chunks)})", flush=True)

    model = get_embedding_model()
    client = get_chroma_client(persist_path)

    try:
        client.delete_collection(name="gpc_msp")
        print("[RAG] Colección previa 'gpc_msp' reseteada para indexación limpia.", flush=True)
    except Exception:
        pass

    collection = client.get_or_create_collection(
        name="gpc_msp",
        metadata={"hnsw:space": "cosine"}
    )

    if not unique_chunks:
        return collection

    texts = [str(c["texto"]) for c in unique_chunks]
    ids = [str(c["chunk_id"]) for c in unique_chunks]
    metadatas = [{
        "guia_fuente": str(c.get("guia_fuente") or "MSP Ecuador"),
        "pagina": int(c.get("pagina") or 1),
        "seccion": str(c.get("seccion") or "General"),
        "ano_publicacion": int(c.get("ano_publicacion") or 2019),
        "cie10_codigo": str(c.get("cie10_codigo") or "Z00.0"),
        "cie10_descripcion": str(c.get("cie10_descripcion") or "Examen general"),
        "especialidad": str(c.get("especialidad") or "Medicina Interna"),
        "grupo_etario": str(c.get("grupo_etario") or "Población General")
    } for c in unique_chunks]

    print(f"[RAG] Calculando embeddings para {len(texts)} fragmentos con {EMBEDDING_MODEL_NAME}...", flush=True)
    batch_size_encode = 64
    all_embeddings = []
    total_texts = len(texts)
    for i in range(0, total_texts, batch_size_encode):
        batch_texts = texts[i : i + batch_size_encode]
        batch_emb = model.encode(batch_texts, batch_size=batch_size_encode, show_progress_bar=False)
        all_embeddings.extend(batch_emb.tolist())
        pct = min(100, int((i + len(batch_texts)) / total_texts * 100))
        print(f"  - [RAG] Progreso embeddings: {i + len(batch_texts)}/{total_texts} ({pct}%)", flush=True)
    embeddings = all_embeddings

    # 2. Upsert por lotes de 500 para estabilidad transaccional
    batch_size_upsert = 500
    total = len(ids)
    print(f"[RAG] Insertando en ChromaDB en lotes de {batch_size_upsert}...", flush=True)
    
    for i in range(0, total, batch_size_upsert):
        end_idx = min(i + batch_size_upsert, total)
        collection.upsert(
            ids=ids[i:end_idx],
            embeddings=embeddings[i:end_idx],
            documents=texts[i:end_idx],
            metadatas=metadatas[i:end_idx]
        )
        print(f"  - Lote indexado: {end_idx}/{total} fragmentos.", flush=True)

    return collection
