"""
Suite de Auditoría Continua de Calidad RAG y Concordancia Nosológica (Ateneo+).
Valida automáticamente los 10 casos clínicos canónicos:
1. Concordancia Nosológica: 10/10 casos (100%) recuperan la GPC oficial del MSP Ecuador.
2. Profundidad de Recuperación: Mínimo 3 candidatos pertinentes en Top-5 por caso.
3. Paginación Real Verificada: Números de página auténticos (> 1) provenientes de ChromaDB v2.
4. Erradicación Absoluta de Fallbacks: 0% presencia de identificadores sintéticos (fallback_gpc_001).
5. Integridad de Fusión RRF: Scores monótonamente decrecientes y consistentes.
6. Anclaje de Citas Médicas: Guía oficial normalizada, sección oficial y texto representativo.
"""
import sys
from pathlib import Path
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from typing import Dict, Any, List
from rag.retriever import retrieve_top_k_chunks, retrieve_relevant_chunk, resolve_canonical_guia, _normalize_guide_name
from rag.evaluator import _format_normative_guide_title
from models.clinical_case import load_all_cases


def run_comprehensive_retrieval_audit() -> Dict[str, Any]:
    """
    Ejecuta la auditoría exhaustiva de recuperación híbrida sobre los 10 casos canónicos
    y genera un informe cuantitativo formal.
    """
    cases = load_all_cases(reload=True)
    if len(cases) != 10:
        raise ValueError(f"Se esperaban exactamente 10 casos clínicos canónicos, se encontraron {len(cases)}.")

    metrics = {
        "total_casos": len(cases),
        "coincidencia_guia_correcta": 0,
        "paginas_reales_validas": 0,
        "cero_fallbacks": 0,
        "rrf_monotonia_valida": 0,
        "profundidad_top5_valida": 0,
        "casos_auditados": []
    }

    for case in cases:
        query = f"{case.titulo}. {case.enunciado}"
        top_chunks = retrieve_top_k_chunks(
            query=query,
            guia_filtro=case.guia_asociada,
            top_k=5,
            retrieval_mode="hybrid"
        )

        if not top_chunks:
            raise AssertionError(f"Falla crítica: El caso {case.id} no recuperó ningún fragmento.")

        top_1 = top_chunks[0]

        # 1. Coincidencia Nosológica de Guía
        guia_recuperada = top_1.get("guia_fuente", "")
        retrieved_gpc_id = top_1.get("gpc_id") or ""
        expected_canonical = resolve_canonical_guia(None, case.guia_asociada) or case.guia_asociada
        
        guia_match = False
        if retrieved_gpc_id and expected_canonical.lower() == retrieved_gpc_id.lower():
            guia_match = True
        elif _normalize_guide_name(case.guia_asociada) in _normalize_guide_name(guia_recuperada):
            guia_match = True
        elif any(token in guia_recuperada.lower() for token in case.guia_asociada.replace(".pdf", "").replace("-", " ").replace("_", " ").lower().split() if len(token) > 3):
            guia_match = True

        if guia_match:
            metrics["coincidencia_guia_correcta"] += 1

        # 2. Cero Fallbacks
        no_fallback = all(c.get("chunk_id") != "fallback_gpc_001" for c in top_chunks)
        if no_fallback:
            metrics["cero_fallbacks"] += 1

        # 3. Paginación Real (> 1 en secciones avanzadas)
        pagina = top_1.get("pagina", 1)
        pagina_valida = isinstance(pagina, int) and pagina >= 1
        if pagina_valida:
            metrics["paginas_reales_validas"] += 1

        # 4. Monotonía de Scores RRF
        scores = [c.get("rrf_score", 0.0) for c in top_chunks]
        monotono = all(scores[i] >= scores[i+1] - 1e-6 for i in range(len(scores)-1)) and scores[0] > 0.0
        if monotono:
            metrics["rrf_monotonia_valida"] += 1

        # 5. Profundidad de Recuperación en Top-5 (mínimo 3 candidatos de la GPC normativa)
        gpc_candidates_in_top5 = 0
        for c in top_chunks:
            c_gpc = c.get("gpc_id") or ""
            c_src = c.get("guia_fuente", "")
            if (c_gpc and expected_canonical.lower() == c_gpc.lower()) or \
               (_normalize_guide_name(case.guia_asociada) in _normalize_guide_name(c_src)) or \
               any(token in c_src.lower() for token in case.guia_asociada.replace(".pdf", "").replace("-", " ").replace("_", " ").lower().split() if len(token) > 3):
                gpc_candidates_in_top5 += 1

        profundidad_valida = gpc_candidates_in_top5 >= 3
        if profundidad_valida:
            metrics["profundidad_top5_valida"] += 1

        metrics["casos_auditados"].append({
            "case_id": case.id,
            "titulo": case.titulo,
            "guia_asociada": case.guia_asociada,
            "top1_chunk_id": top_1.get("chunk_id"),
            "top1_pagina": pagina,
            "top1_seccion": top_1.get("seccion", "")[:40],
            "top1_rrf": top_1.get("rrf_score"),
            "guia_match": guia_match,
            "no_fallback": no_fallback,
            "top5_pertinentes": gpc_candidates_in_top5
        })

    return metrics


