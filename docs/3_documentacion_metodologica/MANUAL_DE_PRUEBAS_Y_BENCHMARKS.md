# Manual de Pruebas Automatizadas, Suites de Integración y Benchmarks

Este documento describe la arquitectura de pruebas automatizadas de **Ateneo+**, los comandos para su ejecución bajo demanda (en local y Docker) y la interpretación de los artefactos generados para el artículo científico.

---

## 1. Pirámide de Pruebas Automatizadas

El sistema organiza sus pruebas en 4 niveles complementarios que garantizan la integridad técnica, seguridad, usabilidad y rigor científico:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ NIVEL 4: BENCHMARK CUANTITATIVO EXPERIMENTAL PARA PAPER (IR + LLM)          │
│ • run_metrics.py (25 casos, Hit@1, MRR@5, NDCG@5, latencias P50/P95)        │
│ • run_ablation_study.py (Ablación BM25 vs Dense Base vs RAG Híbrido)        │
│ • run_faithfulness_benchmark.py (Fidelidad normativa y anti-alucinación)    │
│ • run_kst_simulation.py (Simulación longitudinal de trayectorias BKT)       │
│ • run_ibf_figure.py (Generación de curvas de brecha formativa por cohorte)  │
├─────────────────────────────────────────────────────────────────────────────┤
│ NIVEL 3: PRUEBAS DE MODELADO PSICOMÉTRICO Y CURRÍCULO ADAPTATIVO            │
│ • test_adaptive_curriculum.py (Topología KST 7 nodos, BKT, ZDP)            │
│ • test_paper_differentiators.py (Métricas IBF de cohorte y alertas)        │
│ • pilot_study_analyzer.py (Ganancia de aprendizaje de Hake y Wilcoxon)     │
├─────────────────────────────────────────────────────────────────────────────┤
│ NIVEL 2: PRUEBAS DE INTEGRACIÓN HTTP DE API REST (FASTAPI TESTCLIENT)       │
│ • test_auth_security.py (Seguridad criptográfica, JWT y roles RBAC)         │
│ • test_api_endpoints.py (Rutas /auth, /cases, /history, /adaptive, /rooms)  │
├─────────────────────────────────────────────────────────────────────────────┤
│ NIVEL 1: PRUEBAS DE FRONTEND Y GENERADORES DETERMINISTAS                    │
│ • Vitest + React Testing Library (12 suites, 44 tests de interfaz y estado) │
│ • test_multimodal_and_cases.py (12 casos ChromaDB, PDF ReportLab SHA-256)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Catálogo de Pruebas de Frontend (Vitest + React Testing Library)

El frontend dispone de 12 suites de prueba y 44 especificaciones unitarias y de integración que convalidan el árbol de componentes, la accesibilidad, el manejo de estado y el estándar de diseño:

### 2.1 Ejecución en Entorno Local
```bash
cd frontend
npm test
```

### 2.2 Ejecución en Contenedor Docker
```bash
docker compose exec frontend npm test
```

### 2.3 Detalle de Suites Frontend
| Archivo de Prueba | Componente Evaluado | Casos de Prueba Verificados |
|:---|:---|:---|
| `src/__tests__/client.test.js` | Capa de API y red | Contratos HTTP, inyección de tokens JWT, headers y serialización multipart para estudios paraclínicos. |
| `src/__tests__/FeedbackCard.test.jsx` | Dictamen clínico | Renderizado de citas normativas MSP, Faithfulness Score y verificación de regla cero emojis. |
| `src/__tests__/AdaptiveNextCase.test.jsx` | Recomendación KST | Selección de caso en Zona de Desarrollo Próximo (ZDP) y justificación pedagógica en tiempo real. |
| `src/__tests__/PhaseFeedbackCard.test.jsx` | Simulación secuencial | Evaluación progresiva por fases (Anamnesis, Paraclínicos y Terapéutica). |
| `src/__tests__/VoiceInputButton.test.jsx` | Dictado por voz | Integración con Web Speech API y modo de degradación controlada (fallback). |
| `src/__tests__/SkillRadarChart.test.jsx` | Radar de competencias | Renderizado vectorial SVG de 4 ejes clínicos normativos. |
| `src/__tests__/ProtectedRoute.test.jsx` | Seguridad RBAC | Control de acceso por roles (Alumno, Docente y Administrador) y redirección segura. |
| `src/__tests__/ImageUploadZone.test.jsx` | Fusión multimodal | Carga y previsualización de estudios diagnósticos (ECG, Rx de Tórax y Laboratorios). |
| `src/__tests__/Login.test.jsx` | Autenticación | Flujo de autenticación en dos pasos estilo Google Accounts con campos de etiqueta flotante animada. |
| `src/__tests__/AdminDashboard.test.jsx` | Panel administrativo | Gestión de usuarios, sincronización de identidades y privilegios de cohorte. |
| `src/__tests__/CoordinatorAnalytics.test.jsx` | Analítica institucional | Panel B2B de inteligencia formativa, visualización de brechas de cohorte e IBF. |
| `src/__tests__/KnowledgeSpaceGraph.test.jsx` | Topología KST | Grafo interactivo de prerrequisitos, ordenamiento topológico y modales reactivos. |

---

## 3. Catálogo de Pruebas de Backend y Modelado Matemático

