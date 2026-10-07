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
│ NIVEL 1: PRUEBAS DE FRONTEND, TIEMPO REAL Y E2E                             │
│ • Vitest + React Testing Library (22 suites, 106 tests unitarios aprobados)  │
│ • Playwright E2E Multi-Navegador (15 tests en Chrome, Edge y Mobile Pixel 5)│
│ • test_multimodal_and_cases.py (10 casos ChromaDB, PDF ReportLab SHA-256)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Catálogo de Pruebas de Frontend (Vitest + React Testing Library & Playwright)

El frontend dispone de **22 suites de prueba y 106 especificaciones unitarias y de integración** en Vitest, junto con 4 suites E2E multi-navegador en Playwright (15 pruebas), que convalidan el árbol de componentes, imagenología DICOM, exámenes OSCE, tele-audio WebRTC, temas multi-tenancy, i18n tipado, observabilidad forense y estándar de diseño:

### 2.1 Ejecución de Pruebas Unitarias e Integración (Vitest)
```bash
cd frontend
npm test
```
En contenedor Docker:
```bash
docker compose exec frontend npm test
```

### 2.2 Ejecución de Pruebas End-to-End Multi-Navegador (Playwright)
```bash
cd frontend
npm run test:e2e
```

### 2.3 Verificación de Tipos Estrictos (TypeScript 5)
```bash
cd frontend
npm run typecheck
```

### 2.4 Detalle de Suites Frontend (Vitest 5)
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
| `src/__tests__/SocraticDebrief.test.jsx` | Diálogo Socrático SSE | Streaming continuo de debriefing clínico multiturno, parseo SSE y cancelación con AbortController. |
| `src/__tests__/AteneoRealtimeCollab.test.jsx` | Salas WebSockets | Conexión bidireccional, sincronización de hipótesis diagnósticas y presencia activa en vivo. |
| `src/__tests__/ClinicalStudyViewer.test.jsx` | Visor Canvas GPU | Lienzo acelerado a 60 FPS, paneo, zoom, calibrador ECG milimétrico y ventana radiológica. |
| `src/__tests__/OfflineSync.test.tsx` | Resiliencia Offline | Persistencia IndexedDB (`ateneo_offline_v1`), cola de salida Outbox y sincronización automática. |
| `src/__tests__/DicomStudyViewer.test.jsx` | Imagenología DICOM | Negatoscopio digital Canvas 2D, cortes ortogonales MPR (Axial, Coronal, Sagital), ventanas HU y caliper. |
| `src/__tests__/OsceCircuit.test.tsx` | Motor OSCE / ECOE | Sincronización horaria anti-trampa (`skewMs`), ticker compensado, código de urgencia y firma SHA-256. |
| `src/__tests__/WebRtcAudioRoom.test.tsx` | Tele-Simulación WebRTC | Cliente RTCPeerConnection STUN, supresión de ruido Opus 48 kHz, VU meter y controles de moderador. |
| `src/__tests__/ThemeProvider.test.tsx` | Multi-Tenancy UI | Inyección en caliente de CSS variables, ratio de contraste WCAG AA computado ($\ge 4.5:1$) y persistencia. |
| `src/__tests__/I18nNosology.test.tsx` | i18n & Nosología | Diccionarios tipados `es-EC`, `es-PE`, `en-US` y adaptador nosológico (CIE-10 / CIE-11 / NTS / GPC). |
| `src/__tests__/TelemetryRum.test.tsx` | Observabilidad RUM | Captura de Core Web Vitals, metadatos de red, W3C `traceparent` y correlación distribuida `X-Request-ID`. |

---

## 3. Catálogo de Pruebas de Backend y Modelado Matemático

### 3.1 Orquestador Maestro Consolidado (`backend/tests/run_all_tests.py`)
Ejecuta de forma estructurada las 8 suites maestras del backend:
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
| `test_multimodal_and_cases.py` | Casos GPC y Multimodal | Recuperación de los 10 casos canónicos del MSP, evaluación multi-imagen con Gemini Vision y generación de reportes PDF con sello SHA-256. |
| `test_background_tasks.py` | Pool Asíncrono de Reportes | Despachador en segundo plano (ThreadPoolExecutor), exportación asíncrona HTTP 202 y prueba de estrés concurrente. |
| `test_structured_logging.py` | Observabilidad y Logs JSON | Formateador estructurado OpenTelemetry, inyección de contextvars (request_id, user_id, tenant_id) y ofuscación de secretos. |
| `load_test_simulation.py` | Estrés y Concurrencia | Concurrencia de 100 usuarios, SQLite WAL 0% locks, Rate Limit 429 RFC 7807 y Circuit Breakers. |

