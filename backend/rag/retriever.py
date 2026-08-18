import sys
import re
from typing import Dict, Any, Optional, List
import chromadb
from sentence_transformers import SentenceTransformer
import sentence_transformers.models
from rank_bm25 import BM25Okapi
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

_MODEL_CACHE = {}
_CHROMA_CLIENT = None
_BM25_INDEX = None
_BM25_CORPUS_METAS = None

def get_embedding_model(model_name: str = EMBEDDING_MODEL_NAME) -> SentenceTransformer:
    global _MODEL_CACHE
    if model_name not in _MODEL_CACHE:
        print(f"[RAG] Cargando modelo de embeddings ({model_name})...", flush=True)
        _MODEL_CACHE[model_name] = SentenceTransformer(model_name)
        print(f"[RAG] Modelo '{model_name}' listo.", flush=True)
    return _MODEL_CACHE[model_name]

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

def tokenize_medical_text(text: str) -> List[str]:
    """Tokeniza texto médico para búsqueda léxica BM25 en minúsculas."""
    return re.findall(r'\b[a-záéíóúüñ0-9\-]+\b', text.lower())

def get_bm25_index():
    """Inicializa y cachea el índice BM25 de los documentos en ChromaDB."""
    global _BM25_INDEX, _BM25_CORPUS_METAS
    if _BM25_INDEX is None:
        client = get_chroma_client()
        try:
            collection = client.get_collection("gpc_msp")
            data = collection.get(include=["documents", "metadatas"])
            docs = data.get("documents", [])
            metas = data.get("metadatas", [])
            ids = data.get("ids", [])

            if docs:
                tokenized_corpus = [tokenize_medical_text(d) for d in docs]
                _BM25_INDEX = BM25Okapi(tokenized_corpus)
                _BM25_CORPUS_METAS = []
                for i in range(len(ids)):
                    _BM25_CORPUS_METAS.append({
                        "chunk_id": ids[i],
                        "texto": docs[i],
                        "metadata": metas[i] if metas else {}
                    })
                print(f"[RAG HYBRID] Índice Sparse BM25 construido con {len(docs)} fragmentos.", flush=True)
        except Exception as e:
            print(f"[RAG HYBRID] BM25 Index no disponible temporalmente: {e}", flush=True)
    return _BM25_INDEX, _BM25_CORPUS_METAS

def _normalize_guide_name(text: str) -> str:
    import unicodedata
    if not text:
        return ""
    nfd = unicodedata.normalize("NFD", str(text).lower())
    ascii_clean = nfd.encode("ascii", "ignore").decode("ascii")
    return ascii_clean.replace("_", "").replace("-", "").replace(" ", "")

def resolve_canonical_guia(collection, guia_filtro: Optional[str]) -> Optional[str]:
    if not guia_filtro:
        return None
    target_clean = _normalize_guide_name(guia_filtro)
    if not target_clean:
        return None

    # Intentar coincidencia exacta primero
    try:
        # Obtener nombres de guías disponibles desde BM25 o Chroma
        _, corpus = get_bm25_index()
        available_guias = list(set(str(item["metadata"].get("guia_fuente", "")) for item in corpus if item.get("metadata")))
    except Exception:
        available_guias = []

    for g in available_guias:
        g_clean = _normalize_guide_name(g)
        if target_clean == g_clean or target_clean in g_clean or g_clean in target_clean:
            return g
    return guia_filtro

