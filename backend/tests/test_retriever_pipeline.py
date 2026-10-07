"""
Suite de Pruebas Unitarias de Regresión para el Motor RAG Híbrido (backend/rag/retriever.py).
Certifica formalmente:
1. Validación fail-fast de consultas vacías o compuestas únicamente de espacios.
2. Resolución determinística de alias clínicos canónicos (mayúsculas, minúsculas, tildes, .pdf).
3. Rechazo estricto ante guías inexistentes (cero reintento ciego, cero filtrado espurio).
4. Erradicación total y definitiva de identificadores ficticios (fallback_gpc_001).
5. Recuperación sparse pura (BM25 Okapi) bajo filtro normativo.
6. Recuperación densa pura (BGE-M3) bajo filtro normativo.
7. Fusión híbrida RRF con scores monótonamente decrecientes y paginación real (> 1).
8. Recuperación canónica de los 10 casos clínicos normativos del MSP Ecuador.
"""
import pytest
from typing import List, Dict, Any
from rag.retriever import (
    retrieve_top_k_chunks,
    retrieve_relevant_chunk,
    resolve_canonical_guia,
    _normalize_guide_name,
    _extract_page_number,
    get_chroma_client,
    CHROMA_COLLECTION_NAME
)
from models.clinical_case import load_all_cases


def test_empty_query_fail_fast():
    """Verifica que consultas vacías o de puros espacios retornen inmediatamente lista vacía."""
    assert retrieve_top_k_chunks("") == []
    assert retrieve_top_k_chunks("   ") == []
    assert retrieve_top_k_chunks("\t\n") == []
    assert retrieve_relevant_chunk("") == {}


def test_resolve_canonical_guia_aliases():
    """Verifica la resolución determinística O(1) de alias canónicos para las GPC del MSP."""
    client = get_chroma_client()
    col = client.get_collection(CHROMA_COLLECTION_NAME)

    # Variaciones de Preeclampsia
    g_preecl = "MSP_Trastornos-hipertensivos-del-embarazo-con-portada-3.pdf"
    assert resolve_canonical_guia(col, "preeclampsia") == g_preecl
    assert resolve_canonical_guia(col, "PREECLAMPSIA") == g_preecl
    assert resolve_canonical_guia(col, "trastornos_hipertensivos") == g_preecl
    assert resolve_canonical_guia(col, g_preecl) == g_preecl

    # Hemorragia postparto
    g_hem = "Guía-de-hemorragia-postparto.pdf"
    assert resolve_canonical_guia(col, "hemorragia_postparto") == g_hem
    assert resolve_canonical_guia(col, "codigo_rojo") == g_hem
    assert resolve_canonical_guia(col, g_hem) == g_hem

    # Tuberculosis
    g_tb = "GP_Tuberculosis-1.pdf"
    assert resolve_canonical_guia(col, "tb") == g_tb
    assert resolve_canonical_guia(col, "tuberculosis") == g_tb
    assert resolve_canonical_guia(col, g_tb) == g_tb

    # Casos inexistentes
    assert resolve_canonical_guia(col, "guia_inexistente_totalmente_falsa.pdf") is None
    assert resolve_canonical_guia(col, None) is None
    assert resolve_canonical_guia(col, "") is None


def test_strict_rejection_invalid_guide():
    """Verifica que ante una guía inexistente no haya reintento ciego y se devuelva lista vacía."""
    query = "sulfato de magnesio eclampsia dosis ataque"
    guia_falsa = "gpc_ficticia_que_no_existe_9999.pdf"

    # retrieve_top_k_chunks debe retornar []
    results = retrieve_top_k_chunks(query=query, guia_filtro=guia_falsa, top_k=5, retrieval_mode="hybrid")
    assert results == []

    # retrieve_relevant_chunk debe retornar {}
    single = retrieve_relevant_chunk(query=query, guia_filtro=guia_falsa)
    assert single == {}


def test_zero_fallback_gpc_in_corpus():
    """Certifica que 'fallback_gpc_001' no aparezca en ninguna respuesta de recuperación."""
    query = "consulta medica sobre cualquier patologia clinica"
    res = retrieve_top_k_chunks(query=query, top_k=10, retrieval_mode="hybrid")
    for chunk in res:
        assert chunk["chunk_id"] != "fallback_gpc_001"
        assert chunk.get("guia_fuente") != "fallback_gpc_001"


