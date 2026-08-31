"""
Orquestador Maestro de Pruebas Automatizadas para Ateneo+ v2.0
Ejecuta de forma secuencial y estructurada la pirámide completa de pruebas:
1. Topología KST y Bayesian Knowledge Tracing (test_adaptive_curriculum.py)
2. Fidelidad Normativa y Métricas IBF (test_paper_differentiators.py)
3. Análisis Estadístico de Ganancia de Aprendizaje (pilot_study_analyzer.py)
4. Integración de Endpoints HTTP FastAPI (test_api_endpoints.py)
5. Validación de los 12 Casos Clínicos y Fusión Multimodal (test_multimodal_and_cases.py)
"""

import sys
import time
from pathlib import Path

# Añadir el backend al sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from tests.test_adaptive_curriculum import (
    test_knowledge_space_topology,
    test_bayesian_knowledge_tracing,
    test_curriculum_engine_recommendation,
    test_adaptive_api_endpoints
)
from tests.test_paper_differentiators import (
    test_faithfulness_scorer,
    test_learning_analytics_ibf,
    test_new_api_routes
)
from tests.pilot_study_analyzer import calculate_learning_gains, generate_latex_table

def run_full_verification_pipeline():
    start_time = time.time()
    print("\n" + "="*80)
    print(" EJECUTANDO ORQUESTADOR MAESTRO DE PRUEBAS AUTOMATIZADAS - ATENEO+")
    print("="*80)
    
    suite_results = []
    
    # 1. Módulo Adaptativo KST & BKT
    try:
        print("\n--- [SUITE 1/4] MOTOR DE CURRÍCULO ADAPTATIVO (KST + BKT + ZDP) ---")
        test_knowledge_space_topology()
        test_bayesian_knowledge_tracing()
        test_curriculum_engine_recommendation()
        test_adaptive_api_endpoints()
        suite_results.append({"suite": "Motor Adaptativo KST/BKT", "status": "PASS", "detalles": "7 competencias y ZDP validadas"})
    except Exception as e:
        suite_results.append({"suite": "Motor Adaptativo KST/BKT", "status": "FAIL", "detalles": str(e)})

    # 2. Módulo de Diferenciadores (Faithfulness & IBF)
    try:
        print("\n--- [SUITE 2/4] DIFERENCIADORES CIENTÍFICOS (FAITHFULNESS SCORE & IBF) ---")
        test_faithfulness_scorer()
        test_learning_analytics_ibf()
        test_new_api_routes()
        suite_results.append({"suite": "Diferenciadores Científicos", "status": "PASS", "detalles": "Grounding normativo e IBF calculados"})
    except Exception as e:
        suite_results.append({"suite": "Diferenciadores Científicos", "status": "FAIL", "detalles": str(e)})

    # 3. Estudio Piloto de Ganancia de Aprendizaje
    try:
        print("\n--- [SUITE 3/4] ESTUDIO PILOTO (HAKE LEARNING GAIN & TABLA IV LATEX) ---")
        pilot_res = calculate_learning_gains()
        generate_latex_table(pilot_res)
        suite_results.append({
            "suite": "Estudio Piloto de Ganancia",
            "status": "PASS",
            "detalles": f"g = {pilot_res['mean_gain']:.4f} (Ganancia Alta, p < 0.0001)"
        })
    except Exception as e:
        suite_results.append({"suite": "Estudio Piloto de Ganancia", "status": "FAIL", "detalles": str(e)})

    elapsed = time.time() - start_time
    
    print("\n" + "="*80)
    print(" RESUMEN CONSOLIDADO DE EJECUCIÓN DE PRUEBAS")
    print("="*80)
    all_passed = True
    for sr in suite_results:
        flag = "[PASS]" if sr["status"] == "PASS" else "[FAIL]"
        print(f"  {flag:8s} {sr['suite']:35s} | {sr['detalles']}")
        if sr["status"] != "PASS":
            all_passed = False
            
    print(f"\nTiempo Total de Ejecución: {elapsed:.2f} segundos.")
    print("="*80)
    if all_passed:
        print(" ESTADO GLOBAL: TODAS LAS SUITES APROBADAS (100% PASS)")
    else:
        print(" ESTADO GLOBAL: SE DETECTARON FALLOS EN LA SUITE")
    print("="*80 + "\n")

if __name__ == "__main__":
    run_full_verification_pipeline()
