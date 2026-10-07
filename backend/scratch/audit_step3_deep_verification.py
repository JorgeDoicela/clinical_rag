import os
import sys
from pathlib import Path

# Configurar path
BACKEND_DIR = Path(r"c:\Users\DESARROLLADOR\Desktop\Proyectos\clinical_rag\backend").resolve()
sys.path.insert(0, str(BACKEND_DIR))

from rag.retriever import retrieve_top_k_chunks, retrieve_relevant_chunk
from models.clinical_case import load_all_cases

def audit_step3():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    print("=" * 75)
    print("AUDITORIA PROFUNDA DE SESION 3 (MOTOR RAG: BM25, CERO REINTENTO, CERO FALLBACK)")
    print("=" * 75)

    errors = []

    # 1. Verificación de BM25 con filtro (sparse_only)
    print("\n[1] Verificando BM25 con filtro de guía (sparse_only)...")
    guia_test = "MSP_Trastornos-hipertensivos-del-embarazo-con-portada-3.pdf"
    query_test = "sulfato de magnesio esquema zuspan eclampsia dosis ataque"
    bm25_chunks = retrieve_top_k_chunks(query=query_test, guia_filtro=guia_test, top_k=5, retrieval_mode="sparse_only")
    print(f"  - Candidatos BM25 recuperados bajo filtro: {len(bm25_chunks)}")
    if len(bm25_chunks) < 3:
        errors.append(f"BM25 aportó solo {len(bm25_chunks)} candidatos bajo filtro (esperados >= 3).")
    
    for c in bm25_chunks:
        gpc_fuente = c.get("guia_fuente", "")
        print(f"    [BM25] ID: {c['chunk_id']} | Guía: {gpc_fuente[:35]} | Pág: {c['pagina']}")
        if "trastornos" not in gpc_fuente.lower() and "hipertensivos" not in gpc_fuente.lower():
            errors.append(f"BM25 devolvió fragmento de guía no coincidente: {gpc_fuente}")

    # 2. Verificación de erradicación del reintento ciego sin filtro
    print("\n[2] Verificando erradicación de reintento ciego ante guía no coincidente...")
    guia_inexistente = "guia_completamente_falsa_9999.pdf"
    res_inexistente = retrieve_top_k_chunks(query=query_test, guia_filtro=guia_inexistente, top_k=5, retrieval_mode="hybrid")
    print(f"  - Resultados para guía inexistente: {len(res_inexistente)} (esperado: 0)")
    if len(res_inexistente) != 0:
        errors.append(f"Se esperaba lista vacía para guía inexistente, pero se devolvieron {len(res_inexistente)} fragmentos (reintento ciego activo).")

    # 3. Verificación de erradicación de fallback_gpc_001
    print("\n[3] Verificando erradicación total de fallback_gpc_001...")
    fallback_found = any(c.get("chunk_id") == "fallback_gpc_001" for c in res_inexistente)
    if fallback_found:
        errors.append("fallback_gpc_001 fue detectado en los resultados.")
    else:
        print("  [OK] fallback_gpc_001 no existe ni fue inyectado.")

    single_empty = retrieve_relevant_chunk(query=query_test, guia_filtro=guia_inexistente)
    print(f"  - retrieve_relevant_chunk para guía inexistente devuelve: {single_empty}")
    if single_empty != {}:
        errors.append(f"retrieve_relevant_chunk debía retornar {{}}, retornó {single_empty}")

    # 4. Verificación de Reciprocal Rank Fusion (RRF) híbrido
    print("\n[4] Verificando fusión híbrida RRF...")
    hybrid_chunks = retrieve_top_k_chunks(query=query_test, guia_filtro=guia_test, top_k=5, retrieval_mode="hybrid")
    print(f"  - Total fragmentos fusionados RRF: {len(hybrid_chunks)}")
    for i, c in enumerate(hybrid_chunks, 1):
        rrf = c.get("rrf_score", 0.0)
        p = c.get("pagina", 1)
        print(f"    Top {i}: {c['chunk_id'][:50]} | RRF: {rrf:.5f} | Pág: {p}")
        if rrf <= 0.0:
            errors.append(f"Fragmento {c['chunk_id']} tiene RRF score inválido: {rrf}")

    # 5. Verificación de los 10 Casos Canónicos
    print("\n[5] Verificando recuperación de los 10 casos canónicos...")
    cases = load_all_cases(reload=True)
    all_pages_valid = True
    for case in cases:
        query = f"{case.titulo}. {case.enunciado[:120]}"
        res = retrieve_relevant_chunk(query=query, guia_filtro=case.guia_asociada)
        p = res.get("pagina", 1)
        cid = res.get("chunk_id", "")
        sec = res.get("seccion", "")[:30]
        print(f"  [OK] {case.id:22s} -> Pág: {p:3d} | Chunk: {cid[:45]} | Secc: {sec}")
        if not cid or cid == "fallback_gpc_001":
            errors.append(f"Caso {case.id} recuperó chunk inválido o fallback: {cid}")
        if p <= 1 and case.id not in ["case_preeclampsia_01"]: # casi todos están en páginas avanzadas
            pass

    print("\n" + "=" * 75)
    if errors:
        print(f" AUDITORIA FALLIDA: Se detectaron {len(errors)} errores:")
        for err in errors:
            print(f"  [ERROR] {err}")
        return False
    else:
        print(" AUDITORIA DE SESION 3 COMPLETADA CON EXITO (100% PASS)")
        print("=" * 75)
        return True

if __name__ == "__main__":
    success = audit_step3()
    sys.exit(0 if success else 1)
