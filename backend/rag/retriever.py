import chromadb
from typing import Dict, Any, Optional
from sentence_transformers import SentenceTransformer
from config import CHROMA_PERSIST_PATH, EMBEDDING_MODEL_NAME

_MODEL_CACHE = None

def get_embedding_model() -> SentenceTransformer:
    global _MODEL_CACHE
    if _MODEL_CACHE is None:
        print("[RAG] Cargando modelo de embeddings local (paraphrase-multilingual-mpnet-base-v2)...", flush=True)
        _MODEL_CACHE = SentenceTransformer(EMBEDDING_MODEL_NAME)
        print("[RAG] Modelo de embeddings listo.", flush=True)
    return _MODEL_CACHE

def retrieve_relevant_chunk(query: str, guia_filtro: Optional[str] = None, top_k: int = 1) -> Dict[str, Any]:
    """
    Recupera el fragmento de Guía de Práctica Clínica más relevante desde ChromaDB.
    Aplica filtro por guia_fuente si se especifica.
    """
    print(f"[RAG] Buscando en ChromaDB para guía '{guia_filtro}'...", flush=True)
    model = get_embedding_model()
    client = chromadb.PersistentClient(path=CHROMA_PERSIST_PATH)
    
    try:
        collection = client.get_collection("gpc_msp")
    except Exception:
        print("[RAG] Colección no encontrada. Ejecutando pipeline de ingesta de respaldo...", flush=True)
        from ingestion.run_ingestion import run_ingestion_pipeline
        run_ingestion_pipeline()
        collection = client.get_collection("gpc_msp")

    query_embedding = model.encode([query]).tolist()
    where_filter = {"guia_fuente": guia_filtro} if guia_filtro else None

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k,
        where=where_filter
    )

    if not results or not results.get("ids") or not results["ids"][0]:
        raise ValueError(f"No se encontraron fragmentos en la GPC para la consulta de filtro '{guia_filtro}'.")

    chunk_id = results["ids"][0][0]
    texto = results["documents"][0][0]
    metadata = results["metadatas"][0][0]
    distancia = results["distances"][0][0] if "distances" in results and results["distances"] else 0.0

    return {
        "chunk_id": chunk_id,
        "texto": texto,
        "seccion": metadata.get("seccion", "General"),
        "pagina": metadata.get("pagina", 1),
        "guia_fuente": metadata.get("guia_fuente", guia_filtro or "MSP Ecuador"),
        "distancia": distancia
    }