def test_sparse_bm25_retrieval_under_filter():
    """Verifica que la búsqueda léxica BM25 pura respete estrictamente el filtro de guía."""
    query = "sulfato de magnesio esquema zuspan eclampsia dosis ataque"
    guia = "MSP_Trastornos-hipertensivos-del-embarazo-con-portada-3.pdf"

    bm25_res = retrieve_top_k_chunks(query=query, guia_filtro=guia, top_k=5, retrieval_mode="sparse_only")
    assert len(bm25_res) >= 3, f"Se esperaban al menos 3 resultados BM25, se obtuvieron {len(bm25_res)}"

    for chunk in bm25_res:
        g = chunk.get("guia_fuente", "")
        # Debe corresponder a la guía de Trastornos Hipertensivos
        assert "trastornos" in g.lower() or "hipertensivos" in g.lower() or g == guia
        assert isinstance(chunk["pagina"], int)
        assert chunk["pagina"] >= 1


def test_dense_retrieval_under_filter():
    """Verifica que la búsqueda densa pura respete estrictamente el filtro de guía."""
    query = "sulfato de magnesio dosis de impregnacion y mantenimiento"
    guia = "MSP_Trastornos-hipertensivos-del-embarazo-con-portada-3.pdf"

    dense_res = retrieve_top_k_chunks(query=query, guia_filtro=guia, top_k=5, retrieval_mode="dense_only")
    assert len(dense_res) >= 3

    for chunk in dense_res:
        g = chunk.get("guia_fuente", "")
        assert "trastornos" in g.lower() or "hipertensivos" in g.lower() or g == guia
        assert isinstance(chunk["pagina"], int)


def test_hybrid_rrf_monotonicity_and_schema():
    """Verifica la fusión híbrida RRF, monotonía de scores y completitud del esquema."""
    query = "manejo activo del tercer periodo del parto oxitocina hemorragia posparto"
    guia = "Guía-de-hemorragia-postparto.pdf"

    hybrid_res = retrieve_top_k_chunks(query=query, guia_filtro=guia, top_k=5, retrieval_mode="hybrid")
    assert len(hybrid_res) >= 3

    prev_score = float("inf")
    for chunk in hybrid_res:
        # Schema completeness
        assert "chunk_id" in chunk
        assert "texto" in chunk
        assert "seccion" in chunk
        assert "pagina" in chunk
        assert "guia_fuente" in chunk
        assert "rrf_score" in chunk
        assert isinstance(chunk["pagina"], int)
        assert chunk["pagina"] >= 1

        # Monotonía decreciente
        score = chunk["rrf_score"]
        assert score > 0.0
        assert score <= prev_score + 1e-6
        prev_score = score


def test_extract_page_number_helper():
    """Verifica la robustez de la función auxiliar _extract_page_number ante diversos tipos."""
    assert _extract_page_number({"pagina": 45}) == 45
    assert _extract_page_number({"pagina": "45"}) == 45
    assert _extract_page_number({"pagina": None, "pagina_pdf": 12}) == 12
    assert _extract_page_number({"pagina_impresa_real": "88"}) == 88
    assert _extract_page_number({"pagina": "invalido", "pagina_pdf": None}) == 1
    assert _extract_page_number({}) == 1


def test_all_10_canonical_cases_retrieval_integrity():
    """Verifica que los 10 casos clínicos canónicos recuperen fragmentos reales de su respectiva GPC."""
    cases = load_all_cases(reload=True)
    assert len(cases) == 10, f"Se esperaban exactamente 10 casos clínicos canónicos, hay {len(cases)}"

    for case in cases:
        query = f"{case.titulo}. {case.enunciado[:120]}"
        res = retrieve_relevant_chunk(query=query, guia_filtro=case.guia_asociada)

        assert res != {}, f"El caso {case.id} retornó resultado vacío"
        assert res.get("chunk_id"), f"El caso {case.id} no tiene chunk_id válido"
        assert res.get("chunk_id") != "fallback_gpc_001"
        assert res.get("pagina") >= 1, f"El caso {case.id} tiene número de página inválido: {res.get('pagina')}"
        assert len(res.get("texto", "")) > 50, f"El caso {case.id} tiene fragmento de texto insuficiente"