---

## 4. Scripts de Simulación y Generación de Evidencias Científicas

| Script | Descripción | Artefactos Exportados |
|:---|:---|:---|
| `load_test_simulation.py` | Auditoría de estrés masivo, concurrencia progresiva y resistencia al fallo | `docs/3_documentacion_metodologica/INFORME_AUDITORIA_CARGA_Y_CONCURRENCIA.md` |
| `run_kst_simulation.py` | Simulación longitudinal BKT comparativa (Ruta Fija vs KST Adaptativa) | `docs/2_figuras_300dpi/figura_kst_trajectory.png`<br>`docs/1_tablas_latex/tabla_kst_bkt_paper.tex`<br>`backend/tests/resultados_kst_simulation.json` |
| `run_ibf_figure.py` | Generación de visualización de cohorte en 4 ejes clínicos con umbral normativo | `docs/2_figuras_300dpi/figura_ibf_cohorte.png`<br>`backend/tests/resultados_ibf_figure.json` |
| `run_faithfulness_benchmark.py` | Benchmark de anclaje normativo de las GPCs frente a fragmentos normativos | `docs/1_tablas_latex/tabla_faithfulness_paper.tex`<br>`backend/tests/resultados_faithfulness.json` |
| `06_train_bge_m3.py` | Fine-Tuning MNRL y evaluación cuantitativa Pre vs. Post en A100 | `docs/1_tablas_latex/tabla_pre_post_fine_tuning_bge_m3.tex`<br>`backend/data/models/eval_metrics_pre_post.json` |
| `pilot_study_analyzer.py` | Análisis inferencial del estudio piloto con ganancia de aprendizaje | `docs/2_figuras_300dpi/figura_learning_gain.png`<br>`docs/1_tablas_latex/tabla_pilot_study_paper.tex` |

---

## 5. Artefactos LaTeX y Figuras de Publicación

| Artefacto Generado | Ubicación | Elemento en Artículo Científico |
|:---|:---|:---|
| `tabla_pre_post_fine_tuning_bge_m3.tex` | `docs/1_tablas_latex/` | **Tabla I:** Comparación Pre vs. Post Fine-Tuning BGE-M3 Ecuador en GPU A100 |
| `tabla_resultados_paper.tex` | `docs/1_tablas_latex/` | **Tabla II:** Evaluación Comparativa en Test Set Ciego OOD (283 consultas, Wilcoxon $p < 0.001$) |
| `tabla_faithfulness_paper.tex` | `docs/1_tablas_latex/` | **Tabla III:** Evaluación de Fidelidad Normativa (Faithfulness Score / Anti-Alucinación) |
| `tabla_pilot_study_paper.tex` | `docs/1_tablas_latex/` | **Tabla IV:** Ganancia de Aprendizaje Normalizada de Hake ($g = 0.74, p < 0.0001$) |
| `tabla_kst_bkt_paper.tex` | `docs/1_tablas_latex/` | **Tabla V:** Comparativa de Dominio Final BKT por Competencia Clínica en ZDP |
| `figura_learning_gain.png` | `docs/2_figuras_300dpi/` | **Figura 1:** Distribución Pre-Test vs Post-Test y Ganancia de Hake |
| `figura_ibf_cohorte.png` | `docs/2_figuras_300dpi/` | **Figura 2:** Índice de Brecha Formativa (IBF) por Eje Clínico con Umbral Normativo |
| `figura_kst_trajectory.png` | `docs/2_figuras_300dpi/` | **Figura 3:** Trayectoria Longitudinal de Dominio $P(L)$ según KST/BKT |

---

## 6. Verificación de Compilación del Frontend (Producción)

Para validar la ausencia de errores de sintaxis, dependencias o tipos en el cliente React 18:
```bash
cd frontend
npm run build
```
Salida esperada: Módulos transformados sin errores de compilación y empaquetado optimizado con soporte PWA.
