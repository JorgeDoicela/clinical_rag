import sys
from typing import Dict, Any, Optional
import chromadb
from sentence_transformers import SentenceTransformer
import sentence_transformers.models
from config import CHROMA_PERSIST_PATH, EMBEDDING_MODEL_NAME

# Compatibilidad defensiva para rutas de importación heredadas de sentence_transformers
if "sentence_transformers.base" not in sys.modules:
    import types
    base_mod = types.ModuleType("sentence_transformers.base")
    base_mod.modules = sentence_transformers.models
    sys.modules["sentence_transformers.base"] = base_mod
    sys.modules["sentence_transformers.base.modules"] = sentence_transformers.models
    sys.modules["sentence_transformers.base.modules.transformer"] = sentence_transformers.models
    sys.modules["sentence_transformers.sentence_transformer"] = sentence_transformers
    sys.modules["sentence_transformers.sentence_transformer.modules"] = sentence_transformers.models

_MODEL_CACHE = None
_CHROMA_CLIENT = None

def get_embedding_model() -> SentenceTransformer:
    global _MODEL_CACHE
    if _MODEL_CACHE is None:
        print(f"[RAG] Cargando modelo de embeddings local ({EMBEDDING_MODEL_NAME})...", flush=True)
        _MODEL_CACHE = SentenceTransformer(EMBEDDING_MODEL_NAME)
        print("[RAG] Modelo de embeddings listo.", flush=True)
    return _MODEL_CACHE

def get_chroma_client(persist_path: str = CHROMA_PERSIST_PATH) -> chromadb.PersistentClient:
    global _CHROMA_CLIENT
    if _CHROMA_CLIENT is None:
        import os
        os.makedirs(persist_path, exist_ok=True)
        _CHROMA_CLIENT = chromadb.PersistentClient(
            path=persist_path,
            settings=chromadb.config.Settings(anonymized_telemetry=False)
        )
    return _CHROMA_CLIENT

def retrieve_relevant_chunk(query: str, guia_filtro: Optional[str] = None, top_k: int = 1) -> Dict[str, Any]:
    """
    Recupera el fragmento de Guía de Práctica Clínica más relevante desde ChromaDB.
    Aplica filtro por guia_fuente si se especifica.
    """
    print(f"[RAG] Búsqueda ejecutada usando el Modelo Fine-Tuned: '{EMBEDDING_MODEL_NAME}' | Filtro Guía: '{guia_filtro}'", flush=True)
    model = get_embedding_model()
    client = get_chroma_client()

    try:
        collection = client.get_collection("gpc_msp")
        if collection.count() == 0:
            raise ValueError("Colección ChromaDB vacía.")
    except Exception:
        print("[RAG] Colección no encontrada o vacía. Ejecutando pipeline de ingesta de respaldo...", flush=True)
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

    # Si no hay coincidencias con el filtro específico por guia_fuente, realizar búsqueda semántica general en la colección
    if not results or not results.get("ids") or not results["ids"][0]:
        print(f"[RAG] Reintento de búsqueda semántica general (sin filtro estricto para '{guia_filtro}')...", flush=True)
        results = collection.query(
            query_embeddings=query_embedding,
            n_results=top_k
        )

    # Si aún no hay coincidencias con el filtro específico, realizar búsqueda semántica general en la colección
    if not results or not results.get("ids") or not results["ids"][0]:
        print(f"[RAG] Reintento de búsqueda semántica general (sin filtro estricto de guía)...", flush=True)
        results = collection.query(
            query_embeddings=query_embedding,
            n_results=top_k
        )

    if not results or not results.get("ids") or not results["ids"][0]:
        print(f"[RAG] ADVERTENCIA: No se hallaron fragmentos en ChromaDB para '{guia_filtro}'. Retornando fallback defensivo.", flush=True)
        return {
            "chunk_id": "fallback_gpc_001",
            "texto": f"Guía de Práctica Clínica del MSP Ecuador para {guia_filtro or 'atención médica'}. Aplicar protocolo normativo de diagnóstico y tratamiento.",
            "seccion": "Normativa General MSP",
            "pagina": 1,
            "guia_fuente": guia_filtro or "MSP Ecuador",
            "distancia": 0.0
        }

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
