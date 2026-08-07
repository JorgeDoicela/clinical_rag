import json
import time
import sys
from pathlib import Path
from statistics import mean, median

sys.path.append(str(Path(__file__).resolve().parent.parent))

from rag.retriever import retrieve_relevant_chunk
from rag.evaluator import evaluate_clinical_reasoning
from models.schemas import ClinicalCaseSchema

def run_evaluation_benchmark():
    fixture_path = Path(__file__).resolve().parent / "test_cases_fixture.json"
    if not fixture_path.exists():
        print(f"Error: No se encontró {fixture_path}")
        return

    with open(fixture_path, "r", encoding="utf-8") as f:
        test_cases = json.load(f).get("casos_prueba", [])

    print(f"==================================================")
    print(f" Ejecutando Suite de Evaluación de Métricas (Ateneo)")
    print(f" Total de casos de prueba: {len(test_cases)}")
    print(f"==================================================\n")

    retrieval_exitosos = 0
    json_validos_primer_intento = 0
    latencias = []
    detalles = []

    for idx, tc in enumerate(test_cases, start=1):
        start_time = time.time()
        
        caso_dummy = ClinicalCaseSchema(
            id=tc["id"],
            guia_asociada=tc["guia_asociada"],
            titulo=f"Caso de prueba {tc['id']}",
            enunciado="Enunciado de evaluación de métricas",
            pregunta="Pregunta de evaluación de métricas",
            fragmento_gpc_ideal_id=tc.get("fragmento_gpc_ideal_id")
        )

        # 1. Medir Retrieval
        try:
            chunk = retrieve_relevant_chunk(query=tc["respuesta_simulada"], guia_filtro=tc["guia_asociada"])
            retrieval_correcto = (chunk["chunk_id"] == tc.get("fragmento_gpc_ideal_id"))
        except Exception as e:
            chunk = {"chunk_id": "none", "texto": "", "guia_fuente": tc["guia_asociada"], "seccion": "N/A", "pagina": 1}
            retrieval_correcto = False

        if retrieval_correcto:
            retrieval_exitosos += 1

        # 2. Medir LLM + Salida JSON
        json_valido = False
        score_obtenido = 0.0
        try:
            res = evaluate_clinical_reasoning(caso_dummy, tc["respuesta_simulada"], chunk)
            json_valido = True
            json_validos_primer_intento += 1
            score_obtenido = res.score
        except Exception as e:
            json_valido = False

        elapsed = time.time() - start_time
        latencias.append(elapsed)

        detalles.append({
            "test_id": tc["id"],
            "guia": tc["guia_asociada"],
            "retrieval_correcto": retrieval_correcto,
            "retrieved_chunk_id": chunk["chunk_id"],
            "expected_chunk_id": tc.get("fragmento_gpc_ideal_id"),
            "json_valido": json_valido,
            "score": score_obtenido,
            "latencia_segundos": round(elapsed, 3)
        })

        print(f"[{idx}/{len(test_cases)}] Caso {tc['id']} ({tc['guia_asociada']}): "
              f"Retrieval={'[OK]' if retrieval_correcto else '[FAIL]'} | "
              f"JSON={'[OK]' if json_valido else '[FAIL]'} | "
              f"Latencia={elapsed:.2f}s")

    total = len(test_cases)
    precision_retrieval = (retrieval_exitosos / total) * 100 if total > 0 else 0
    tasa_json = (json_validos_primer_intento / total) * 100 if total > 0 else 0
    latencia_promedio = mean(latencias) if latencias else 0
    latencia_mediana = median(latencias) if latencias else 0

    resumen = {
        "total_casos": total,
        "precision_retrieval_porcentaje": round(precision_retrieval, 2),
        "tasa_exito_json_porcentaje": round(tasa_json, 2),
        "latencia_promedio_segundos": round(latencia_promedio, 2),
        "latencia_mediana_segundos": round(latencia_mediana, 2),
        "detalles": detalles
    }

    output_file = Path(__file__).resolve().parent / "resultados_metricas.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(resumen, f, indent=2, ensure_ascii=False)

    print(f"\n==================================================")
    print(f" RESUMEN DE RESULTADOS PARA EL ARTÍCULO CIENTÍFICO")
    print(f"==================================================")
    print(f" Precisión de Retrieval: {precision_retrieval:.1f}% ({retrieval_exitosos}/{total})")
    print(f" Tasa de Formato JSON Válido: {tasa_json:.1f}% ({json_validos_primer_intento}/{total})")
    print(f" Latencia Promedio: {latencia_promedio:.2f} segundos")
    print(f" Latencia Mediana: {latencia_mediana:.2f} segundos")
    print(f" Guardado reporte completo en: {output_file}\n")

if __name__ == "__main__":
    run_evaluation_benchmark()
