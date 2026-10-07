import sys
import re
import unicodedata
from typing import Dict, Any, Optional, List
import chromadb
from sentence_transformers import SentenceTransformer
import sentence_transformers.models
from rank_bm25 import BM25Okapi
from config import (
    CHROMA_PERSIST_PATH,
    EMBEDDING_MODEL_NAME,
    CHROMA_COLLECTION_NAME,
    BM25_INDEX_PATH,
    BASE_DIR
)
from rag.cache_manager import rag_cache_manager
from core.logger import get_logger

logger = get_logger("ateneo.rag.retriever")

def _extract_page_number(meta: Dict[str, Any]) -> int:
    """Extrae de forma defensiva el numero de pagina real como entero positivo >= 1."""
    for key in ("pagina", "pagina_pdf", "pagina_impresa_real"):
        val = meta.get(key)
        if val is not None:
            val_str = str(val).strip()
            if val_str.isdigit():
                parsed = int(val_str)
                if parsed > 0:
                    return parsed
    return 1

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
        logger.info(f"Cargando modelo de embeddings ({model_name})...", extra={"action": "load_embedding_model_start", "model_name": model_name})
        _MODEL_CACHE[model_name] = SentenceTransformer(model_name)
        logger.info(f"Modelo de embeddings '{model_name}' listo.", extra={"action": "load_embedding_model_done", "model_name": model_name})
    return _MODEL_CACHE[model_name]


def get_chroma_client(persist_path: str = CHROMA_PERSIST_PATH) -> chromadb.PersistentClient:
    global _CHROMA_CLIENT
    if _CHROMA_CLIENT is None:
        import os
        os.makedirs(persist_path, exist_ok=True)
        _CHROMA_CLIENT = chromadb.PersistentClient(
            path=persist_path,
            settings=chromadb.config.Settings(
                anonymized_telemetry=False,
                chroma_product_telemetry_impl="rag.chroma_telemetry.NoOpProductTelemetry"
            )
        )
    return _CHROMA_CLIENT

def tokenize_medical_text(text: str) -> List[str]:
    """Tokeniza texto médico para búsqueda léxica BM25 en minúsculas."""
    return re.findall(r'\b[a-záéíóúüñ0-9\-]+\b', text.lower())

def get_bm25_index():
    """Inicializa y cachea el índice BM25 desde archivo serializado o documentos en ChromaDB."""
    global _BM25_INDEX, _BM25_CORPUS_METAS
    if _BM25_INDEX is None:
        import os
        # Prioridad 1: Cargar índice BM25 v2 serializado y metadatos de chunks_corpus_v2
        if os.path.exists(BM25_INDEX_PATH):
            try:
                import pickle
                with open(BM25_INDEX_PATH, "rb") as f:
                    bm25_data = pickle.load(f)
                _BM25_INDEX = bm25_data["bm25"]
                chunk_ids = bm25_data["chunk_ids"]

                corpus_v2_path = BASE_DIR / "data" / "extracted" / "chunks_corpus_v2.json"
                if corpus_v2_path.exists():
                    import json
                    with open(corpus_v2_path, "r", encoding="utf-8") as jf:
                        corpus_list = json.load(jf)
                    chunk_map = {c["chunk_id"]: c for c in corpus_list}
                    _BM25_CORPUS_METAS = []
                    for cid in chunk_ids:
                        c = chunk_map.get(cid, {})
                        _BM25_CORPUS_METAS.append({
                            "chunk_id": cid,
                            "texto": c.get("texto", ""),
                            "metadata": {
                                "guia_fuente": c.get("guia_titulo") or c.get("guia_archivo", ""),
                                "gpc_titulo": c.get("guia_titulo", ""),
                                "gpc_id": c.get("guia_archivo", ""),
                                "cie10": c.get("cie10", ""),
                                "cie11": c.get("cie11", ""),
                                "eje_clinico": c.get("eje_clinico", ""),
                                "seccion": c.get("seccion", "General"),
                                "pagina": c.get("pagina_pdf") or c.get("pagina_impresa_real", 1),
                                "ano_publicacion": c.get("anio", 2026),
                            }
                        })
                    logger.info(f"Índice Sparse BM25 v2 cargado desde archivo con {len(_BM25_CORPUS_METAS)} fragmentos.", extra={"action": "bm25_v2_loaded", "fragment_count": len(_BM25_CORPUS_METAS)})
                    return _BM25_INDEX, _BM25_CORPUS_METAS
            except Exception as e:
                logger.warning(f"Error cargando BM25 precalculado ({e}), recurriendo a ChromaDB...")

        # Prioridad 2: Construir dinámicamente desde ChromaDB
        client = get_chroma_client()
        try:
            collection = client.get_collection(CHROMA_COLLECTION_NAME)
            data = collection.get(include=["documents", "metadatas"])
            docs = data.get("documents", [])
            metas = data.get("metadatas", [])
            ids = data.get("ids", [])

            if docs:
                tokenized_corpus = [tokenize_medical_text(d) for d in docs]
                _BM25_INDEX = BM25Okapi(tokenized_corpus)
                _BM25_CORPUS_METAS = []
                for i in range(len(ids)):
                    m = metas[i] if metas else {}
                    if "guia_fuente" not in m:
                        m["guia_fuente"] = m.get("gpc_titulo") or m.get("gpc_id", "MSP Ecuador")
                    _BM25_CORPUS_METAS.append({
                        "chunk_id": ids[i],
                        "texto": docs[i],
                        "metadata": m
                    })
                logger.info(f"Índice Sparse BM25 construido con {len(docs)} fragmentos.", extra={"action": "bm25_index_built", "fragment_count": len(docs)})
        except Exception as e:
            logger.warning(f"BM25 Index no disponible temporalmente: {e}", extra={"action": "bm25_index_unavailable"})

    return _BM25_INDEX, _BM25_CORPUS_METAS

