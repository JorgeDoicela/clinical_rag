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

### 3.1 Configuración Previa: Variables de Entorno (Única Fuente de Verdad)

Copia el archivo de plantilla ubicado en la raíz del proyecto y completa tu API Key de Google Gemini:

```bash
cp .env.example .env
```

Edita `.env` para configurar las credenciales y el enrutamiento de modelos:

* `GEMINI_API_KEY`: Clave de acceso a la API de Google Gemini (requerida).
* `GEMINI_MODEL`: Modelo primario de inferencia (por defecto `gemini-3.8-flash`).
* `GEMINI_FALLBACK_MODELS`: Cadena priorizada de modelos de respaldo por degradación gradual clínica (`gemini-3.7-flash,gemini-3.5-flash,gemini-flash-latest,gemini-flash-lite-latest`).
* `GEMINI_CIRCUIT_COOLDOWN_SECONDS`: Tiempo de cuarentena del Circuit Breaker ante fallos 404/429 (por defecto `300` segundos).
* `ALLOWED_ORIGINS`: Control de CORS según el entorno de despliegue:

| Valor de `ALLOWED_ORIGINS` | Comportamiento | Cuándo usarlo |
| :--- | :--- | :--- |
| *(vacío)* | Solo `localhost` y red local `192.168.x.x` | Pruebas seguras en LAN |
| `*` | Acepta cualquier origen | Cloudflare Tunnel, AWS, demos públicas |
| `https://ateneo.tudominio.com` | Solo ese dominio exacto | Producción con dominio propio |

### 3.2 Levantar los Contenedores

```bash
# Primera vez o tras cambios en el código:
docker compose up -d --build

# Siguientes levantamientos (sin reconstruir):
docker compose up -d
```

### 3.3 URLs de Acceso

