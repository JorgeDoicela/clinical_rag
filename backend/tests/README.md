# Suites de Pruebas Automatizadas y Benchmarks Científicos (Backend)

Este directorio contiene el conjunto integral de pruebas unitarias, de integración, de regresión y los generadores de resultados experimentales para el paper de **Ateneo+**.

---

## 1. Clasificación de Archivos en `tests/`

```text
backend/tests/
├── [Orquestador Maestro]
│   └── run_all_tests.py                 # Ejecuta las 6 suites maestras del backend (100% PASS)
│
├── [Generadores de Benchmarks y Tablas del Paper]
│   ├── run_metrics.py                   # Genera Tabla I (Métricas IR: Hit@k, MRR@5, NDCG@5)
│   ├── run_ablation_study.py            # Genera Tabla II (Estudio de Ablación RAG y Filtros)
│   ├── run_faithfulness_benchmark.py    # Genera Tabla III (Faithfulness Score / Anti-Alucinación)
│   ├── pilot_study_analyzer.py          # Genera Tabla IV y Figura 2 (Ganancia de Hake y Wilcoxon)
│   ├── run_kst_simulation.py            # Genera Tabla V y Figura 4 (Simulación KST/BKT en ZDP)
│   └── run_ibf_figure.py                # Genera Figura 3 (Índice de Brecha Formativa por Cohorte)
│
├── [Simulación de Rendimiento y Concurrencia]
│   └── load_test_simulation.py          # Auditoría de carga concurrente (10 a 50 usuarios simultáneos)
│
├── [Infraestructura y Fixtures de Prueba]
│   ├── client_helper.py                 # Fixture de TestClient con inicialización defensiva de SQLite
│   └── test_cases_fixture.json          # Banco canónico de 15 casos de prueba clínicos estructurados
│
└── [Suites de Pruebas Unitarias y de Integración]
    ├── test_auth_security.py            # Autenticación JWT, hashing bcrypt y roles RBAC
    ├── test_rate_limiter.py             # Rate limiter Token Bucket defensivo y RFC 7807
    ├── test_unit_of_work.py             # Unit of Work y transacciones ACID en SQLAlchemy
    ├── test_prompt_security.py          # Sanitizador anti-prompt injection y barrera heurística
    ├── test_rag_cache.py                # Caché semántica y léxica LRU de recuperación
    ├── test_multi_tenancy.py            # Aislamiento lógico multi-inquilino institucional
    ├── test_health_probes.py            # Sondas liveness y readiness con circuit breaker
    ├── test_background_tasks.py         # Pool de tareas asíncronas para reportes masivos
    ├── test_structured_logging.py       # Logging estructurado JSON con correlación X-Request-ID
    ├── test_api_endpoints.py            # Contratos REST de controladores HTTP
    ├── test_multimodal_and_cases.py     # Evaluación multimodal y fusión de casos clínicos
    ├── test_adaptive_curriculum.py      # Algoritmos puros BKT, grafo KST y ZDP
    └── test_paper_differentiators.py    # Validación de diferenciadores científicos del paper
```

---

## 2. Comandos de Ejecución

```bash
# 1. Ejecutar la suite completa de pruebas unitarias y de integración:
py backend/tests/run_all_tests.py

# 2. Ejecutar benchmarks individuales para regenerar tablas del paper:
py backend/tests/run_metrics.py
py backend/tests/run_ablation_study.py
py backend/tests/run_faithfulness_benchmark.py
py backend/tests/pilot_study_analyzer.py
py backend/tests/run_kst_simulation.py
```