def _normalize_guide_name(text: str) -> str:
    if not text:
        return ""
    nfd = unicodedata.normalize("NFD", str(text).lower())
    ascii_clean = nfd.encode("ascii", "ignore").decode("ascii")
    clean = ascii_clean.replace(".pdf", "")
    return re.sub(r'[^a-z0-9]', '', clean)

CANONICAL_GPC_ALIASES: Dict[str, Optional[str]] = {
    # Preeclampsia / Eclampsia / Trastornos Hipertensivos del Embarazo
    "preeclampsia": "MSP_Trastornos-hipertensivos-del-embarazo-con-portada-3.pdf",
    "eclampsia": "MSP_Trastornos-hipertensivos-del-embarazo-con-portada-3.pdf",
    "trastornos_hipertensivos": "MSP_Trastornos-hipertensivos-del-embarazo-con-portada-3.pdf",
    "trastornos_hipertensivos_embarazo": "MSP_Trastornos-hipertensivos-del-embarazo-con-portada-3.pdf",
    "trastornoshipertensivosdelembarazo": "MSP_Trastornos-hipertensivos-del-embarazo-con-portada-3.pdf",
    "msptrastornoshipertensivosdelembarazoconportada3": "MSP_Trastornos-hipertensivos-del-embarazo-con-portada-3.pdf",
    
    # Hemorragia Postparto / Posparto / Código Rojo
    "hemorragia_posparto": "Guía-de-hemorragia-postparto.pdf",
    "hemorragia_postparto": "Guía-de-hemorragia-postparto.pdf",
    "codigo_rojo": "Guía-de-hemorragia-postparto.pdf",
    "atonia_uterina": "Guía-de-hemorragia-postparto.pdf",
    "guiadehemorragiapostparto": "Guía-de-hemorragia-postparto.pdf",
    
    # Neumonía Adquirida en la Comunidad (NAC)
    "neumonia": "GPC_neumonía-adquirida_2017.pdf",
    "nac": "GPC_neumonía-adquirida_2017.pdf",
    "nac_neumonia": "GPC_neumonía-adquirida_2017.pdf",
    "gpcneumoniaadquirida2017": "GPC_neumonía-adquirida_2017.pdf",
    
    # Hipertensión Arterial Primaria (HTA)
    "hta": "gpc_hta192019.pdf",
    "hipertension": "gpc_hta192019.pdf",
    "gpc_hta192019": "gpc_hta192019.pdf",
    "gpchta192019": "gpc_hta192019.pdf",
    
    # Sepsis Neonatal
    "sepsis_neonatal": "GPC-Sepsis-neonatal.pdf",
    "gpc_sepsis_neonatal": "GPC-Sepsis-neonatal.pdf",
    "gpc-sepsis-neonatal": "GPC-Sepsis-neonatal.pdf",
    "gpcsepsisneonatal": "GPC-Sepsis-neonatal.pdf",
    
    # Aborto Espontáneo e Incompleto
    "aborto": "gpc_guia_aborto_espontaneo_incompleto_19_feb_2014.pdf",
    "aborto_incompleto": "gpc_guia_aborto_espontaneo_incompleto_19_feb_2014.pdf",
    "aborto_espontaneo": "gpc_guia_aborto_espontaneo_incompleto_19_feb_2014.pdf",
    "gpc_guia_aborto_espontaneo_incompleto_19_feb_2014": "gpc_guia_aborto_espontaneo_incompleto_19_feb_2014.pdf",
    "gpcguiaabortoespontaneoincompleto19feb2014": "gpc_guia_aborto_espontaneo_incompleto_19_feb_2014.pdf",
    
    # Tuberculosis
    "tuberculosis": "GP_Tuberculosis-1.pdf",
    "tb": "GP_Tuberculosis-1.pdf",
    "gp_tuberculosis-1": "GP_Tuberculosis-1.pdf",
    "gp_tuberculosis_1": "GP_Tuberculosis-1.pdf",
    "gptuberculosis1": "GP_Tuberculosis-1.pdf",
    
    # VIH / TARV
    "vih": "gpc_VIH_acuerdo_ministerial05-07-2019.pdf",
    "tarv": "gpc_VIH_acuerdo_ministerial05-07-2019.pdf",
    "gpc_vih_acuerdo_ministerial05-07-2019": "gpc_VIH_acuerdo_ministerial05-07-2019.pdf",
    "gpc_vih_acuerdo_ministerial05_07_2019": "gpc_VIH_acuerdo_ministerial05-07-2019.pdf",
    "gpcvihacuerdoministerial05072019": "gpc_VIH_acuerdo_ministerial05-07-2019.pdf",
    
    # Enfermedad Renal Crónica (ERC)
    "erc": "guia_prevencion_diagnostico_tratamiento_enfermedad_renal_cronica_2018.pdf",
    "enfermedad_renal_cronica": "guia_prevencion_diagnostico_tratamiento_enfermedad_renal_cronica_2018.pdf",
    "guia_prevencion_diagnostico_tratamiento_enfermedad_renal_cronica_2018": "guia_prevencion_diagnostico_tratamiento_enfermedad_renal_cronica_2018.pdf",
    "guiaprevenciondiagnosticotratamientoenfermedadrenalcronica2018": "guia_prevencion_diagnostico_tratamiento_enfermedad_renal_cronica_2018.pdf",
    
    # Encefalopatía Hipóxico-Isquémica / Sangrado Neonatal
    "ehirn": "gpc_ehirn2019.pdf",
    "gpc_ehirn2019": "gpc_ehirn2019.pdf",
    "asfixia_perinatal": "gpc_ehirn2019.pdf",
    "gpcehirn2019": "gpc_ehirn2019.pdf",
    
    # Recién Nacido con Dificultad para Respirar (SDR)
    "sdr_neonatal": "GPC-RECIEN-NACIDO-CON-DIFICULTAD-PARA-RESPIRAR.pdf",
    "gpcreciennacidocondificultadpararespirar": "GPC-RECIEN-NACIDO-CON-DIFICULTAD-PARA-RESPIRAR.pdf",
}

