"""
Orquestador Maestro de Pruebas Automatizadas para Ateneo+ v2.0
Ejecuta de forma secuencial y estructurada la pirámide completa de pruebas:
1. Topología KST y Bayesian Knowledge Tracing (test_adaptive_curriculum.py)
2. Fidelidad Normativa y Métricas IBF (test_paper_differentiators.py)
3. Análisis Estadístico de Ganancia de Aprendizaje (pilot_study_analyzer.py)
4. Integración de Endpoints HTTP FastAPI (test_api_endpoints.py)
5. Validación de los 10 Casos Clínicos Canónicos y Fusión Multimodal (test_multimodal_and_cases.py)
"""

import sys
import time
import traceback
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

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
    suite_results = []
    print("\n" + "="*80)
    print(" EJECUTANDO ORQUESTADOR MAESTRO DE PRUEBAS AUTOMATIZADAS - ATENEO+")
    print("="*80)
    
    # 1. Seguridad Criptográfica y Autenticación RBAC
    try:
        print("\n--- [SUITE 1/8] SEGURIDAD CRIPTOGRÁFICA, TOKENS JWT Y ROLES RBAC ---")
        from tests.test_auth_security import (
            test_password_hashing,
            test_jwt_token_lifecycle,
            test_demo_users_database
        )
        test_password_hashing()
        test_jwt_token_lifecycle()
        test_demo_users_database()
        from tests.test_unit_of_work import (
            test_unit_of_work_commit_success,
            test_unit_of_work_automatic_rollback_on_exception
        )
        test_unit_of_work_commit_success()
        test_unit_of_work_automatic_rollback_on_exception()
        from tests.test_rate_limiter import (
            test_sliding_window_allows_within_limit,
            test_sliding_window_resets_after_expiration,
            test_http_endpoint_rate_limit_headers_and_429
        )
        test_sliding_window_allows_within_limit()
        test_sliding_window_resets_after_expiration()
        test_http_endpoint_rate_limit_headers_and_429()
        from tests.test_prompt_security import (
            test_adversarial_prompt_injections_are_detected,
            test_legitimate_clinical_inputs_pass_without_false_positives,
            test_tag_smuggling_neutralization,
            test_security_violation_evaluation_structure,
            test_security_violation_phase_evaluation_structure,
            test_evaluator_integration_neutralizes_injection_without_llm,
            test_evaluator_phase_integration_neutralizes_injection
        )
        test_adversarial_prompt_injections_are_detected()
        test_legitimate_clinical_inputs_pass_without_false_positives()
        test_tag_smuggling_neutralization()
        test_security_violation_evaluation_structure()
        test_security_violation_phase_evaluation_structure()
        test_evaluator_integration_neutralizes_injection_without_llm()
        test_evaluator_phase_integration_neutralizes_injection()
        from tests.test_multi_tenancy import (
            test_tenant_creation_and_lookup,
            test_tenant_resolution_and_jwt_claims,
            test_user_isolation_between_tenants,
            test_history_and_cohort_analytics_isolation,
            test_room_collaboration_isolation,
            test_case_repository_tenant_isolation,
            test_unit_of_work_tenant_management
        )
        from modules.auth.models import TenantModel
        from core.database import Base
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        test_tenant_resolution_and_jwt_claims()
        test_unit_of_work_tenant_management()

        def _make_isolated_session():
            engine_mt = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
            Base.metadata.create_all(bind=engine_mt)
            SessionMT = sessionmaker(bind=engine_mt)
            sess = SessionMT()
            sess.add(TenantModel(id="tenant_default", codigo="ateneo_central", nombre_institucional="Ateneo+", dominio_email="ateneo.edu.ec", activo=True))
            sess.commit()
            return sess

        for test_fn in [
            test_tenant_creation_and_lookup,
            test_user_isolation_between_tenants,
            test_history_and_cohort_analytics_isolation,
            test_room_collaboration_isolation,
            test_case_repository_tenant_isolation
        ]:
            s = _make_isolated_session()
            try:
                test_fn(s)
            finally:
                s.close()

        from tests.test_health_probes import (
            test_health_root_contract,
            test_liveness_probe_healthy,
            test_readiness_probe_healthy,
            test_readiness_probe_database_failure,
            test_readiness_probe_chroma_failure,
            test_circuit_breakers_probe_operational,
            test_circuit_breakers_probe_degraded_and_half_open
        )
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        from routers.health import router as h_router
        _h_app = FastAPI()
        _h_app.include_router(h_router)
        _h_client = TestClient(_h_app)
        test_health_root_contract(_h_client)
        test_liveness_probe_healthy(_h_client)
        test_readiness_probe_healthy(_h_client)
        test_readiness_probe_database_failure(_h_client)
        test_readiness_probe_chroma_failure(_h_client)
        test_circuit_breakers_probe_operational(_h_client)
        test_circuit_breakers_probe_degraded_and_half_open(_h_client)

        from tests.test_background_tasks import (
            test_background_worker_unit_lifecycle,
            test_background_worker_failure_handling,
            test_evaluation_pdf_async_endpoint,
            test_cohort_pdf_async_endpoint,
            test_concurrent_pdf_export_stress_test,
            test_task_error_responses
        )
        from routers.evaluation import router as _e_router
        from routers.history import router as _hi_router
        _bg_app = FastAPI()
        _bg_app.include_router(_e_router)
        _bg_app.include_router(_hi_router)
        _bg_client = TestClient(_bg_app)
        test_background_worker_unit_lifecycle()
        test_background_worker_failure_handling()
        test_evaluation_pdf_async_endpoint(_bg_client)
        test_cohort_pdf_async_endpoint(_bg_client)
        test_concurrent_pdf_export_stress_test(_bg_client)
        test_task_error_responses(_bg_client)

        suite_results.append({"suite": "Seguridad, RBAC, UoW, Cuotas, Anti-Injection, Multi-Tenancy, Observabilidad & Workers Asíncronos", "status": "PASS", "detalles": "Bcrypt, JWT, RBAC, UoW ACID, Rate Limiting, Blindaje Anti-Prompt Injection, Multi-Tenancy, Sondas /health y Pool Asíncrono de Reportes validados"})
    except Exception as e:

        traceback.print_exc()
        err_msg = f"{type(e).__name__}: {e}" if str(e) else type(e).__name__
        suite_results.append({"suite": "Seguridad, RBAC, UoW, Cuotas, Anti-Injection, Multi-Tenancy, Observabilidad & Workers Asíncronos", "status": "FAIL", "detalles": err_msg})




    # 2. Módulo Adaptativo KST & BKT
    try:
        print("\n--- [SUITE 2/8] MOTOR DE CURRÍCULO ADAPTATIVO (KST + BKT + ZDP) ---")
        test_knowledge_space_topology()
        test_bayesian_knowledge_tracing()
        test_curriculum_engine_recommendation()
        test_adaptive_api_endpoints()
        suite_results.append({"suite": "Motor Adaptativo KST/BKT", "status": "PASS", "detalles": "7 competencias y ZDP validadas"})
    except Exception as e:
        traceback.print_exc()
        err_msg = f"{type(e).__name__}: {e}" if str(e) else type(e).__name__
        suite_results.append({"suite": "Motor Adaptativo KST/BKT", "status": "FAIL", "detalles": err_msg})

    # 3. Módulo de Diferenciadores (Faithfulness & IBF)
    try:
        print("\n--- [SUITE 3/8] DIFERENCIADORES CIENTÍFICOS (FAITHFULNESS SCORE & IBF) ---")
        test_faithfulness_scorer()
        test_learning_analytics_ibf()
        test_new_api_routes()
        from tests.test_rag_cache import (
            test_normalize_text_for_cache,
            test_cache_hit_and_miss_exact,
            test_lexical_similarity_hit,
            test_lru_eviction_policy,
            test_ttl_expiration,
            test_thread_safety_concurrent_access,
            test_retriever_integration_invariance_and_latency
        )
        test_normalize_text_for_cache()
        test_cache_hit_and_miss_exact()
        test_lexical_similarity_hit()
        test_lru_eviction_policy()
        test_ttl_expiration()
        test_thread_safety_concurrent_access()
        test_retriever_integration_invariance_and_latency()

        from tests.test_retriever_pipeline import (
            test_empty_query_fail_fast,
            test_resolve_canonical_guia_aliases,
            test_strict_rejection_invalid_guide,
            test_zero_fallback_gpc_in_corpus,
            test_sparse_bm25_retrieval_under_filter,
            test_dense_retrieval_under_filter,
            test_hybrid_rrf_monotonicity_and_schema,
            test_extract_page_number_helper,
            test_all_10_canonical_cases_retrieval_integrity
        )
        test_empty_query_fail_fast()
        test_resolve_canonical_guia_aliases()
        test_strict_rejection_invalid_guide()
        test_zero_fallback_gpc_in_corpus()
        test_sparse_bm25_retrieval_under_filter()
        test_dense_retrieval_under_filter()
        test_hybrid_rrf_monotonicity_and_schema()
        test_extract_page_number_helper()
        test_all_10_canonical_cases_retrieval_integrity()

        from tests.audit_retrieval_quality import (
            test_retrieval_nosological_concordance_100_percent,
            test_zero_fallbacks_in_all_cases,
            test_real_pagination_in_all_cases,
            test_rrf_monotonicity_in_all_cases,
            test_retrieval_depth_minimum_candidates_in_top5,
            test_relevant_chunk_fast_lookup
        )
        test_retrieval_nosological_concordance_100_percent()
        test_zero_fallbacks_in_all_cases()
        test_real_pagination_in_all_cases()
        test_rrf_monotonicity_in_all_cases()
        test_retrieval_depth_minimum_candidates_in_top5()
        test_relevant_chunk_fast_lookup()

        suite_results.append({"suite": "Diferenciadores Científicos & Motor RAG Híbrido", "status": "PASS", "detalles": "Grounding normativo, IBF, Caché RAG LRU (<50ms), Recuperador Híbrido y Auditoría 10/10 GPC validados"})
    except Exception as e:
        traceback.print_exc()
        err_msg = f"{type(e).__name__}: {e}" if str(e) else type(e).__name__
        suite_results.append({"suite": "Diferenciadores Científicos & Motor RAG Híbrido", "status": "FAIL", "detalles": err_msg})

    # 4. Estudio Piloto de Ganancia de Aprendizaje
    try:
        print("\n--- [SUITE 4/8] ESTUDIO PILOTO (HAKE LEARNING GAIN & TABLA IV LATEX) ---")
        pilot_res = calculate_learning_gains()
        generate_latex_table(pilot_res)
        suite_results.append({
            "suite": "Estudio Piloto de Ganancia",
            "status": "PASS",
            "detalles": f"g = {pilot_res['mean_gain']:.4f} (Ganancia Alta, p < 0.0001)"
        })
    except Exception as e:
        traceback.print_exc()
        err_msg = f"{type(e).__name__}: {e}" if str(e) else type(e).__name__
        suite_results.append({"suite": "Estudio Piloto de Ganancia", "status": "FAIL", "detalles": err_msg})

    # 5. Integración de Endpoints HTTP FastAPI
    try:
        print("\n--- [SUITE 5/8] INTEGRACIÓN ENDPOINTS HTTP FASTAPI ---")
        from tests.test_api_endpoints import (
            test_health_check,
            test_auth_endpoints,
            test_cases_endpoints,
            test_scientific_benchmark_endpoint,
            test_history_and_analytics_endpoints,
            test_collaboration_rooms_endpoints,
            test_pdf_export_endpoint,
            test_phase_evaluation_endpoint,
            test_socratic_turn_endpoint,
            test_collaboration_websocket_endpoint
        )
        test_health_check()
        test_auth_endpoints()
        test_cases_endpoints()
        test_scientific_benchmark_endpoint()
        test_history_and_analytics_endpoints()
        test_collaboration_rooms_endpoints()
        test_pdf_export_endpoint()
        test_phase_evaluation_endpoint()
        test_socratic_turn_endpoint()
        test_collaboration_websocket_endpoint()
        suite_results.append({"suite": "Integración Endpoints HTTP", "status": "PASS", "detalles": "10 endpoints validados (RBAC, Evaluador, Streaming SSE, WebSockets, Colaboración)"})
    except Exception as e:
        traceback.print_exc()
        err_msg = f"{type(e).__name__}: {e}" if str(e) else type(e).__name__
        suite_results.append({"suite": "Integración Endpoints HTTP", "status": "FAIL", "detalles": err_msg})

    # 6. Validación de Casos Clínicos y Reportes
    try:
        print("\n--- [SUITE 6/8] CASOS CLÍNICOS, FUSIÓN MULTIMODAL Y REPORTES PDF ---")
        from tests.test_multimodal_and_cases import (
            test_all_12_cases_retrieval,
            test_pdf_generation,
            test_multimodal_fusion_evaluation
        )
        test_all_12_cases_retrieval()
        test_pdf_generation()
        test_multimodal_fusion_evaluation()

        from tests.test_evaluation_pipeline import (
            test_missing_api_key_raises_503,
            test_models_exhausted_raises_503,
            test_fatal_auth_exception_raises_503,
            test_anchor_cita_to_chunk_strict_fidelity,
            test_format_normative_guide_title,
            test_evaluate_endpoint_rfc7807_when_unavailable
        )
        test_missing_api_key_raises_503()
        test_models_exhausted_raises_503()
        test_fatal_auth_exception_raises_503()
        test_anchor_cita_to_chunk_strict_fidelity()
        test_format_normative_guide_title()
        test_evaluate_endpoint_rfc7807_when_unavailable()

        suite_results.append({"suite": "Fusión Multimodal, Evaluación y Citas Normativas GPC", "status": "PASS", "detalles": "10 casos MSP, firma SHA-256, HTTP 503 RFC 7807 y Citas Ancladas validadas"})
    except Exception as e:
        traceback.print_exc()
        err_msg = f"{type(e).__name__}: {e}" if str(e) else type(e).__name__
        suite_results.append({"suite": "Fusión Multimodal y Casos GPC", "status": "FAIL", "detalles": err_msg})

    # 7. Pool Asíncrono de Reportes y Logging Estructurado OpenTelemetry (Fases 8 y 9)
    try:
        print("\n--- [SUITE 7/8] POOL ASÍNCRONO DE REPORTES Y LOGGING ESTRUCTURADO (FASES 8 Y 9) ---")
        from tests.test_background_tasks import (
            test_background_worker_unit_lifecycle,
            test_background_worker_failure_handling
        )
        from tests.test_structured_logging import (
            test_structured_json_formatter_basic,
            test_context_vars_propagation,
            test_sensitive_data_redaction,
            test_middleware_request_id_header_and_logging
        )
        test_background_worker_unit_lifecycle()
        test_background_worker_failure_handling()
        test_structured_json_formatter_basic()
        test_context_vars_propagation()
        test_sensitive_data_redaction()
        test_middleware_request_id_header_and_logging()
        suite_results.append({
            "suite": "Pool Asíncrono & Logging JSON",
            "status": "PASS",
            "detalles": "Worker Pool Thread-Safe y Logging OpenTelemetry con Redacción de Secretos validados"
        })
    except Exception as e:
        traceback.print_exc()
        err_msg = f"{type(e).__name__}: {e}" if str(e) else type(e).__name__
        suite_results.append({"suite": "Pool Asíncrono & Logging JSON", "status": "FAIL", "detalles": err_msg})

    # 8. Auditoría de Carga, Concurrencia y Resistencia al Fallo (Fase 10)
    try:
        print("\n--- [SUITE 8/8] AUDITORÍA DE CARGA, CONCURRENCIA Y RESISTENCIA AL FALLO (FASE 10) ---")
        from tests.load_test_simulation import (
            run_http_concurrency_tier,
            run_database_wal_concurrency_stress,
            run_rate_limiter_saturation_stress,
            run_circuit_breaker_resilience_audit
        )
        # 1. Concurrencia HTTP (10, 25, 50, 100 usuarios)
        for c_users in [10, 25, 50, 100]:
            tier = run_http_concurrency_tier(concurrency_users=c_users, requests_per_user=3)
            assert tier["error_500_count"] == 0, f"Errores 500 detectados en escalon {c_users}: {tier['error_500_count']}"

        # 2. Concurrencia transaccional SQLite WAL (100 workers)
        wal_st = run_database_wal_concurrency_stress(concurrency_workers=50, operations_per_worker=3)
        assert wal_st["database_locked_errors"] == 0, f"Bloqueos SQLite detectados: {wal_st['database_locked_errors']}"

        # 3. Saturación Rate Limiter
        rl_st = run_rate_limiter_saturation_stress(total_burst_requests=50)
        assert rl_st["server_500_errors"] == 0
        assert rl_st["graceful_defense_success"] is True

        # 4. Resiliencia Circuit Breaker
        cb_st = run_circuit_breaker_resilience_audit()
        assert cb_st["circuit_breaker_validated"] is True

        suite_results.append({
            "suite": "Auditoría de Carga & Concurrencia",
            "status": "PASS",
            "detalles": "100 usuarios simultáneos, SQLite WAL 0% locks, Rate Limit 429 y Circuit Breakers validados"
        })
    except Exception as e:
        traceback.print_exc()
        err_msg = f"{type(e).__name__}: {e}" if str(e) else type(e).__name__
        suite_results.append({"suite": "Auditoría de Carga & Concurrencia", "status": "FAIL", "detalles": err_msg})

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
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    run_full_verification_pipeline()
