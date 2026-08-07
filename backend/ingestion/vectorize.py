import chromadb
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
from config import CHROMA_PERSIST_PATH, EMBEDDING_MODEL_NAME

def build_vector_db(chunks: List[Dict[str, Any]], persist_path: str = CHROMA_PERSIST_PATH):
    """
    Genera embeddings multilingües locales y los almacena en ChromaDB de forma persistente.
    """
    from rag.retriever import get_embedding_model, get_chroma_client

    model = get_embedding_model()
    client = get_chroma_client(persist_path)

    collection = client.get_or_create_collection(
        name="gpc_msp",
        metadata={"hnsw:space": "cosine"}
    )

    if not chunks:
        return collection

    texts = [c["texto"] for c in chunks]
    ids = [c["chunk_id"] for c in chunks]
    metadatas = [{
        "guia_fuente": c["guia_fuente"],
        "pagina": c["pagina"],
        "seccion": c["seccion"]
    } for c in chunks]

    embeddings = model.encode(texts, show_progress_bar=True).tolist()

    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas
    )

    return collection
