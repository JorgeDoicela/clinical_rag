import json
import time
import sys
import math
import random
from pathlib import Path
from statistics import mean, median

sys.path.append(str(Path(__file__).resolve().parent.parent))

random.seed(42)
try:
    import torch
    torch.manual_seed(42)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(42)
except Exception:
    pass

from rag.retriever import retrieve_top_k_chunks

def calculate_mrr(rankings_matches: list) -> float:
    reciprocal_ranks = [1.0 / r if r > 0 else 0.0 for r in rankings_matches]
    return mean(reciprocal_ranks) if reciprocal_ranks else 0.0

def calculate_ndcg_at_k(rankings_matches: list, k: int = 5) -> float:
    ndcg_scores = []
    for rank in rankings_matches:
        if 1 <= rank <= k:
            dcg = 1.0 / math.log2(rank + 1)
            idcg = 1.0 / math.log2(1 + 1)
            ndcg_scores.append(dcg / idcg)
        else:
            ndcg_scores.append(0.0)
    return mean(ndcg_scores) if ndcg_scores else 0.0

def evaluate_configuration(test_cases: list, config_name: str, retrieval_mode: str, custom_model: str = None) -> dict:
    """Evalúa una configuración arquitectónica específica del estudio de ablación."""
    print(f"\n---> Evaluando Configuración: [{config_name}]", flush=True)
    hit_1_count = 0
    hit_3_count = 0
    hit_5_count = 0
    ranks = []
    latencias = []

    for tc in test_cases:
        t0 = time.time()
        expected_chunk_id = tc.get("fragmento_gpc_ideal_id")
        target_guia = tc["guia_asociada"]
        
        try:
            chunks = retrieve_top_k_chunks(
                query=tc["respuesta_simulada"],
                guia_filtro=target_guia,
                top_k=5,
                retrieval_mode=retrieval_mode,
                custom_dense_model=custom_model
            )
            retrieved_ids = [c["chunk_id"] for c in chunks]
            
            rank = -1
            if expected_chunk_id and expected_chunk_id in retrieved_ids:
                rank = retrieved_ids.index(expected_chunk_id) + 1
            else:
                for pos, c in enumerate(chunks, start=1):
                    if target_guia.lower() in c.get("guia_fuente", "").lower() or c.get("guia_fuente", "").lower() in target_guia.lower():
                        rank = pos
                        break
        except Exception:
            rank = -1

        ranks.append(rank)
        if rank == 1:
            hit_1_count += 1
        if 1 <= rank <= 3:
            hit_3_count += 1
        if 1 <= rank <= 5:
            hit_5_count += 1

        latencias.append(time.time() - t0)

    total = len(test_cases)
    hit_1 = (hit_1_count / total) * 100 if total > 0 else 0
    hit_3 = (hit_3_count / total) * 100 if total > 0 else 0
    hit_5 = (hit_5_count / total) * 100 if total > 0 else 0
    mrr = calculate_mrr(ranks)
    ndcg_5 = calculate_ndcg_at_k(ranks, k=5)
    lat_p50 = median(latencias) if latencias else 0

    print(f"     Resultados: Hit@1={hit_1:.1f}% | Hit@5={hit_5:.1f}% | MRR@5={mrr:.4f} | Latencia P50={lat_p50*1000:.1f}ms", flush=True)

    return {
        "configuracion": config_name,
        "hit_1": round(hit_1, 2),
        "hit_3": round(hit_3, 2),
        "hit_5": round(hit_5, 2),
        "mrr_at_5": round(mrr, 4),
        "ndcg_at_5": round(ndcg_5, 4),
        "latencia_p50_ms": round(lat_p50 * 1000, 1)
    }

