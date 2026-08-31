import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from adaptive.knowledge_space import knowledge_space, CLINICAL_COMPETENCIES
from adaptive.knowledge_tracer import (
    get_initial_knowledge_state,
    bayesian_update,
    get_student_knowledge_state,
    update_knowledge_state_from_score,
    get_student_learning_path,
    BKT_PARAMETERS
)
from adaptive.curriculum_engine import (
    detect_zone_of_proximal_development,
    select_optimal_next_case
)
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_knowledge_space_topology():
    print("\n" + "="*70)
    print(" 1. TEST DE TOPOLOGÍA DEL GRAFO KST (7 COMPETENCIAS CLÍNICAS)")
    print("="*70)
    
    assert len(CLINICAL_COMPETENCIES) == 7, "Debe contener 7 competencias clínicas"
    topo = knowledge_space.get_topology_dict()
    assert len(topo["nodes"]) == 7
    assert len(topo["edges"]) >= 6
    
    # Validar prerrequisitos de Diagnóstico Diferencial
    prereqs_diff = knowledge_space.get_prerequisites("diagnostico_diferencial")
    assert "semiologia_anamnesis" in prereqs_diff
    print("  [PASS] Grafo KST: 7 nodos y dependencias de prerrequisito validadas.")

def test_bayesian_knowledge_tracing():
    print("\n" + "="*70)
    print(" 2. TEST DE BAYESIAN KNOWLEDGE TRACING (BKT - ACTUALIZACIÓN PROBABILÍSTICA)")
    print("="*70)
    
    params = BKT_PARAMETERS["semiologia_anamnesis"]
    p_initial = params["L0"] # 0.40
    
    # 1 acierto consecutivo
    p_after_success = bayesian_update(p_initial, observation_correct=True, params=params)
    assert p_after_success > p_initial, f"El dominio debió aumentar: {p_after_success} vs {p_initial}"
    print(f"  [PASS] BKT Acierto: P(L) sube de {p_initial:.2f} a {p_after_success:.2f}")

    # 1 fallo
    p_after_failure = bayesian_update(p_initial, observation_correct=False, params=params)
    assert p_after_failure < p_initial, f"El dominio debió disminuir: {p_after_failure} vs {p_initial}"
    print(f"  [PASS] BKT Fallo: P(L) baja de {p_initial:.2f} a {p_after_failure:.2f}")

def test_curriculum_engine_recommendation():
    print("\n" + "="*70)
    print(" 3. TEST DE MOTOR DE ZDP Y RECOMENDACIÓN ADAPTATIVA DE CASOS")
    print("="*70)
    
    dummy_student = "usr_test_intern_001"
    recommendation = select_optimal_next_case(dummy_student)
    
    assert "case" in recommendation and recommendation["case"] is not None
    assert "competencia_objetivo" in recommendation
    assert "justificacion_pedagogica" in recommendation
    assert len(recommendation["justificacion_pedagogica"]) > 20
    assert "zdp_competencias" in recommendation
    
    rec_case = recommendation["case"]
    target_comp = recommendation["competencia_objetivo"]
    print(f"  [PASS] Caso Recomendado: {rec_case['id']} ({rec_case['titulo'][:40]}...)")
    print(f"  [PASS] Competencia Objetivo ZDP: {target_comp['nombre']} ({target_comp['id']})")
    print(f"  [PASS] Justificación: {recommendation['justificacion_pedagogica']}")

def test_adaptive_api_endpoints():
    print("\n" + "="*70)
    print(" 4. TEST DE INTEGRACIÓN HTTP ENDPOINTS ADAPTATIVOS (/api/adaptive)")
    print("="*70)
    
    # 1. Next Case
    res1 = client.get("/api/adaptive/next-case?student_id=usr_alumno_001")
    assert res1.status_code == 200
    data1 = res1.json()
    assert "case" in data1
    assert "justificacion_pedagogica" in data1
    print("  [PASS] GET /api/adaptive/next-case -> 200 OK")

    # 2. Knowledge State
    res2 = client.get("/api/adaptive/knowledge-state?student_id=usr_alumno_001")
    assert res2.status_code == 200
    data2 = res2.json()
    assert "knowledge_state" in data2
    assert "topology" in data2
    print("  [PASS] GET /api/adaptive/knowledge-state -> 200 OK (Estado de 7 competencias)")

    # 3. Learning Path
    res3 = client.get("/api/adaptive/learning-path?student_id=usr_alumno_001")
    assert res3.status_code == 200
    print("  [PASS] GET /api/adaptive/learning-path -> 200 OK (Trayectoria longitudinal)")

    # 4. Topology
    res4 = client.get("/api/adaptive/topology")
    assert res4.status_code == 200
    assert len(res4.json()["nodes"]) == 7
    print("  [PASS] GET /api/adaptive/topology -> 200 OK (Topología KST)")

if __name__ == "__main__":
    print("\n" + "#"*70)
    print(" SUITE DE PRUEBAS DEL MOTOR DE CURRÍCULO ADAPTATIVO (KST + BKT)")
    print("#"*70)
    
    test_knowledge_space_topology()
    test_bayesian_knowledge_tracing()
    test_curriculum_engine_recommendation()
    test_adaptive_api_endpoints()
    
    print("\n" + "#"*70)
    print(" TODAS LAS PRUEBAS ADAPTATIVAS PASARON SATISFACTORIAMENTE (PASS)")
    print("#"*70 + "\n")