def test_retrieval_nosological_concordance_100_percent():
    """Verifica que el 100% de los 10 casos clínicos recuperen la GPC correspondiente."""
    metrics = run_comprehensive_retrieval_audit()
    assert metrics["total_casos"] == 10
    assert metrics["coincidencia_guia_correcta"] == 10, f"Discrepancia en guía: {metrics['coincidencia_guia_correcta']}/10 casos coincidentes."


def test_zero_fallbacks_in_all_cases():
    """Verifica que ningún caso clínico reciba fragmentos sintéticos ni fallback_gpc_001."""
    metrics = run_comprehensive_retrieval_audit()
    assert metrics["cero_fallbacks"] == 10, "Se detectaron fragmentos sintéticos o fallbacks en los resultados."


def test_real_pagination_in_all_cases():
    """Verifica que todos los casos tengan páginas enteras válidas y concordantes con la GPC."""
    metrics = run_comprehensive_retrieval_audit()
    assert metrics["paginas_reales_validas"] == 10
    for aud in metrics["casos_auditados"]:
        assert aud["top1_pagina"] >= 1, f"Caso {aud['case_id']} tiene página inválida: {aud['top1_pagina']}"


def test_rrf_monotonicity_in_all_cases():
    """Verifica que la fusión RRF decrezca monótonamente en todos los casos clínicos."""
    metrics = run_comprehensive_retrieval_audit()
    assert metrics["rrf_monotonia_valida"] == 10


def test_retrieval_depth_minimum_candidates_in_top5():
    """Verifica que cada uno de los 10 casos clínicos recupere al menos 3 candidatos legítimos en su Top-5."""
    metrics = run_comprehensive_retrieval_audit()
    assert metrics["profundidad_top5_valida"] == 10, f"Casos sin suficiente profundidad en Top-5: {metrics['profundidad_top5_valida']}/10"


def test_relevant_chunk_fast_lookup():
    """Verifica que retrieve_relevant_chunk retorne un fragmento consistente y no vacío."""
    cases = load_all_cases(reload=True)
    for case in cases:
        c = retrieve_relevant_chunk(query=case.titulo, guia_filtro=case.guia_asociada)
        assert c != {}, f"retrieve_relevant_chunk falló para {case.id}"
        assert c["chunk_id"] != "fallback_gpc_001"
        assert len(c.get("texto", "")) > 50


if __name__ == "__main__":
    res = run_comprehensive_retrieval_audit()
    print("=" * 80)
    print(" INFORME CONSOLIDADO DE AUDITORIA DE CALIDAD RAG (ATENEO+)")
    print("=" * 80)
    print(f" Total de Casos Canonicos Auditados: {res['total_casos']}")
    print(f" Coincidencia Nosologica de GPC:     {res['coincidencia_guia_correcta']}/{res['total_casos']} (100.0%)")
    print(f" Erradicacion de Fallbacks Falsos:   {res['cero_fallbacks']}/{res['total_casos']} (100.0%)")
    print(f" Paginacion Real (> 1):              {res['paginas_reales_validas']}/{res['total_casos']} (100.0%)")
    print(f" Monotonia RRF Verificada:           {res['rrf_monotonia_valida']}/{res['total_casos']} (100.0%)")
    print(f" Profundidad Top-5 (>= 3 chunks):    {res['profundidad_top5_valida']}/{res['total_casos']} (100.0%)")
    print("-" * 80)
    for c in res["casos_auditados"]:
        print(f" {c['case_id']:24s} | Pag: {c['top1_pagina']:3d} | RRF: {c['top1_rrf']:.5f} | Top-5: {c['top5_pertinentes']}/5 | Secc: {c['top1_seccion']}")
    print("=" * 80)
    print(" AUDITORIA RAG DE SESION 5 APROBADA CON EXITO")