def resolve_canonical_guia(collection, guia_filtro: Optional[str]) -> Optional[str]:
    if not guia_filtro:
        return None
    target_clean = _normalize_guide_name(guia_filtro)
    if not target_clean:
        return None

    # 1. Búsqueda directa en catálogo de alias canónicos clínicos
    if target_clean in CANONICAL_GPC_ALIASES:
        return CANONICAL_GPC_ALIASES[target_clean]

    for alias_key, alias_val in CANONICAL_GPC_ALIASES.items():
        if _normalize_guide_name(alias_key) == target_clean:
            return alias_val

    # 2. Intentar coincidencia difusa con nombres disponibles en el corpus
    try:
        _, corpus = get_bm25_index()
        available_guias = []
        for item in (corpus or []):
            m = item.get("metadata", {})
            for key in ("gpc_id", "gpc_titulo", "guia_fuente"):
                val = m.get(key)
                if val and str(val) not in available_guias:
                    available_guias.append(str(val))
    except Exception:
        available_guias = []

    # Priorizar identificadores de archivo (.pdf)
    for g in available_guias:
        if g.endswith(".pdf"):
            g_clean = _normalize_guide_name(g)
            if target_clean == g_clean or target_clean in g_clean or g_clean in target_clean:
                return g

    # Coincidencia con títulos o fuentes
    for g in available_guias:
        g_clean = _normalize_guide_name(g)
        if target_clean == g_clean or target_clean in g_clean or g_clean in target_clean:
            return g

    return None

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
    # 0. Validación de entrada fail-fast
    if not query or not query.strip():
        return []

    # Búsqueda en capa de Caché LRU Semántica / Léxica
    cached_result = rag_cache_manager.get(
        guia_filtro=guia_filtro,
        query=query,
        top_k=top_k,
        retrieval_mode=retrieval_mode
    )
    if cached_result is not None:
        return cached_result

    client = get_chroma_client()

    try:
        collection = client.get_collection(CHROMA_COLLECTION_NAME)
        if collection.count() == 0:
            raise ValueError(f"Colección ChromaDB {CHROMA_COLLECTION_NAME} vacía.")
    except Exception as e:
        logger.error(f"Error al acceder a la colección {CHROMA_COLLECTION_NAME} en ChromaDB: {e}", extra={"action": "chroma_collection_error"})
        raise

    # Resolver nombre canónico exacto para la base de datos
    canonical_guia = resolve_canonical_guia(collection, guia_filtro)
    if guia_filtro and not canonical_guia:
        logger.warning(
            f"La guía solicitada '{guia_filtro}' no existe en el catálogo canónico ni en el corpus.",
            extra={"action": "guia_not_found", "guia_filtro": guia_filtro}
        )
        return []

    fetch_k = max(top_k * 3, 10)
    dense_ranked_ids = []
    chunk_data_map = {}

    # 1. Búsqueda Densa (si no es sparse_only)
    if retrieval_mode in ["hybrid", "dense_only"]:
        model_target = custom_dense_model or EMBEDDING_MODEL_NAME
        model = get_embedding_model(model_target)
        query_embedding = model.encode([query]).tolist()
        where_filter = None
        if canonical_guia:
            if CHROMA_COLLECTION_NAME == "gpc_msp_v2":
                if canonical_guia.endswith(".pdf"):
                    where_filter = {"gpc_id": canonical_guia}
                else:
                    where_filter = {"gpc_titulo": canonical_guia}
            else:
                where_filter = {"guia_fuente": canonical_guia}

        dense_results = collection.query(
            query_embeddings=query_embedding,
            n_results=fetch_k,
            where=where_filter
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
            for idx in scored_indices:
                if len(bm25_ranked_ids) >= fetch_k:
                    break
                item = bm25_corpus[idx]
                cid = item["chunk_id"]
                meta = item["metadata"]
                
                if clean_canonical:
                    meta_gpc_id = str(meta.get("gpc_id") or "")
                    meta_guia_fuente = str(meta.get("guia_fuente") or "")
                    meta_gpc_titulo = str(meta.get("gpc_titulo") or "")

                    matched = False
                    if canonical_guia.endswith(".pdf") and meta_gpc_id:
                        if meta_gpc_id.lower() == canonical_guia.lower():
                            matched = True
                    
                    if not matched:
                        for cand in (meta_gpc_id, meta_gpc_titulo, meta_guia_fuente):
                            if cand:
                                c_clean = _normalize_guide_name(cand)
                                if c_clean and (clean_canonical in c_clean or c_clean in clean_canonical):
                                    matched = True
                                    break

                    if not matched:
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
            guia_nombre = meta.get("guia_fuente") or meta.get("gpc_titulo") or meta.get("gpc_id") or (guia_filtro or "MSP Ecuador")
            retrieved.append({
                "chunk_id": cid,
                "texto": item["texto"],
                "seccion": meta.get("seccion", "General"),
                "pagina": _extract_page_number(meta),
                "pagina_pdf": meta.get("pagina_pdf"),
                "pagina_impresa_real": meta.get("pagina_impresa_real"),
                "guia_fuente": guia_nombre,
                "gpc_id": meta.get("gpc_id"),
                "ano_publicacion": meta.get("ano_publicacion", meta.get("anio", 2019)),
                "cie10": meta.get("cie10") or meta.get("cie10_codigo", ""),
                "cie11": meta.get("cie11", ""),
                "eje_clinico": meta.get("eje_clinico", ""),
                "distancia": item["distancia"],
                "rrf_score": round(rrf_scores.get(cid, 1.0), 5)
            })

    # Guardar en caché LRU RAG para acelerar consultas subsecuentes
    if retrieved:
        rag_cache_manager.set(
            guia_filtro=guia_filtro,
            query=query,
            top_k=top_k,
            retrieval_mode=retrieval_mode,
            data=retrieved
        )

    return retrieved

def retrieve_relevant_chunk(query: str, guia_filtro: Optional[str] = None, top_k: int = 1) -> Dict[str, Any]:
    """
    Recupera el fragmento óptimo mediante Búsqueda Híbrida RAG (BGE-M3 + BM25 + RRF).
    Retorna el fragmento con mayor puntuación RRF o un diccionario vacío si no hay coincidencias.
    """
    chunks = retrieve_top_k_chunks(query=query, guia_filtro=guia_filtro, top_k=top_k, retrieval_mode="hybrid")
    return chunks[0] if chunks else {}