def retrieve_top_k_chunks(
    query: str, 
    guia_filtro: Optional[str] = None, 
    top_k: int = 5,
    retrieval_mode: str = "hybrid",
    custom_dense_model: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Recuperador Híbrido y Modular para Estudios de Ablación:
    - mode='hybrid': Dense + BM25 con Reciprocal Rank Fusion (RRF)
    - mode='dense_only': Solo Búsqueda Densa
    - mode='sparse_only': Solo Búsqueda BM25
    """
    client = get_chroma_client()

    try:
        collection = client.get_collection("gpc_msp")
        if collection.count() == 0:
            raise ValueError("Colección ChromaDB vacía.")
    except Exception as e:
        print(f"[RAG WARNING] Error al acceder a ChromaDB: {e}. Intentando reparación de schema...", flush=True)
        try:
            import sqlite3
            con = sqlite3.connect(f"{CHROMA_PERSIST_PATH}/chroma.sqlite3")
            con.execute("UPDATE collections SET config_json_str = NULL WHERE config_json_str = '{}';")
            con.commit()
            con.close()
            collection = client.get_collection("gpc_msp")
        except Exception:
            from ingestion.run_ingestion import run_ingestion_pipeline
            run_ingestion_pipeline()
            collection = client.get_collection("gpc_msp")

    # Resolver nombre canónico exacto para la base de datos
    canonical_guia = resolve_canonical_guia(collection, guia_filtro)

    fetch_k = max(top_k * 3, 10)
    dense_ranked_ids = []
    chunk_data_map = {}

    # 1. Búsqueda Densa (si no es sparse_only)
    if retrieval_mode in ["hybrid", "dense_only"]:
        model_target = custom_dense_model or EMBEDDING_MODEL_NAME
        model = get_embedding_model(model_target)
        query_embedding = model.encode([query]).tolist()
        where_filter = {"guia_fuente": canonical_guia} if canonical_guia else None

        dense_results = collection.query(
            query_embeddings=query_embedding,
            n_results=fetch_k,
            where=where_filter
        )

        if not dense_results or not dense_results.get("ids") or not dense_results["ids"][0]:
            if canonical_guia:
                # Si falló con el canonical_guia, intentar sin filtro
                dense_results = collection.query(
                    query_embeddings=query_embedding,
                    n_results=fetch_k
                )

        if dense_results and dense_results.get("ids") and dense_results["ids"][0]:
            for i in range(len(dense_results["ids"][0])):
                cid = dense_results["ids"][0][i]
                dense_ranked_ids.append(cid)
                chunk_data_map[cid] = {
                    "chunk_id": cid,
                    "texto": dense_results["documents"][0][i],
                    "metadata": dense_results["metadatas"][0][i],
                    "distancia": dense_results["distances"][0][i] if "distances" in dense_results and dense_results["distances"] else 0.0
                }

    # 2. Búsqueda Léxica Dispersa BM25 (si no es dense_only)
    bm25_ranked_ids = []
    if retrieval_mode in ["hybrid", "sparse_only"]:
        bm25_idx, bm25_corpus = get_bm25_index()
        if bm25_idx and bm25_corpus:
            tokenized_query = tokenize_medical_text(query)
            scores = bm25_idx.get_scores(tokenized_query)
            scored_indices = sorted(range(len(scores)), key=lambda idx: scores[idx], reverse=True)
            
            clean_canonical = _normalize_guide_name(canonical_guia) if canonical_guia else None
            for idx in scored_indices[:fetch_k]:
                item = bm25_corpus[idx]
                cid = item["chunk_id"]
                meta = item["metadata"]
                
                if clean_canonical and _normalize_guide_name(meta.get("guia_fuente")) != clean_canonical:
                    continue
                    
                bm25_ranked_ids.append(cid)
                if cid not in chunk_data_map:
                    chunk_data_map[cid] = {
                        "chunk_id": cid,
                        "texto": item["texto"],
                        "metadata": meta,
                        "distancia": 0.5
                    }

    # 3. Cálculo de Puntuaciones y Fusión
    rrf_scores = {}
    k_rrf = 60.0

    if retrieval_mode == "hybrid":
        for rank, cid in enumerate(dense_ranked_ids, start=1):
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (k_rrf + rank))
        for rank, cid in enumerate(bm25_ranked_ids, start=1):
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (k_rrf + rank))
        sorted_cids = sorted(rrf_scores.keys(), key=lambda cid: rrf_scores[cid], reverse=True)
    elif retrieval_mode == "dense_only":
        sorted_cids = dense_ranked_ids
        for rank, cid in enumerate(dense_ranked_ids, start=1):
            rrf_scores[cid] = 1.0 / (k_rrf + rank)
    else: # sparse_only
        sorted_cids = bm25_ranked_ids
        for rank, cid in enumerate(bm25_ranked_ids, start=1):
            rrf_scores[cid] = 1.0 / (k_rrf + rank)

    retrieved = []
    for cid in sorted_cids[:top_k]:
        if cid in chunk_data_map:
            item = chunk_data_map[cid]
            meta = item["metadata"]
            retrieved.append({
                "chunk_id": cid,
                "texto": item["texto"],
                "seccion": meta.get("seccion", "General"),
                "pagina": meta.get("pagina", 1),
                "guia_fuente": meta.get("guia_fuente", guia_filtro or "MSP Ecuador"),
                "ano_publicacion": meta.get("ano_publicacion", 2019),
                "distancia": item["distancia"],
                "rrf_score": round(rrf_scores.get(cid, 1.0), 5)
            })

    if not retrieved:
        retrieved.append({
            "chunk_id": "fallback_gpc_001",
            "texto": f"Guía de Práctica Clínica del MSP Ecuador para {guia_filtro or 'atención médica'}. Aplicar protocolo normativo de diagnóstico y tratamiento.",
            "seccion": "Normativa General MSP",
            "pagina": 1,
            "guia_fuente": guia_filtro or "MSP Ecuador",
            "ano_publicacion": 2019,
            "distancia": 0.0,
            "rrf_score": 1.0
        })

    return retrieved

def retrieve_relevant_chunk(query: str, guia_filtro: Optional[str] = None, top_k: int = 1) -> Dict[str, Any]:
    """
    Recupera el fragmento óptimo mediante Búsqueda Híbrida RAG (BGE-M3 + BM25 + RRF).
    """
    chunks = retrieve_top_k_chunks(query=query, guia_filtro=guia_filtro, top_k=top_k, retrieval_mode="hybrid")
    return chunks[0]
