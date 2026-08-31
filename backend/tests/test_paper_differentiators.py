import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from evaluation.faithfulness_scorer import calculate_faithfulness_score
from models.learning_analytics import calculate_cohort_ibf, IBF_CRITICAL_THRESHOLD, IBF_MODERATE_THRESHOLD
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_faithfulness_scorer():
    print("\n" + "="*70)
    print(" 1. TEST DE FAITHFULNESS SCORE (FIDELIDAD NORMATIVA / ANTI-ALUCINACIÓN)")
    print("="*70)
    
    mock_chunk = """
    En pacientes con crisis hipertensiva tipo emergencia con daño de órgano blanco,
    se recomienda nitroprusiato de sodio o labetalol intravenoso.
    Iniciar con labetalol 20 mg en bolo IV cada 10 minutos hasta alcanzar meta de PA.
    """
    
    aciertos_validos = [
        "Indicó labetalol intravenoso en bolo para emergencia hipertensiva",
        "Reconoció daño de órgano blanco según la GPC"
    ]
    omisiones_validas = [
        "Omitió la dosis inicial de 20 mg cada 10 minutos"
    ]
    
    res = calculate_faithfulness_score(aciertos_validos, omisiones_validas, mock_chunk)
    
    assert res["faithfulness_score"] >= 0.80, f"Score de fidelidad esperado >= 0.80, obtenido: {res['faithfulness_score']}"
    assert res["grounded_claims"] == res["total_claims"]
    print(f"  [PASS] Faithfulness Score: {res['faithfulness_score']*100:.1f}% | Nivel: {res['grounding_level']}")
    print(f"  [PASS] Afirmaciones Verificadas: {res['grounded_claims']}/{res['total_claims']} con grounding normativo.")

def test_learning_analytics_ibf():
    print("\n" + "="*70)
    print(" 2. TEST DE ÍNDICE DE BRECHA FORMATIVA (IBF) POR COHORTE")
    print("="*70)
    
    mock_evaluations = [
        {"score": 5.0, "competencias_deficientes": [{"eje": "tratamiento", "descripcion": "Dosis errónea"}]},
        {"score": 6.0, "competencias_deficientes": [{"eje": "tratamiento", "descripcion": "Fármaco de segunda línea"}]},
        {"score": 8.5, "competencias_deficientes": []},
        {"score": 9.0, "competencias_deficientes": []}
    ]
    
    report = calculate_cohort_ibf(mock_evaluations)
    
    assert "ibf_global" in report
    assert "ejes_analiticos" in report
    assert len(report["ejes_analiticos"]) == 4
    
    print(f"  [PASS] IBF Global de Cohorte: {report['ibf_global_porcentaje']}% ({report['nivel_riesgo_global']})")
    for eje in report["ejes_analiticos"]:
        print(f"    - Eje: {eje['nombre']:45s} | IBF: {eje['ibf_porcentaje']:5.1f}% | Severidad: {eje['severidad']}")

def test_new_api_routes():
    print("\n" + "="*70)
    print(" 3. TEST DE INTEGRACIÓN ENDPOINTS B2B (IBF & FAITHFULNESS)")
    print("="*70)
    
    res1 = client.get("/api/history/ibf-cohort")
    assert res1.status_code == 200
    data1 = res1.json()
    assert "ibf_global" in data1
    assert "ejes_analiticos" in data1
    print("  [PASS] GET /api/history/ibf-cohort -> 200 OK (IBF calculado)")

    res2 = client.get("/api/history/faithfulness-benchmark")
    assert res2.status_code == 200
    data2 = res2.json()
    assert "promedio_faithfulness_score" in data2
    print(f"  [PASS] GET /api/history/faithfulness-benchmark -> 200 OK (Score: {data2['promedio_faithfulness_score']*100:.1f}%)")

if __name__ == "__main__":
    print("\n" + "#"*70)
    print(" SUITE DE PRUEBAS DE DIFERENCIADORES CIENTÍFICOS (FAITHFULNESS & IBF)")
    print("#"*70)
    
    test_faithfulness_scorer()
    test_learning_analytics_ibf()
    test_new_api_routes()
    
    print("\n" + "#"*70)
    print(" TODAS LAS PRUEBAS DE DIFERENCIADORES PASARON SATISFACTORIAMENTE (PASS)")
    print("#"*70 + "\n")
