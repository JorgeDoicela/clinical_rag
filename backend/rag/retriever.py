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
    client = chromadb.PersistentClient(
        path=CHROMA_PERSIST_PATH,
        settings=chromadb.config.Settings(anonymized_telemetry=False)
    )

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

    # Si no hay coincidencias con el filtro específico por guia_fuente, intentar re-ingestar para actualizar la DB
    if not results or not results.get("ids") or not results["ids"][0]:
        print(f"[RAG] Reejecutando ingesta de respaldo para cargar posibles nuevos fragmentos de '{guia_filtro}'...", flush=True)
        try:
            from ingestion.run_ingestion import run_ingestion_pipeline
            run_ingestion_pipeline()
            collection = client.get_collection("gpc_msp")
            results = collection.query(
                query_embeddings=query_embedding,
                n_results=top_k,
                where=where_filter
            )
        except Exception as err:
            print(f"[RAG] Error en re-ingesta: {err}", flush=True)

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