#### Modo Local (solo tu máquina):
* **Frontend:** [`http://localhost:5173`](http://localhost:5173)
* **Swagger UI:** [`http://localhost:8000/docs`](http://localhost:8000/docs)
* **Healthcheck:** [`http://localhost:8000/health`](http://localhost:8000/health)

#### Modo Red Local (LAN — cualquier PC/celular en la misma red):

Obtén la IP de tu máquina con `ipconfig` (Windows) o `ip a` (Linux). Ejemplo con IP `192.168.7.202`:

* **Frontend:** `http://192.168.7.202:5173`
* **Swagger UI:** `http://192.168.7.202:8000/docs`

> **Nota Windows:** Asegúrate de abrir los puertos en el Firewall:
> ```powershell
> New-NetFirewallRule -DisplayName "Ateneo RAG LAN" -Direction Inbound -LocalPort 5173,8000 -Protocol TCP -Action Allow
> ```

#### Modo Público con SSL/HTTPS (Cloudflare Tunnel — sin configurar router):

Para compartir el sistema en demostraciones públicas con certificado HTTPS válido sin abrir puertos en el router:

1. **Asegúrate de que el proyecto esté corriendo en Docker:**
   ```powershell
   docker compose up -d
   ```

2. **Ejecuta el túnel desde una terminal de PowerShell:**
   ```powershell
   & "$HOME\Downloads\Cloudfare\cloudflared.exe" tunnel --url http://localhost:5173
   ```
   *(En Linux / Mac: `./cloudflared tunnel --url http://localhost:5173`)*

3. **Acceso:**
   Cloudflare generará una URL pública con HTTPS gratuito válido visible directamente en la consola:
   `https://xxxxx.trycloudflare.com`

4. **Para finalizar la sesión pública:**
   Basta con presionar **`Ctrl + C`** en la ventana de PowerShell para cerrar el túnel de inmediato sin afectar los contenedores locales.

> **Nota de Configuración:** Requiere `ALLOWED_ORIGINS=*` en `.env`. El frontend de Vite automáticamente proxifica las peticiones `/api` y `/static` hacia el backend en Docker, garantizando navegación fluida por HTTPS.

---

## 4. Cuentas de Acceso Preconfiguradas

La base de datos SQLite relacional normalizada ([`backend/data/ateneo_clinical.db`](backend/data/ateneo_clinical.db)) incluye usuarios y sesiones de prueba para verificar las vistas del sistema:

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
│   │   ├── ARQUITECTURA_MODULAR_FRONTEND.md # Arquitectura React 18, TypeScript 5, DICOM, OSCE y RUM
│   │   ├── ARQUITECTURA_MODULAR_MONOLITO_BACKEND.md # Monolito modular, persistencia desacoplada y UoW
│   │   ├── ARQUITECTURA_Y_MODELADO_BASE_DE_DATOS.md # Entidades relacionales SQLAlchemy, ERD e índices
│   │   ├── INFORME_AUDITORIA_CARGA_Y_CONCURRENCIA.md # Simulación de estrés con 100 estudiantes concurrentes
│   │   ├── METODOLOGIA_Y_REPRODUCIBILIDAD_EXPERIMENTALES.md # Fórmulas, diseño experimental y métricas IR
│   │   ├── CURRICULO_ADAPTATIVO_KST_Y_LEARNING_ANALYTICS.md # Fundamentación KST/BKT/ZDP/IBF
│   │   ├── PROTOCOLO_PILOTO_LEARNING_GAIN.md # Protocolo de estudio clínico e instrumentos
│   │   ├── ARQUITECTURA_RAG_Y_FINE_TUNING.md # Especificación técnica del recuperador híbrido
│   │   ├── ARQUITECTURA_RESILIENTE_LLM_Y_CONFIGURACION.md # Gateway resiliente, Circuit Breaker y 12-Factor App
│   │   ├── DISCUSION_LIMITACIONES_Y_TRABAJO_FUTURO.md # Análisis crítico y amenazas a la validez
│   │   ├── PUBLICACION_Y_PRESENTACION_CONGRESO.md # Guía editorial y estructura de presentación
│   │   ├── MANUAL_DE_PRUEBAS_Y_BENCHMARKS.md # Guía para réplica experimental y 22 suites
│   │   ├── GUIA_FINE_TUNING_COLAB_Y_METRICAS.md # Protocolo de fine-tuning supervisado
│   │   ├── GUIA_INGESTA_Y_CASOS.md       # Ingesta y calibración de casos clínicos
│   │   ├── GUIA_PASO_A_PASO_ENTRENAMIENTO_Y_PROXIMOS_PASOS.md # Guía de entrenamiento en GPU
│   │   ├── PROTOCOLO_A100_MLOPS_Y_GROUND_TRUTH.md # Pipeline MLOps
│   │   └── CUANTIZACION_Y_DESPLIEGUE_AWS.md # Cuantización y despliegue cloud
│   │
│   ├── 4_pdf_compilado/                  # DOCUMENTO PDF UNIFICADO
│   │   └── COMPENDIO_TABLAS_Y_FIGURAS_PAPER.pdf # Documento consolidado de 3 páginas con tablas y figuras
│   │
│   ├── 5_capturas_sistema/               # EVIDENCIA VISUAL DE LA PLATAFORMA EN EJECUCIÓN
│   │   ├── GUIA_VISUAL_DEL_SISTEMA.md    # Manual visual explicativo de cada módulo y pantalla
│   │   ├── 01_autenticacion_usuario.png  # Pantalla de acceso RBAC
│   │   ├── 02_catalogo_y_recomendacion_zdp.png # Catálogo y recomendador ZDP
│   │   ├── 03_grafo_espacio_conocimiento_kst.png # Modal del grafo de competencias KST
│   │   ├── 04_resolucion_multimodal_rx_dictado.png # Caso de neumonía con Rx y dictado por voz
│   │   ├── 05_simulacion_dinamica_fases_clinicas.png # Stepper de simulación por fases
│   │   ├── 06_panel_docente_analitica_ibf.png # Dashboard B2B con IBF de cohorte y alertas
│   │   ├── 07_panel_docente_deficiencias_institucionales.png # Top deficiencias curriculares
│   │   └── 08_perfil_estudiante_radar_competencias.png # Radar de competencias Recharts
│   │
│   ├── 6_despliegue_y_operaciones/       # INFRAESTRUCTURA Y ACCESO REMOTO
│   │   └── DESPLIEGUE_Y_ACCESO_CLOUDFLARE_TUNNEL.md # Guía de túnel Cloudflare seguro (TLS 1.3)
│   │
│   └── 7_planes_de_escalabilidad_y_hoja_de_ruta/ # PLANES DIRECTORES Y HOJA DE RUTA
│       ├── HOJA_DE_RUTA_EJECUCION_SESIONES.md # Cronograma de 21 sesiones de desarrollo
│       ├── PLAN_ESCALABILIDAD_BASE_DE_DATOS.md # Fases 1 a 5 de persistencia relacional
│       ├── PLAN_ESCALABILIDAD_BACKEND.md # Fases 1 a 10 de ingeniería de servidores
│       └── PLAN_ESCALABILIDAD_FRONTEND.md # Fases 1 a 16 de arquitectura cliente
│
├── backend/                              # SERVICIOS BACKEND FASTAPI (PYTHON 3.11)
│   ├── core/                             # INFRAESTRUCTURA TRANSVERSAL COMPARTIDA
│   │   ├── config.py                     # AppSettings tipado con Pydantic (12-Factor, fail-fast)
│   │   ├── database.py                   # Motor SQLAlchemy, SessionLocal, WAL y PRAGMA foreign_keys
│   │   ├── llm_gateway.py                # ResilientLLMGateway con Circuit Breaker y degradación gradual
│   │   ├── security.py                   # Criptografía JWT, hashing de contraseñas y RBAC
│   │   ├── middleware.py                 # CorrelationIdMiddleware (X-Request-ID y X-Process-Time)
│   │   ├── errors.py                     # Estandarización de errores RFC 7807 (Problem Details)
│   │   ├── unit_of_work.py               # Patrón Unit of Work y transacciones ACID
│   │   ├── rate_limiter.py               # Limitador Token Bucket defensivo y control de cuotas
│   │   ├── background_worker.py          # Pool asíncrono para reportes y tareas pesadas
│   │   └── logger.py                     # Logging estructurado JSON y ofuscación de credenciales
│   ├── modules/                          # DOMINIOS CLÍNICOS DESACOPLADOS (MONOLITO MODULAR)
│   │   ├── analytics_history/            # Historial, métricas de cohorte, IBF (Models + Repo + Service)
│   │   ├── cases/                        # Catálogo de casos clínicos y paraclínicos (Models + Repo + Service)
│   │   ├── adaptive/                     # Currículo adaptativo KST, BKT y selección ZDP (Models + Repo + Service)
│   │   ├── evaluation/                   # Orquestación de evaluación RAG y reportes PDF (Service)
│   │   ├── collaboration/                # Salas sincrónicas de Ateneo en tiempo real (Models + Repo + Service)
│   │   └── auth/                         # Identidad, autenticación, perfiles y siembra demo (Models + Repo + Service)
│   ├── routers/                          # CONTROLADORES REST DE LA API (THIN CONTROLLERS CON DEPENDS)
│   │   ├── auth.py                       # Autenticación JWT y catálogo de usuarios
│   │   ├── adaptive.py                   # Endpoints KST (next-case, knowledge-state, learning-path, topology)
│   │   ├── cases.py                      # Banco de casos clínicos oficiales y dinámicos (POST /api/cases)
│   │   ├── evaluation.py                 # POST /api/evaluate con soporte multi-archivo y simulación por fases
│   │   ├── history.py                    # Historial, IBF de cohorte y exportación PDF
│   │   ├── collaboration.py              # Salas sincrónicas de Ateneo en tiempo real
│   │   └── health.py                     # Sondas de observabilidad (/health/live, /ready, /circuit-breakers)
│   ├── models/                           # Capa de compatibilidad y esquemas DTO
│   │   ├── schemas.py                    # Esquemas tipados Pydantic (EvaluationResult, IBFReport, etc.)
│   │   ├── history_db.py                 # Fachada a modules.analytics_history (SQLAlchemy)
│   │   ├── learning_analytics.py         # Motor de cálculo de IBF y alertas docentes
│   │   └── clinical_case.py              # Fachada a modules.cases
│   ├── rag/                              # Pipeline de Búsqueda y Evaluación RAG
│   │   ├── retriever.py                  # Motor híbrido denso + sparse BM25 (RRF k=60)
│   │   ├── prompt_builder.py             # Constructor de prompts multi-estudio y por fases
│   │   ├── evaluator.py                  # Evaluador multimodal con Gemini Vision API
│   │   ├── security_guard.py             # Blindaje heurístico anti-prompt injection
│   │   ├── cache_manager.py              # Caché semántica y léxica LRU de recuperación
│   │   └── chroma_telemetry.py           # NoOpProductTelemetry desacoplada
│   ├── services/                         # Fachadas de compatibilidad hacia core y generadores
│   │   ├── llm_gateway.py                # Fachada a core.llm_gateway
│   │   └── pdf_report_generator.py       # Generador de dictamen PDF institucional con SHA-256
│   ├── cases_data/                       # 12 casos clínicos normativos y banco de imágenes
│   │   ├── cases.json                    # Casos con competencias activadas y GPC asignada
│   │   └── images/                       # Rx pediátrica, ECG, hemograma y coagulograma
│   ├── data/
│   │   ├── raw_pdfs/                     # 45 PDFs oficiales organizados en 4 ejes canónicos del MSP
│   │   │   ├── 01_urgencias_obstetricas/ # 14 GPCs (Preeclampsia, Código Rojo, Diabetes Gestacional)
│   │   │   ├── 02_respiratorio_pediatrico/ # 11 GPCs (NAC, Tuberculosis, Sepsis Neonatal, SDR)
│   │   │   ├── 03_cardiovascular_metabolico/ # 2 GPCs (Hipertensión Arterial, Enfermedad Renal Crónica)
│   │   │   └── 04_soporte_cronicos_salud_mental/ # 18 GPCs (Depresión, Dolor Oncológico, Cuidados Paliativos, Raras)
│   │   ├── corpus_manifest.json          # Manifiesto criptográfico inmutable (42 hashes SHA-256 y CIE-10/11)
│   │   ├── models/ateneo-bge-m3-ecuador-v2/ # Pesos compilados del modelo fine-tuned en NVIDIA A100 (2.27 GB)
│   │   ├── datasets/                     # Datasets de entrenamiento contrastivo con Hard Negatives y Zero Leakage
│   │   │   ├── retrieval_train.json      # Partición de entrenamiento (70%, 1,178 tripletas)
│   │   │   ├── retrieval_val.json        # Partición de validación (15%, 249 tripletas)
│   │   │   ├── retrieval_test_blind.json # Partición ciega de prueba (15%, 283 tripletas)
│   │   │   └── checksums.sha256          # Hashes criptográficos congelados
│   │   ├── ground_truth/                 # Ground Truth clínico humano con Cohen's Kappa kw = 0.9531
│   │   │   ├── pairs_validated.csv       # 160 pares clínicos anotados por especialistas
│   │   │   └── annotation_protocol.md    # Protocolo formal de consenso en escala Likert
│   │   ├── extracted/                    # Corpus procesado en Markdown y Chunks normativos
│   │   │   ├── chunks_corpus_v2.json     # 7,052 fragmentos normativos indivisibles
│   │   │   └── markdown/                 # 42 GPCs oficiales estructuradas en Markdown nativo
│   │   ├── chroma_db/                    # Base vectorial persistente
│   │   ├── ateneo_clinical.db            # Base relacional SQLite normalizada (Modo WAL)
│   │   └── pilot_study/                  # Instrumentos estandarizados del estudio piloto
│   │       ├── pre_test_casos.json       # 5 casos del pre-test
│   │       ├── post_test_casos.json      # 5 casos equivalentes del post-test
│   │       ├── rubrica_evaluacion.json   # Rúbrica para evaluadores clínicos externos
│   │       └── resultados_pilot.csv      # Matriz de datos anonimizada de la cohorte
│   ├── ingestion_v2/                     # Pipeline científico de ingesta y fine-tuning v2
│   │   ├── 01_classify_and_inventory_corpus.py # Clasificación e inventario con CIE-10/CIE-11
│   │   ├── 02_extract_corpus_native.py   # Extractor nativo con PyMuPDF y tablas Markdown
│   │   ├── 03_token_chunker.py           # Chunking semántico indivisible BGE-M3 (7,052 chunks)
│   │   ├── 04_mine_hard_negatives.py     # Minería de Hard Negatives BM25 + Dense Re-ranking
│   │   ├── 05_build_ground_truth_pool.py # Ensamblado y validación inter-anotador Kappa
│   │   ├── 06_train_bge_m3.py            # Fine-tuning contrastivo MNRL y evaluación PRE vs. POST
│   │   ├── colab_fase2_marker_extraction.ipynb # Extracción en GPU Colab
│   │   └── colab_fase6_train_bge_m3.ipynb      # Re-entrenamiento en NVIDIA A100 (80GB VRAM)
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
├── frontend/                             # APLICACIÓN CLIENTE REACT 18 + VITE 6 + TYPESCRIPT (SPA/PWA)
│   ├── e2e/                              # SUITES E2E MULTI-NAVEGADOR PLAYWRIGHT (15 TESTS APROBADOS)
│   │   ├── auth-and-rbac.spec.ts         # Pruebas de autenticación y control de acceso RBAC
│   │   ├── clinical-catalog.spec.ts      # Búsqueda semántica, filtrado de casos y ZDP
│   │   ├── clinical-study-viewer.spec.ts # Visor diagnóstico en Canvas HTML5, zoom/pan y presets
│   │   └── core-web-vitals.spec.ts       # Rendimiento de carga, FCP, LCP y CLS en cliente
│   └── src/
│       ├── types/                        # Contratos de tipos de dominio TypeScript estrictos (index.ts)
│       ├── core/                         # Capa transversal compartida
│       │   ├── http/                     # httpClient.ts y eventStreamClient.ts (SSE streaming)
│       │   ├── realtime/socketClient.ts  # Cliente WebSocket tipado con reconexión exponencial
│       │   ├── storage/                  # offlineDb.ts (IndexedDB) y useConnectivitySync.ts (Outbox)
│       │   ├── query/queryClient.ts      # Cliente centralizado TanStack Query con políticas de resiliencia
│       │   ├── ui/                       # Design tokens y componentes base (FloatingLabelInput, ClinicalButton, etc.)
│       │   └── layouts/                  # Plantillas estructurales (Navbar, AppLayout)
│       ├── modules/                      # Slices de dominio clínico verticalmente particionados
│       │   ├── auth/                     # Autenticación, Zustand store (useAuthStore), Zod schemas y ProtectedRoute
│       │   ├── cases/                    # Catálogo clínico, filtrado semántico, Zod schemas y useCases hook
│       │   ├── evaluation/               # Simulador split-screen, SocraticDebrief, ClinicalStudyViewer (Canvas 60 FPS)
│       │   ├── collaboration/            # Salas de consenso sincrónico, room store y useAteneoRoom (WebSockets)
│       │   ├── adaptive/                 # Algorítmica adaptativa KST/BKT, grafo SVG y useAdaptiveCurriculum
│       │   └── analytics/                # Paneles docentes, radar clínico e IBF institucional
│       ├── routes/AppRoutes.tsx          # Enrutamiento con code-splitting dinámico (React.lazy + Suspense)
│       └── context/AuthContext.tsx       # Fachada contextual para retrocompatibilidad con tests existentes
│
└── docker-compose.yml                    # Orquestación multicontenedor para producción
```

---

## 6. Comandos de Reproducibilidad Experimental

Los experimentos, tablas LaTeX, figuras y pruebas unitarias/de integración se pueden ejecutar con los siguientes comandos:

```bash
# 1. Ejecutar el orquestador maestro de pruebas de backend (100% PASS):
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

# 8. Ejecutar suite unitaria frontend Vitest (22 suites, 106 tests PASS):
docker compose exec frontend npm test

# 9. Ejecutar pruebas End-to-End con Playwright (15 tests PASS):
docker compose exec frontend npm run test:e2e
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
* **Documentación Metodológica y Arquitectónica:** Los archivos `.md` en [`docs/3_documentacion_metodologica/`](docs/3_documentacion_metodologica/) contienen la formulación matemática, justificación de la pérdida MNRL, análisis de limitaciones y las especificaciones de arquitectura de software:
  * [Arquitectura Modular del Frontend (Feature-Driven Slices & Core Shared)](docs/3_documentacion_metodologica/ARQUITECTURA_MODULAR_FRONTEND.md)
  * [Arquitectura del Backend: Monolito Modular con Persistencia Desacoplada](docs/3_documentacion_metodologica/ARQUITECTURA_MODULAR_MONOLITO_BACKEND.md)
  * [Arquitectura y Modelado de la Base de Datos Relacional](docs/3_documentacion_metodologica/ARQUITECTURA_Y_MODELADO_BASE_DE_DATOS.md)
  * [Informe de Auditoría de Carga, Concurrencia y Resistencia al Fallo](docs/3_documentacion_metodologica/INFORME_AUDITORIA_CARGA_Y_CONCURRENCIA.md)
  * [Arquitectura de Resiliencia de IA y Configuración 12-Factor](docs/3_documentacion_metodologica/ARQUITECTURA_RESILIENTE_LLM_Y_CONFIGURACION.md)
  * [Arquitectura RAG Híbrida y Fine-Tuning](docs/3_documentacion_metodologica/ARQUITECTURA_RAG_Y_FINE_TUNING.md)
* **Planes de Escalabilidad y Hoja de Ruta Operativa:** Consultar [`docs/7_planes_de_escalabilidad_y_hoja_de_ruta/`](docs/7_planes_de_escalabilidad_y_hoja_de_ruta/) para el [Plan Maestro de Reestructuración del Pipeline de IA v2 (100% Corpus Ecuador)](docs/7_planes_de_escalabilidad_y_hoja_de_ruta/PLAN_REESTRUCTURACION_PIPELINE_IA.md), la [Hoja de Ruta de 21 Sesiones](docs/7_planes_de_escalabilidad_y_hoja_de_ruta/HOJA_DE_RUTA_EJECUCION_SESIONES.md) y los planes maestros de [Base de Datos](docs/7_planes_de_escalabilidad_y_hoja_de_ruta/PLAN_ESCALABILIDAD_BASE_DE_DATOS.md), [Backend](docs/7_planes_de_escalabilidad_y_hoja_de_ruta/PLAN_ESCALABILIDAD_BACKEND.md) y [Frontend](docs/7_planes_de_escalabilidad_y_hoja_de_ruta/PLAN_ESCALABILIDAD_FRONTEND.md).

---


---

## 9. Acceso Remoto Seguro (Cloudflare Tunnel)

Para la exposicion segura del sistema en entornos de demostracion y evaluacion remota bajo el dominio oficial https://ateneo.doicela.dev, consultar la guia completa de infraestructura y despliegue en:
* [docs/6_despliegue_y_operaciones/DESPLIEGUE_Y_ACCESO_CLOUDFLARE_TUNNEL.md](docs/6_despliegue_y_operaciones/DESPLIEGUE_Y_ACCESO_CLOUDFLARE_TUNNEL.md)
*Desarrollado para la investigación en educación médica formativa basada en inteligencia artificial en Ecuador.*