### 3.1 Orquestador Maestro Consolidado (`backend/tests/run_all_tests.py`)
Ejecuta de forma estructurada las 6 suites maestras del backend:
```bash
# Entorno local (con venv activo)
backend/.venv/Scripts/python backend/tests/run_all_tests.py

# En entorno Docker
docker compose exec backend python tests/run_all_tests.py
```

### 3.2 Batería Estándar con Pytest
Ejecuta la suite de 21 especificaciones con recolección de aserciones:
```bash
backend/.venv/Scripts/pytest backend/tests/ -v
```

### 3.3 Detalle de Suites Backend
| Archivo de Prueba | Dominio Evaluado | Detalle de Validación |
|:---|:---|:---|
| `test_auth_security.py` | Seguridad y RBAC | Hashing Bcrypt, ciclo de vida de tokens JWT (HMAC-SHA256) y validación de usuarios demo. |
| `test_adaptive_curriculum.py` | Currículo Adaptativo | Grafo KST (7 competencias), actualización bayesiana BKT ($P(L)$), motor de recomendación en ZDP y endpoints `/api/adaptive/*`. |
| `test_paper_differentiators.py` | Métricas Científicas | Algoritmo de cálculo de Faithfulness Score, cálculo de IBF global y por eje, y endpoints de analítica B2B. |
| `pilot_study_analyzer.py` | Análisis Inferencial | Procesamiento de `resultados_pilot.csv`, cálculo de ganancia de Hake ($g=0.74$), $t$-test pareado y exportación de Tabla IV LaTeX. |
| `test_api_endpoints.py` | Integración HTTP | Pruebas de endpoints FastAPI (Auth, Cases, Benchmark, History, Salas Colaborativas, PDF y Fases). |
| `test_multimodal_and_cases.py` | Casos GPC y Multimodal | Recuperación de los 12 casos del MSP, evaluación multi-imagen con Gemini Vision y generación de reportes PDF con sello SHA-256. |

---

## 4. Scripts de Simulación y Generación de Evidencias Científicas

| Script | Descripción | Artefactos Exportados |
|:---|:---|:---|
| `run_kst_simulation.py` | Simulación longitudinal BKT comparativa (Ruta Fija vs KST Adaptativa) | `docs/2_figuras_300dpi/figura_kst_trajectory.png`<br>`docs/1_tablas_latex/tabla_kst_bkt_paper.tex`<br>`backend/tests/resultados_kst_simulation.json` |
| `run_ibf_figure.py` | Generación de visualización de cohorte en 4 ejes clínicos con umbral normativo | `docs/2_figuras_300dpi/figura_ibf_cohorte.png`<br>`backend/tests/resultados_ibf_figure.json` |
| `run_faithfulness_benchmark.py` | Benchmark de anclaje normativo de las 12 GPCs frente a fragmentos normativos | `docs/1_tablas_latex/tabla_faithfulness_paper.tex`<br>`backend/tests/resultados_faithfulness.json` |
| `run_metrics.py` | Evaluación cuantitativa completa del pipeline RAG (Hit@1, MRR@5, NDCG@5, Latencias) | `docs/1_tablas_latex/tabla_resultados_paper.tex`<br>`backend/tests/resultados_metricas.json` |
| `pilot_study_analyzer.py` | Análisis inferencial del estudio piloto con ganancia de aprendizaje | `docs/2_figuras_300dpi/figura_learning_gain.png`<br>`docs/1_tablas_latex/tabla_pilot_study_paper.tex` |

---

## 5. Artefactos LaTeX y Figuras de Publicación

| Artefacto Generado | Ubicación | Elemento en Artículo Científico |
|:---|:---|:---|
| `tabla_resultados_paper.tex` | `docs/1_tablas_latex/` | **Tabla I:** Rendimiento de Recuperación y Generación del Pipeline RAG |
| `tabla_ablacion_paper.tex` | `docs/1_tablas_latex/` | **Tabla II:** Estudio de Ablación Arquitectónica (Sparse vs Dense vs Híbrido) |
| `tabla_faithfulness_paper.tex` | `docs/1_tablas_latex/` | **Tabla III:** Evaluación de Fidelidad Normativa (Anti-Alucinación) |
| `tabla_pilot_study_paper.tex` | `docs/1_tablas_latex/` | **Tabla IV:** Ganancia de Aprendizaje Normalizada de Hake ($g$) |
| `tabla_kst_bkt_paper.tex` | `docs/1_tablas_latex/` | **Tabla V:** Comparativa de Dominio Final BKT por Competencia Clínica |
| `figura_learning_gain.png` | `docs/2_figuras_300dpi/` | **Figura 1:** Distribución Pre-Test vs Post-Test y Ganancia de Hake |
| `figura_ibf_cohorte.png` | `docs/2_figuras_300dpi/` | **Figura 2:** Índice de Brecha Formativa (IBF) por Eje Clínico con Umbral |
| `figura_kst_trajectory.png` | `docs/2_figuras_300dpi/` | **Figura 3:** Trayectoria Longitudinal de Dominio $P(L)$ según KST/BKT |

---

## 6. Verificación de Compilación del Frontend (Producción)

Para validar la ausencia de errores de sintaxis, dependencias o tipos en el cliente React 18:
```bash
cd frontend
npm run build
```
Salida esperada: Módulos transformados sin errores de compilación y empaquetado optimizado con soporte PWA.
