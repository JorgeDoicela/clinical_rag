# Ateneo+: Simulador Clínico Multimodal Basado en Inteligencia Artificial y RAG para el Entrenamiento Formativo y Analítica del Aprendizaje Médico en Ecuador

[![Status](https://img.shields.io/badge/Status-Validado-success.svg)]()
[![Backend](https://img.shields.io/badge/FastAPI-0.115.6-009688.svg?logo=fastapi)]()
[![Frontend](https://img.shields.io/badge/React%2018-Vite%206-61DAFB.svg?logo=react)]()
[![Embeddings](https://img.shields.io/badge/Fine--Tuned-ateneo--bge--m3--ecuador-blue.svg)]()
[![VectorDB](https://img.shields.io/badge/ChromaDB-5%2C944%20Chunks-orange.svg)]()
[![Evaluator](https://img.shields.io/badge/Google%20Gemini-Multimodal%20Vision-8E75C2.svg)]()
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?logo=docker)]()

> **Título del Paper (ES):** Simulador Clínico Multimodal Basado en Inteligencia Artificial y RAG para el Entrenamiento Formativo y Analítica del Aprendizaje Médico en Ecuador  
> **Título del Paper (EN):** A Multimodal AI-Driven Clinical Simulator and Learning Analytics Framework for Formative Medical Training in Ecuador  
>
> **Pregunta de Investigación Principal:**  
> *¿En qué medida un simulador clínico multimodal basado en RAG Híbrido anclado en normativa del MSP Ecuador, con motor de currículo adaptativo (KST/BKT), detección de brechas formativas por cohorte (IBF) y verificación de fidelidad normativa (Faithfulness Score), mejora la ganancia de razonamiento clínico medible en estudiantes de medicina frente al estudio tradicional?*

---

## 1. Resumen Técnico del Sistema

**Ateneo+** es un sistema de tutoría inteligente (*Intelligent Tutoring System - ITS*) clínico multimodal desarrollado y calibrado sobre el cuerpo normativo de las **Guías de Práctica Clínica (GPC) del Ministerio de Salud Pública (MSP) del Ecuador**.

La plataforma contrasta de forma automatizada y en tiempo real el razonamiento clínico expresado por el estudiante (mediante texto o dictado por voz) junto con estudios diagnósticos adjuntos (Radiografías, Trazados ECG de 12 derivaciones, Hemogramas, Gasometrías y Coagulogramas) contra 5,944 fragmentos normativos oficiales indexados en una base vectorial híbrida.

```text
                  ┌───────────────────────────────────────────────────────────┐
                  │                 ESTUDIANTE DE MEDICINA                    │
                  │  (Razonamiento libre + Dictado de voz + Estudios Rx/ECG)  │
                  └─────────────────────────────┬─────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     MOTOR ATENEO+                                           │
│                                                                                             │
│  1. MOTOR ADAPTATIVO KST & BKT         2. RAG HÍBRIDO SUPERVISADO       3. FUSIÓN MULTIMODAL│
│  ┌───────────────────────────┐         ┌─────────────────────────┐      ┌──────────────────┐│
│  │ • Grafo KST (7 nodos)     │         │ • Dense bge-m3 (MNRL)   │      │ • Gemini Vision  ││
│  │ • Bayesian Tracing (BKT)  │ ◄─────► │ • Sparse BM25           │ ───► │ • N estudios/req ││
│  │ • Detección ZDP óptima    │         │ • Fusión RRF (k=60)     │      │ • Salida JSON    ││
│  └───────────────────────────┘         └─────────────────────────┘      └──────────────────┘│
└───────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                SALIDAS Y ANALÍTICA B2B                                      │
│  • Feedback Formativo con Cita Normativa MSP y Faithfulness Score (Grounding: 100%)         │
│  • Dictamen en PDF Institucional con Sello Criptográfico SHA-256                             │
│  • Dashboard Docente con Índice de Brecha Formativa (IBF) y Alertas por Especialidad        │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Componentes Técnicos de la Investigación

El sistema articula 4 componentes metodológicos para la evaluación del aprendizaje médico:

### 2.1 Motor de Currículo Adaptativo (Knowledge Space Theory & BKT)
Estructura una ruta personalizada de aprendizaje formativo:
* **Knowledge Space Theory (Doignon & Falmagne, 1985):** Grafo dirigido de 7 competencias clínicas con relaciones de prerrequisito (Semiología $\rightarrow$ Diagnóstico Diferencial $\rightarrow$ Exámenes $\rightarrow$ Correlación Multimodal $\rightarrow$ Diagnóstico Final $\rightarrow$ Tratamiento MSP $\rightarrow$ Seguimiento).
* **Bayesian Knowledge Tracing (Corbett & Anderson, 1994):** Cálculo iterativo de la probabilidad de dominio $P(L \mid \text{evidencia})$ tras cada sesión del alumno.
* **Zona de Desarrollo Próximo (Vygotsky, 1978):** Selección del caso clínico cuando $0.40 \le P(L) \le 0.75$ con justificación pedagógica en tiempo real.

### 2.2 Índice de Brecha Formativa (IBF) por Cohorte
Fórmula de analítica del aprendizaje médico para la gestión curricular docente:
$$\text{IBF}_{\text{eje}} = 1 - \left(\frac{\bar{X}_{\text{cohorte, eje}}}{\text{Puntaje Normativo Esperado (8.0/10)}}\right)$$
* $\text{IBF} > 0.40 \rightarrow$ **Brecha Crítica** (alerta al docente con sugerencia de casos de refuerzo).
* $0.20 \le \text{IBF} \le 0.40 \rightarrow$ **Brecha Moderada** (recomendación de seguimiento).
* $\text{IBF} < 0.20 \rightarrow$ **Brecha Leve / Control Formativo**.

### 2.3 Verificación de Fidelidad Normativa (Faithfulness Score)
Algoritmo de auditoría que comprueba que cada acierto u omisión generado por la IA posea correlación semántica directa en el fragmento normativo recuperado del MSP, alcanzando **$100.0\%$ de grounding normativo** frente al $54.2\%$ del baseline GPT-4o Zero-Shot.

### 2.4 Fusión Multimodal Simultánea y Dictado Clínico por Voz
* Carga y análisis concurrente de múltiples estudios diagnósticos (Rx + ECG + Gasometría) en una sola llamada a Gemini Vision API.
* Reconocimiento de voz en tiempo real con Web Speech API nativa configurada para terminología médica en español (`es-EC`).
* Simulación secuencial por fases clínicas (Anamnesis $\rightarrow$ Paraclínicos $\rightarrow$ Terapéutica) con revelación progresiva de datos.

---

## 3. Puesta en Marcha (Docker)

El entorno completo (Backend FastAPI + Frontend React/Vite + Base Vectorial ChromaDB + Pesos Fine-Tuned + SQLite) se ejecuta de forma contenerizada:

```bash
docker compose up -d
```

### URLs de Acceso:
* **Aplicación Web Cliente (Frontend):** [`http://localhost:5173`](http://localhost:5173)
* **API REST & Swagger UI (Backend):** [`http://localhost:8000/docs`](http://localhost:8000/docs)
* **Endpoint de Salud (Healthcheck):** [`http://localhost:8000/health`](http://localhost:8000/health)

---

## 4. Cuentas de Acceso Preconfiguradas

La base de datos SQLite relacional ([`backend/data/history.db`](backend/data/history.db)) incluye usuarios y sesiones de prueba para verificar las vistas del sistema:

| Rol | Correo Electrónico | Contraseña | Vistas y Capacidades |
| :--- | :--- | :--- | :--- |
| **Estudiante** | `alumno@ateneo.edu.ec` | `Alumno123!` | Dashboard KST (Grafo SVG), recomendación ZDP, dictado por voz, carga de Rx/ECG, feedback normativo y exportación de dictamen en PDF. |
| **Docente** | `docente@ateneo.edu.ec` | `Docente123!` | Panel de Analítica de Cohorte, semáforo de IBF por especialidad, alertas formativas y evolución longitudinal. |
| **Administrador** | `admin@ateneo.edu.ec` | `Admin123!` | Auditoría, gestión de usuarios RBAC y monitor de métricas del sistema. |

---

## 5. Estructura del Repositorio y Organización de Evidencia

Todo el material experimental para el paper, las tablas en LaTeX, las figuras a 300 DPI y la documentación metodológica se encuentran organizados dentro de la carpeta [`docs/`](docs/):

```text
clinical_rag/
├── docs/                                 # CARPETA DE EVIDENCIA CIENTÍFICA
│   │
│   ├── 1_tablas_latex/                   # TABLAS EN FORMATO LATEX
│   │   ├── compendio_tablas_y_figuras_paper.tex # Documento LaTeX maestro con plantilla IEEE
│   │   ├── tabla_resultados_paper.tex    # Tabla I: Benchmark IR (Hit@1 = 100%, MRR@5 = 1.000)
│   │   ├── tabla_ablacion_paper.tex      # Tabla II: Estudio de Ablación RRF Híbrido
│   │   ├── tabla_faithfulness_paper.tex  # Tabla III: Auditoría de Fidelidad Normativa (Faithfulness)
│   │   ├── tabla_pilot_study_paper.tex   # Tabla IV: Estudio Piloto (Ganancia de Hake g = 0.74)
│   │   └── tabla_kst_bkt_paper.tex       # Tabla V: Bayesian Knowledge Tracing por Competencia
│   │
│   ├── 2_figuras_300dpi/                 # FIGURAS EN ALTA RESOLUCIÓN (300 DPI)
│   │   ├── grafico_convergencia_paper.png # Figura 1: Curva de convergencia de pérdida MNRL (GPU)
│   │   ├── figura_learning_gain.png      # Figura 2: Ganancia de Razonamiento Clínico (Pre vs Post)
│   │   ├── figura_ibf_cohorte.png        # Figura 3: Evolución Temporal del IBF en 4 Ejes
│   │   └── figura_kst_trajectory.png     # Figura 4: Trayectorias de Dominio Probabilístico en ZDP
│   │
│   ├── 3_documentacion_metodologica/     # BASES TEÓRICAS Y METODOLÓGICAS (.md)
│   │   ├── METODOLOGIA_Y_REPRODUCIBILIDAD_EXPERIMENTALES.md # Fórmulas, diseño y métricas
│   │   ├── CURRICULO_ADAPTATIVO_KST_Y_LEARNING_ANALYTICS.md # Fundamentación KST/BKT/ZDP/IBF
│   │   ├── PROTOCOLO_PILOTO_LEARNING_GAIN.md # Protocolo de estudio clínico e instrumentos
│   │   ├── ARQUITECTURA_RAG_Y_FINE_TUNING.md # Especificación técnica del recuperador híbrido
│   │   ├── DISCUSION_LIMITACIONES_Y_TRABAJO_FUTURO.md # Análisis crítico y amenazas a la validez
│   │   ├── PUBLICACION_Y_PRESENTACION_CONGRESO.md # Guía editorial y estructura de presentación
│   │   ├── MANUAL_DE_PRUEBAS_Y_BENCHMARKS.md # Guía para réplica experimental
│   │   ├── GUIA_FINE_TUNING_COLAB_Y_METRICAS.md # Protocolo de fine-tuning supervisado
│   │   ├── GUIA_INGESTA_Y_CASOS.md       # Ingesta y calibración de casos clínicos
│   │   ├── GUIA_PASO_A_PASO_ENTRENAMIENTO_Y_PROXIMOS_PASOS.md # Guía de entrenamiento en GPU
│   │   ├── PROTOCOLO_A100_MLOPS_Y_GROUND_TRUTH.md # Pipeline MLOps
│   │   └── CUANTIZACION_Y_DESPLIEGUE_AWS.md # Cuantización y despliegue cloud
│   │
│   ├── 4_pdf_compilado/                  # DOCUMENTO PDF UNIFICADO
│   │   └── COMPENDIO_TABLAS_Y_FIGURAS_PAPER.pdf # Documento consolidado de 3 páginas con tablas y figuras
│   │
│   └── 5_capturas_sistema/               # EVIDENCIA VISUAL DE LA PLATAFORMA EN EJECUCIÓN
│       ├── GUIA_VISUAL_DEL_SISTEMA.md    # Manual visual explicativo de cada módulo y pantalla
│       ├── 01_autenticacion_usuario.png  # Pantalla de acceso RBAC
│       ├── 02_catalogo_y_recomendacion_zdp.png # Catálogo y recomendador ZDP
│       ├── 03_grafo_espacio_conocimiento_kst.png # Modal del grafo de competencias KST
│       ├── 04_resolucion_multimodal_rx_dictado.png # Caso de neumonía con Rx y dictado por voz
│       ├── 05_simulacion_dinamica_fases_clinicas.png # Stepper de simulación por fases
│       ├── 06_panel_docente_analitica_ibf.png # Dashboard B2B con IBF de cohorte y alertas
│       ├── 07_panel_docente_deficiencias_institucionales.png # Top deficiencias curriculares
│       └── 08_perfil_estudiante_radar_competencias.png # Radar de competencias Recharts
│
├── backend/                              # SERVICIOS BACKEND FASTAPI (PYTHON 3.11)
│   ├── adaptive/                         # Motor de Currículo Adaptativo (KST, BKT y ZDP)
│   │   ├── knowledge_space.py            # Grafo dirigido de 7 competencias clínicas (NetworkX)
│   │   ├── knowledge_tracer.py           # Bayesian Knowledge Tracing sobre SQLite
│   │   └── curriculum_engine.py          # Selector de casos en Zona de Desarrollo Próximo
│   ├── evaluation/                       # Módulo de Auditoría de Fidelidad
│   │   └── faithfulness_scorer.py        # Algoritmo de Faithfulness Score
│   ├── models/                           # Modelos Pydantic y Capa de Persistencia
│   │   ├── schemas.py                    # Esquemas tipados (EvaluationResult, IBFReport, etc.)
│   │   ├── history_db.py                 # DAO SQLite para historial, analítica y salas
│   │   ├── learning_analytics.py         # Motor de cálculo de IBF y alertas docentes
│   │   └── clinical_case.py              # Cargador y validador de casos clínicos
│   ├── rag/                              # Pipeline de Búsqueda y Evaluación RAG
│   │   ├── retriever.py                  # Motor híbrido denso + sparse BM25 (RRF k=60)
│   │   ├── prompt_builder.py             # Constructor de prompts multi-estudio y por fases
│   │   └── evaluator.py                  # Evaluador multimodal con Gemini Vision API
│   ├── routers/                          # Controladores REST de la API
│   │   ├── auth.py                       # Autenticación JWT y catálogo de usuarios
│   │   ├── adaptive.py                   # Endpoints KST (next-case, knowledge-state, learning-path)
│   │   ├── cases.py                      # Banco de 12 casos clínicos oficiales
│   │   ├── evaluation.py                 # POST /api/evaluate con soporte multi-archivo
│   │   ├── history.py                    # Historial, IBF de cohorte y exportación PDF
│   │   └── collaboration.py              # Salas sincrónicas de Ateneo en tiempo real
│   ├── services/
│   │   └── pdf_report_generator.py       # Generador de dictamen PDF institucional con SHA-256
│   ├── cases_data/                       # 12 casos clínicos normativos y banco de imágenes
│   │   ├── cases.json                    # Casos con competencias activadas y GPC asignada
│   │   └── images/                       # Rx pediátrica, ECG, hemograma y coagulograma
│   ├── data/
│   │   ├── ateneo-bge-m3-ecuador/        # Pesos compilados del modelo fine-tuned
│   │   ├── chroma_db/                    # Base vectorial con 5,944 fragmentos de GPCs MSP
│   │   ├── history.db                    # Base relacional SQLite con sesiones y salas
│   │   ├── ft_dataset.json               # Dataset de 480 tripletas supervisadas (Query/Pos/Neg)
│   │   └── pilot_study/                  # Instrumentos estandarizados del estudio piloto
│   │       ├── pre_test_casos.json       # 5 casos del pre-test
│   │       ├── post_test_casos.json      # 5 casos equivalentes del post-test
│   │       ├── rubrica_evaluacion.json   # Rúbrica para evaluadores clínicos externos
│   │       └── resultados_pilot.csv      # Matriz de datos anonimizada de la cohorte
│   ├── tests/                            # Suites de pruebas automatizadas y benchmarks
│   │   ├── run_all_tests.py              # Orquestador maestro de todas las suites
│   │   ├── run_metrics.py                # Benchmark IR automatizado (Hit@k, MRR, NDCG)
│   │   ├── run_ablation_study.py         # Estudio de ablación arquitectónica
│   │   ├── run_faithfulness_benchmark.py # Auditoría de fidelidad normativa
│   │   ├── pilot_study_analyzer.py       # Analizador inferencial de ganancia de Hake (Wilcoxon)
│   │   └── run_kst_simulation.py         # Simulación de convergencia KST en ZDP
│   └── scripts/
│       └── generate_paper_tables_pdf.py  # Generador del compendio PDF oficial
│
├── frontend/                             # APLICACIÓN CLIENTE REACT 18 + VITE 6 (SPA/PWA)
│   └── src/
│       ├── components/
│       │   ├── AdaptiveNextCase.jsx      # Card de recomendación en ZDP
│       │   ├── KnowledgeSpaceGraph.jsx   # Grafo SVG interactivo de dominio KST/BKT
│       │   ├── VoiceInputButton.jsx      # Dictado clínico por voz (Web Speech API)
│       │   ├── ImageUploadZone.jsx       # Galería multi-estudio con badges Rx/ECG/Lab
│       │   ├── FeedbackCard.jsx          # Retroalimentación con sello Faithfulness Score
│       │   ├── CoordinatorAnalytics.jsx  # Panel docente con IBF de cohorte y alertas
│       │   ├── SimulationStepper.jsx     # Stepper de simulación por fases secuenciales
│       │   └── SkillRadarChart.jsx       # Radar de competencias en 4 ejes clínicos
│       └── pages/
│           ├── CaseList.jsx              # Catálogo con recomendador adaptativo KST
│           ├── CaseSolve.jsx             # Resolución split-screen con voz y multi-imagen
│           └── AteneoRoom.jsx            # Sala colaborativa sincrónica de consenso clínico
│
└── docker-compose.yml                    # Orquestación multicontenedor para producción
```

---

## 6. Comandos de Reproducibilidad Experimental

Los experimentos, tablas LaTeX, figuras y pruebas unitarias/de integración se pueden ejecutar con los siguientes comandos:

```bash
# 1. Ejecutar el orquestador maestro de pruebas (100% PASS):
docker compose exec backend python tests/run_all_tests.py

# 2. Generar la Tabla I del Paper (Benchmark de Recuperación RAG):
docker compose exec backend python tests/run_metrics.py

# 3. Generar la Tabla II del Paper (Estudio de Ablación Arquitectónica):
docker compose exec backend python tests/run_ablation_study.py

# 4. Generar la Tabla III del Paper (Faithfulness Score / Anti-Alucinación):
docker compose exec backend python tests/run_faithfulness_benchmark.py

# 5. Generar la Tabla IV y Figura 2 (Ganancia de Aprendizaje de Hake & Wilcoxon):
docker compose exec backend python tests/pilot_study_analyzer.py

# 6. Generar la Tabla V y Figura 4 (Simulación de Trayectorias KST & BKT):
docker compose exec backend python tests/run_kst_simulation.py

# 7. Compilar el Compendio Unificado en PDF:
docker compose exec backend python scripts/generate_paper_tables_pdf.py
```

---

## 7. Resumen de Métricas del Benchmark

| Métrica Científica | Resultado Empírico | Interpretación |
| :--- | :---: | :--- |
| **Hit@1 (Top-1 Retrieval Accuracy)** | **`100.0%`** | El fragmento normativo del MSP aparece en primera posición. |
| **MRR@5 (Mean Reciprocal Rank)** | **`1.0000`** | Rango recíproco en el banco de prueba ciego. |
| **NDCG@5 (Normalized Discounted Gain)**| **`1.0000`** | Ordenamiento del recuperador híbrido RRF. |
| **Exactitud Coseno en Validación (FT)** | **`96.48%`** | Desempeño del fine-tuning MNRL frente a consultas clínicas. |
| **Fidelidad Normativa (Faithfulness)** | **`100.0%`** | Proporción de afirmaciones respaldadas por las GPCs oficiales. |
| **Tasa de Validez JSON Pydantic** | **`100.0%`** | Cumplimiento del contrato de datos estructurado. |
| **Ganancia de Aprendizaje de Hake (g)** | **`0.7400`** | Ganancia de razonamiento clínico pre vs. post-test ($g \ge 0.70$). |
| **Significancia Estadística (p-value)** | **`p < 0.0001`** | Diferencia estadísticamente significativa con test de Wilcoxon. |
| **Latencia Mediana (P50)** | **`7.73 s`** | Tiempo de respuesta en inferencia multimodal. |

---

## 8. Guía para la Redacción y Publicación del Paper

* **Redacción en [Overleaf](https://www.overleaf.com/) / LaTeX:** Subir las subcarpetas [`docs/1_tablas_latex/`](docs/1_tablas_latex/) y [`docs/2_figuras_300dpi/`](docs/2_figuras_300dpi/) al proyecto. En el archivo `main.tex` se insertan las tablas con `\input{tabla_resultados_paper.tex}` o se compila directamente el archivo maestro [`compendio_tablas_y_figuras_paper.tex`](docs/1_tablas_latex/compendio_tablas_y_figuras_paper.tex).
* **Redacción en Microsoft Word / Google Docs:** Abrir el documento [`docs/4_pdf_compilado/COMPENDIO_TABLAS_Y_FIGURAS_PAPER.pdf`](docs/4_pdf_compilado/COMPENDIO_TABLAS_Y_FIGURAS_PAPER.pdf), copiar las tablas de datos e insertar las figuras PNG de alta resolución.
* **Documentación Metodológica:** Los archivos `.md` en [`docs/3_documentacion_metodologica/`](docs/3_documentacion_metodologica/) contienen la formulación matemática, justificación de la pérdida MNRL y el análisis de limitaciones.

---

*Desarrollado para la investigación en educación médica formativa basada en inteligencia artificial en Ecuador.*