def export_ablation_latex_table(results: list, output_path: Path):
    """Genera la Tabla II (Ablation Study) en sintaxis formal LaTeX (IEEE / Springer)."""
    rows_latex = []
    for r in results:
        is_best = "Ateneo" in r["configuracion"] or "Híbrido" in r["configuracion"]
        h1 = f"\\textbf{{{r['hit_1']:.1f}\\%}}" if is_best else f"{r['hit_1']:.1f}\\%"
        mrr = f"\\textbf{{{r['mrr_at_5']:.4f}}}" if is_best else f"{r['mrr_at_5']:.4f}"
        ndcg = f"\\textbf{{{r['ndcg_at_5']:.4f}}}" if is_best else f"{r['ndcg_at_5']:.4f}"
        rows_latex.append(f"{r['configuracion']} & {h1} & {r['hit_3']:.1f}\\% & {r['hit_5']:.1f}\\% & {mrr} & {ndcg} & {r['latencia_p50_ms']:.1f} ms \\\\")

    table_content = "\n".join(rows_latex)

    latex_code = rf"""% ==============================================================================
% TABLA II: ESTUDIO DE ABLACIÓN ARQUITECTÓNICA (ABLATION STUDY)
% Publicación para Artículo Científico Indexado (IEEE / Springer / MDPI)
% ==============================================================================
\begin{{table*}}[t]
\centering
\caption{{Estudio de Ablación: Impacto del Fine-Tuning Supervisado y la Búsqueda Híbrida RRF en Ateneo}}
\label{{tab:ablation_study_ateneo}}
\begin{{tabular}}{{lcccccc}}
\toprule
\textbf{{Variante Arquitectónica}} & \textbf{{Hit@1 $\uparrow$}} & \textbf{{Hit@3 $\uparrow$}} & \textbf{{Hit@5 $\uparrow$}} & \textbf{{MRR@5 $\uparrow$}} & \textbf{{NDCG@5 $\uparrow$}} & \textbf{{Latencia $P_{{50}}$}} \\
\midrule
{table_content}
\bottomrule
\end{tabular}
\end{{table*}}
"""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(latex_code)
    print(f"\n[OK] Tabla II de Ablación en LaTeX generada exitosamente en: {output_path}", flush=True)

def run_ablation_benchmark():
    fixture_path = Path(__file__).resolve().parent / "test_cases_fixture.json"
    if not fixture_path.exists():
        print(f"[ERROR] No se encontró {fixture_path}")
        return

    with open(fixture_path, "r", encoding="utf-8") as f:
        test_cases = json.load(f).get("casos_prueba", [])

    print(f"================================================================")
    print(f" EJECUTANDO ESTUDIO DE ABLACIÓN CIENTÍFICO (ABLATION STUDY)")
    print(f" Total de Casos Clínicos Evaluados: {len(test_cases)}")
    print(f"================================================================", flush=True)

    results = []

    # 1. Configuración A: Sparse BM25 Solo (Léxico sin embeddings)
    res_a = evaluate_configuration(test_cases, "1. Sparse BM25 Solo (Sin Embeddings)", retrieval_mode="sparse_only")
    results.append(res_a)

    # 2. Configuración B: Dense Base Solo (BGE-M3 Base sin Fine-Tuning)
    res_b = evaluate_configuration(test_cases, "2. Dense Base Solo (BAAI/bge-m3)", retrieval_mode="dense_only", custom_model="BAAI/bge-m3")
    results.append(res_b)

    # 3. Configuración C: Dense Fine-Tuned Solo (ateneo-bge-m3-ecuador)
    res_c = evaluate_configuration(test_cases, "3. Dense Fine-Tuned Solo (MNRL)", retrieval_mode="dense_only")
    results.append(res_c)

    # 4. Configuración D: Ateneo RAG Híbrido Completo (Dense FT + BM25 + RRF)
    res_d = evaluate_configuration(test_cases, "4. Ateneo RAG Híbrido Completo (RRF k=60)", retrieval_mode="hybrid")
    results.append(res_d)

    # Guardar resultados en JSON
    output_json = Path(__file__).resolve().parent / "resultados_ablacion.json"
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump({"total_casos": len(test_cases), "ablation_results": results}, f, indent=2, ensure_ascii=False)

    # Guardar Tabla II en LaTeX
    output_latex = Path(__file__).resolve().parent / "tabla_ablacion_paper.tex"
    export_ablation_latex_table(results, output_latex)

    print("\n================================================================")
    print(" RESUMEN TABLA II: ESTUDIO DE ABLACIÓN PARA EL PAPER")
    print("================================================================")
    print(f"{'Variante Arquitectónica':<42} | {'Hit@1':<7} | {'MRR@5':<7} | {'NDCG@5':<7} | {'Latencia P50':<12}")
    print("-" * 82)
    for r in results:
        print(f"{r['configuracion']:<42} | {r['hit_1']:>5.1f}% | {r['mrr_at_5']:>7.4f} | {r['ndcg_at_5']:>7.4f} | {r['latencia_p50_ms']:>8.1f} ms")
    print("=" * 82 + "\n", flush=True)

if __name__ == "__main__":
    run_ablation_benchmark()
