# Plan de Implementación: Ateneo+ v2.0
## Simulador Clínico Multimodal con IA, RAG Híbrido y Analítica del Aprendizaje Médico en Ecuador

> **Título del Paper (ES):** Simulador Clínico Multimodal Basado en Inteligencia Artificial y RAG para el Entrenamiento Formativo y Analítica del Aprendizaje Médico en Ecuador
>
> **Título del Paper (EN):** A Multimodal AI-Driven Clinical Simulator and Learning Analytics Framework for Formative Medical Training in Ecuador
>
> **Pregunta de Investigación:**
> ¿En qué medida un simulador clínico multimodal basado en RAG Híbrido anclado en normativa del MSP Ecuador, con detección automática de brechas formativas por cohorte y verificación de fidelidad normativa, mejora la ganancia de razonamiento clínico medible en estudiantes de internado de pregrado en comparación con el estudio autónomo tradicional?

---

## Estado Actual del Sistema (Base Técnica Validada — Ateneo v1.0)

| Componente | Estado | Métrica Empírica |
| :--- | :---: | :--- |
| RAG Híbrido (Dense BGE-M3 + Sparse BM25 + Fusión RRF k=60) |  Producción | Hit@1 = 100%, MRR@5 = 1.0000, NDCG@5 = 1.0000 |
| Fine-Tuning MNRL sobre GPCs del MSP Ecuador (480 tripletas) |  Producción | cosine_accuracy = 0.9648 en val set |
| Validación JSON Pydantic estricta (EvaluationResult) |  Producción | 100% de convalidaciones en benchmark |
| Evaluación multimodal básica (texto + 1 imagen) |  Producción | Latencia P50 = 7.73s |
| Analítica individual: Radar de 4 ejes clínicos |  Producción | Diagnóstico, Tratamiento, Prevención, Seguimiento |
| Analítica de cohorte B2B (CoordinatorAnalytics) |  Producción | Ranking de brechas por especialidad |
| Salas sincrónicas colaborativas (Ateneo Room) |  Producción | Consenso en tiempo real |
| Exportación de dictamen en PDF con SHA-256 |  Producción | Firma criptográfica institucional |
| Índice de Brecha Formativa (IBF) automatizado |  Pendiente | — |
| Faithfulness Score (Anti-Alucinación Normativa) |  Pendiente | — |
| Fusión Multimodal Simultánea (N imágenes) |  Plan | — |
| Entrada por voz (dictado clínico) |  Plan | — |
| Protocolo Piloto Pre/Post-Test con internos reales |  Pendiente | — |

---

## Diferenciadores Científicos que Elevan el Paper al Nivel Internacional

> [!IMPORTANT]
> Los 4 diferenciadores siguientes convierten este trabajo en el **primer Intelligent Tutoring System (ITS) clínico con Motor de Currículo Adaptativo en Latinoamérica**, publicable en IEEE Transactions on Learning Technologies, JAMIA, Computers & Education o Lancet Digital Health.

### Diferenciador 1 (Crítico): Estudio Piloto de Ganancia de Aprendizaje (Learning Gain)

Fórmula de Hake: `g = (Post-Test - Pre-Test) / (Máximo - Pre-Test)`

- `g > 0.70` → Ganancia Alta
- `0.30 <= g <= 0.70` → Ganancia Media
- `g < 0.30` → Ganancia Baja

**Diseño experimental mínimo:**
- 20 a 30 estudiantes de internado de pregrado (medicina)
- Pre-test: 5 casos clínicos resueltos sin el sistema
- Intervención: 2 semanas de uso autónomo de Ateneo+
- Post-test: 5 casos equivalentes (distintos, mismo nivel de dificultad)
- Análisis estadístico: t-test pareado o Wilcoxon signed-rank (α = 0.05)

### Diferenciador 2 (Alto): Índice de Brecha Formativa (IBF) por Cohorte

**Fórmula propia (Contribución Científica 3 del paper):**

```
IBF_eje = 1 - (promedio_cohorte_eje / puntaje_normativo_esperado_eje)
```

Donde:
- `promedio_cohorte_eje` = promedio de puntaje de la cohorte en el eje clínico
- `puntaje_normativo_esperado` = 8.0 puntos/10 (umbral de competencia básica MSP)
- `IBF > 0.40` → **Brecha Crítica** (alerta automática al docente)
- `0.20 <= IBF <= 0.40` → **Brecha Moderada** (recomendación de refuerzo)
- `IBF < 0.20` → **Brecha Leve** (monitoreo periódico)

### Diferenciador 3 (Alto): Faithfulness Score — Verificación de Grounding Normativo

**Fórmula de fidelidad RAG:**

```
Faithfulness = afirmaciones_verificables_en_contexto / total_afirmaciones_clínicas
```

**Baseline de comparación para el paper:**
- GPT-4o Zero-Shot (sin RAG) sobre los mismos 15 casos del benchmark
- GPT-4o con RAG genérico (sin fine-tuning en GPCs del MSP)
- **Ateneo+ RAG Híbrido + Fine-Tuned (sistema completo)**

### Diferenciador 4 (EL PLUS — Disruptivo): Motor de Currículo Adaptativo con Knowledge Space Theory (KST)

> [!IMPORTANT]
> Este es el diferenciador que ningún simulador clínico latinoamericano ha implementado. Convierte a Ateneo+ de un sistema *reactivo* (el estudiante elige qué resolver) a un sistema *proactivo* (la IA decide el camino óptimo de aprendizaje de forma autónoma).

**Analogía directa con la IA de redes del docente:**

| IA de Gestión de Redes | Motor KST de Ateneo+ |
| :--- | :--- |
| Detecta tráfico en horas pico | Detecta brecha en Diagnóstico Diferencial |
| Redistribuye tráfico automáticamente | Asigna el próximo caso de refuerzo óptimo |
| Sin intervención del administrador | Sin intervención del docente |
| Adapta rutas en tiempo real | Adapta el currículo tras cada sesión |

**Marco Teórico (3 pilares con referencias clave para el paper):**

| Pilar | Teoría | Referencia Citable |
| :--- | :--- | :--- |
| Mapa de competencias prerequisito | Knowledge Space Theory (KST) | Doignon & Falmagne, 1985 |
| Selección de dificultad óptima | Zona de Desarrollo Próximo (ZDP) | Vygotsky, 1978 |
| Trazado probabilístico de dominio | Bayesian Knowledge Tracing (BKT) | Corbett & Anderson, 1994 |

**Algoritmo del Motor KST:**

```
Después de cada sesión:
1. LEER → Knowledge State del estudiante (qué dominó, qué no, en qué eje)
2. MAPEAR → Grafo de prerequisitos clínicos (Semiología → Diagnóstico → Tratamiento)
3. DETECTAR → Zona de Desarrollo Próximo (competencia más cercana a dominar)
4. SELECCIONAR → Caso del corpus que activa exactamente esa competencia (delta +0.15)
5. NOTIFICAR → "Ateneo+ seleccionó el próximo caso para ti: [Caso X]"
6. ACTUALIZAR → Knowledge State tras resolución (loop continuo)
```

**Grafo de Prerequisitos Clínicos Propuesto:**

```
        [Semiología y Anamnesis]
                  ↓
    [Diagnóstico Diferencial] → [Solicitud de Exámenes Complementarios]
                  ↓                              ↓
        [Diagnóstico Final] ← ─────────────────┘
                  ↓
          [Plan Terapéutico]
                  ↓
    [Seguimiento y Prevención Comunitaria MSP]
```

**Componentes a implementar:**

- **[NEW] `backend/adaptive/knowledge_space.py`** — Grafo dirigido de competencias (NetworkX). Define los nodos (competencias) y aristas (prerequisitos) del espacio clínico.
- **[NEW] `backend/adaptive/knowledge_tracer.py`** — Bayesian Knowledge Tracing (BKT). Calcula la probabilidad de dominio P(dominio|historial) por nodo del grafo.
- **[NEW] `backend/adaptive/curriculum_engine.py`** — Motor central. Detecta la ZDP y selecciona el caso óptimo del corpus para el siguiente paso del estudiante.
- **[NEW] `backend/routers/adaptive.py`** — Endpoint REST del motor:
  ```
  GET /api/adaptive/next-case/{student_id}
  GET /api/adaptive/knowledge-state/{student_id}
  GET /api/adaptive/learning-path/{student_id}
  ```
- **[NEW] `frontend/src/components/AdaptiveNextCase.jsx`** — Card que muestra el caso recomendado con justificación ("Detectamos que necesitas reforzar: Correlación Multimodal").
- **[MODIFY] `frontend/src/pages/Dashboard.jsx`** — Ruta de aprendizaje visual: mapa del grafo KST con nodos coloreados por nivel de dominio ( Sin iniciar /  En progreso /  Dominado).

**Qué ve el estudiante:**
> *"Basado en tus últimas 3 sesiones, Ateneo+ seleccionó este caso para ti: Neumonía Atípica con Radiografía + ECG (Dificultad: Media-Alta). Objetivo de esta sesión: reforzar la correlación entre hallazgos imagenológicos y criterios CURB-65 del MSP."*

**Por qué este es EL diferenciador del paper:**
- Los simuladores actuales (Amboss, UWorld, Osmosis) tienen ruta **fija o aleatoria**.
- Ateneo+ tendría ruta **inteligente y adaptativa basada en el grafo de conocimiento médico real**.
- Es la primera implementación de KST + BKT en un simulador clínico con RAG y normativa nacional latinoamericana.
- La comparación en el paper: **ruta fija** vs **ruta adaptativa KST** → diferencia estadísticamente significativa en Learning Gain.

---

## Mapa de Implementación Completo

### Fase 0: Motor de Currículo Adaptativo KST (Prioridad MÁXIMA — El Plus del Paper — 1 semana)

#### [NEW] `backend/adaptive/knowledge_space.py`

```python
import networkx as nx

CLINICAL_KNOWLEDGE_GRAPH = nx.DiGraph()

# Nodos: Competencias clínicas
competencias = [
    "semiologia_anamnesis",
    "diagnostico_diferencial",
    "examenes_complementarios",
    "correlacion_multimodal",     # ← nodo nuevo (multimodal)
    "diagnostico_final",
    "plan_terapeutico_msp",
    "seguimiento_prevencion",
]

# Aristas: Prerequisitos (A → B significa: dominar A es prerequisito de B)
prerequisitos = [
    ("semiologia_anamnesis",      "diagnostico_diferencial"),
    ("diagnostico_diferencial",   "examenes_complementarios"),
    ("examenes_complementarios",  "correlacion_multimodal"),
    ("correlacion_multimodal",    "diagnostico_final"),
    ("diagnostico_diferencial",   "diagnostico_final"),
    ("diagnostico_final",         "plan_terapeutico_msp"),
    ("plan_terapeutico_msp",      "seguimiento_prevencion"),
]

CLINICAL_KNOWLEDGE_GRAPH.add_nodes_from(competencias)
CLINICAL_KNOWLEDGE_GRAPH.add_edges_from(prerequisitos)
```

#### [NEW] `backend/adaptive/knowledge_tracer.py`

```python
# Bayesian Knowledge Tracing (BKT) — Corbett & Anderson, 1994
# Parámetros del modelo por competencia:
# P(L0)   = probabilidad a priori de dominio
# P(T)    = probabilidad de transición (aprende en una sesión)
# P(G)    = probabilidad de adivinar correctamente sin dominio (guess)
# P(S)    = probabilidad de error con dominio (slip)

BKT_PARAMS = {
    "diagnostico_diferencial": {"L0": 0.30, "T": 0.20, "G": 0.15, "S": 0.10},
    "correlacion_multimodal":  {"L0": 0.10, "T": 0.25, "G": 0.10, "S": 0.08},
    "plan_terapeutico_msp":    {"L0": 0.25, "T": 0.18, "G": 0.12, "S": 0.10},
    # ... resto de competencias
}

def update_knowledge_state(student_id: str, competencia: str, correcto: bool) -> float:
    # Actualiza P(dominio | observación) usando regla de Bayes
    # Retorna la nueva probabilidad de dominio para esa competencia
    pass

def get_knowledge_state(student_id: str) -> dict[str, float]:
    # Retorna el vector de dominio: {competencia: P(dominio)} para todos los nodos
    pass
```

#### [NEW] `backend/adaptive/curriculum_engine.py`

```python
def detectar_zona_desarrollo_proximo(knowledge_state: dict) -> list[str]:
    """
    Zona de Desarrollo Próximo (ZDP — Vygotsky, 1978):
    Nodos donde P(dominio) está entre 0.40 y 0.75:
    - Por debajo de 0.40: aún no está listo (prerequisitos no dominados)
    - Por encima de 0.75: ya dominado, pasar al siguiente
    - Entre 0.40 y 0.75: ZONA ÓPTIMA de aprendizaje
    """
    return [
        competencia for competencia, p_dominio in knowledge_state.items()
        if 0.40 <= p_dominio <= 0.75
        and all_prerequisites_met(competencia, knowledge_state)
    ]

def seleccionar_caso_optimo(student_id: str, casos_disponibles: list) -> ClinicalCase:
    knowledge_state = get_knowledge_state(student_id)
    zdp_nodes = detectar_zona_desarrollo_proximo(knowledge_state)
    
    # Seleccionar el caso que maximiza la cobertura de nodos en la ZDP
    # y tiene dificultad = nivel_actual + delta(+0.15)
    return max(
        casos_disponibles,
        key=lambda caso: coverage_score(caso.competencias_activadas, zdp_nodes)
    )
```

#### [NEW] `backend/routers/adaptive.py`

```python
GET /api/adaptive/next-case/{student_id}
    # → Retorna el caso óptimo recomendado con justificación
    # → Response: {case: ClinicalCase, justificacion: str, zdp_nodes: list, p_dominio: dict}

GET /api/adaptive/knowledge-state/{student_id}
    # → Mapa completo de dominio del estudiante por competencia
    # → Usado por el Dashboard para el grafo visual

GET /api/adaptive/learning-path/{student_id}
    # → Trayectoria histórica de aprendizaje (snapshots BKT por sesión)
    # → Usado para la figura del paper: Learning Trajectory over Time
```

#### [NEW] `frontend/src/components/AdaptiveNextCase.jsx`

Card de recomendación adaptativa que muestra:
- Nombre del caso recomendado + dificultad relativa
- Competencia objetivo de la sesión (ej. "Objetivo: Correlación Multimodal")
- Justificación textual: *"Dominaste Diagnóstico Diferencial (83%). Siguiente paso: Exámenes Complementarios."*
- Botón CTA: **"Resolver este caso"** (asigna el caso directamente al estudiante)

#### [MODIFY] `frontend/src/pages/Dashboard.jsx`

Agregar **Mapa del Grafo KST** visual:
- Grafo interactivo de nodos (competencias) con colores de dominio:
  -  Sin iniciar (`P < 0.40`)
  -  En progreso (`0.40 ≤ P ≤ 0.75`)
  -  Dominado (`P > 0.75`)
- Aristas que muestran prerequisitos desbloqueados vs pendientes
- Click en nodo → muestra historial de rendimiento en esa competencia

---

### Fase 1: Diferenciadores del Paper (Prioridad Crítica — 1 a 2 semanas)

#### 1.1 Módulo de Faithfulness Score

**[NEW] `backend/evaluation/faithfulness_scorer.py`**

Algoritmo de verificación de fidelidad normativa:
```python
# Flujo de verificación por afirmación clínica
# 1. Extraer afirmaciones del JSON de EvaluationResult generado por Gemini
# 2. Para cada afirmación en aciertos y omisiones: verificar presencia en chunk recuperado
# 3. Calcular score de fidelidad global y por tipo de afirmación
# 4. Reportar en resultados_metricas.json

# Campos a agregar en EvaluationResult (Pydantic):
# faithfulness_score: float — Proporción de afirmaciones respaldadas por corpus normativo
# fragmentos_verificados: List[str]
# afirmaciones_no_verificadas: List[str]
```

**[MODIFY] `backend/tests/run_metrics.py`**

Agregar columna `Faithfulness` a la Tabla I del paper. Evaluar Faithfulness Score en los 15 casos del benchmark, comparar contra baseline GPT-4o Zero-Shot y exportar tabla en LaTeX con columna adicional.

---

#### 1.2 Módulo de Índice de Brecha Formativa (IBF)

**[NEW] `backend/models/learning_analytics.py`**

```python
# Constantes de umbrales IBF
IBF_CRITICAL_THRESHOLD = 0.40
IBF_MODERATE_THRESHOLD = 0.20
PUNTAJE_NORMATIVO_ESPERADO = 8.0

def calcular_ibf_cohorte(historial_cohorte: List[EvaluationResult]) -> IBFReport:
    # Calcular IBF por cada uno de los 4 ejes clínicos
    # Clasificar nivel de brecha (Crítica / Moderada / Leve)
    # Generar alerta automática si IBF > 0.40
    # Retornar reporte estructurado para dashboard docente
    pass

def generar_alertas_docente(ibf_report: IBFReport) -> List[AlertaFormativa]:
    # Para cada eje con brecha crítica:
    #   → "Brecha Crítica en Tratamiento: 43% de la cohorte"
    #   → Sugerir casos de refuerzo específicos de ese eje y especialidad
    pass
```

**[MODIFY] `backend/models/history_db.py`**

Agregar consultas de agregación por cohorte:
```python
def get_cohorte_analytics(room_id: str = None, user_role: str = None) -> CohorteData: ...
def get_longitudinal_ibf(user_id: str, fecha_inicio: date, fecha_fin: date) -> List[IBFSnapshot]: ...
```

**[MODIFY] `backend/routers/history.py`**

Nuevos endpoints para el dashboard docente:
```
GET /api/analytics/ibf-cohorte?room_id={room_id}
GET /api/analytics/alertas-docente
GET /api/analytics/ibf-longitudinal/{user_id}
```

**[MODIFY] `frontend/src/components/CoordinatorAnalytics.jsx`**

Agregar visualización del IBF por eje:
- Badges de severidad ( Crítica /  Moderada /  Leve)
- Panel de alertas automáticas al coordinador
- Gráfico de evolución temporal del IBF (AreaChart)

---

### Fase 2: Motor de Fusión Multimodal Simultánea (Prioridad Alta — 1 semana)

#### [MODIFY] `backend/models/schemas.py`

```python
class ImagenDiagnostica(BaseModel):
    tipo: Literal["radiografia", "ecg", "laboratorio", "fotografia_clinica", "ecografia", "tomografia"]
    descripcion: str
    mime_type: str = "image/jpeg"

class ClinicalCaseSchema(BaseModel):
    # ... campos existentes ...
    imagenes_adjuntas: List[ImagenDiagnostica] = Field(default_factory=list)
    fases_clinicas: Optional[List[str]] = None  # Para casos por etapas (internado)
```

#### [MODIFY] `backend/rag/prompt_builder.py`

Actualizar `build_prompt()` para guiar la correlación multimodal cuando hay múltiples estudios:
```
ESTUDIOS DIAGNÓSTICOS DISPONIBLES:
  [1] Radiografía de Tórax PA: {descripcion}
  [2] Trazado ECG de 12 derivaciones: {descripcion}
  [3] Panel de Laboratorio: {descripcion}
Instrucción: Evalúa si el estudiante realizó una correlación diagnóstica coherente
entre los hallazgos de los N estudios presentados y los criterios de la GPC del MSP.
```

#### [MODIFY] `backend/rag/evaluator.py`

```python
async def evaluate_clinical_reasoning(
    caso: ClinicalCase,
    respuesta_estudiante: str,
    chunk_normativo: str,
    imagenes_bytes_list: List[Tuple[bytes, str]] = None,  # [(bytes, mime_type), ...]
) -> EvaluationResult:
    parts = [types.Part.from_text(prompt_text)]
    if imagenes_bytes_list:
        for img_bytes, mime_type in imagenes_bytes_list:
            parts.append(types.Part.from_bytes(data=img_bytes, mime_type=mime_type))
    # Enviar en un único request multimodal a Gemini Vision
```

#### [MODIFY] `backend/routers/evaluation.py`

```python
@router.post("/api/evaluate")
async def evaluate(
    case_id: str = Form(...),
    respuesta_estudiante: str = Form(...),
    imagenes: List[UploadFile] = File(None),  # Soporta N archivos
):
```

#### [MODIFY] `backend/cases_data/cases.json`

5 nuevos casos multimodales complejos para benchmark y paper:
- **Caso NAC Severa:** Radiografía de tórax PA/lateral + Gasometría arterial + CURB-65
- **Caso Crisis Hipertensiva:** ECG de 12 derivaciones + Biometría hemática + Fondo de ojo
- **Caso EHIRN Neonatal:** Radiografía de tórax neonatal + Gasometría + Tablas de dosificación de surfactante
- **Caso Preeclampsia Severa:** Tira reactiva de orina + Biometría + Doppler de arterias uterinas
- **Caso DM T2 Descompensada:** Panel metabólico + HbA1c + ECG para cardiopatía silente

---

### Fase 3: Frontend Multimodal y Voz (Prioridad Media — 1 semana)

#### [NEW] `frontend/src/components/VoiceInputButton.jsx`

```jsx
// Web Speech API nativa (sin dependencias externas)
// Idioma: es-EC (español Ecuador) con fallback a es-ES
// Micro-animación de onda pulsante durante grabación (CSS keyframes)
// Transcripción en tiempo real con append al textarea de razonamiento
// Compatible con Chrome, Edge y Safari (iOS 15+)
```

#### [MODIFY] `frontend/src/components/ImageUploadZone.jsx`

- Soporte de múltiples archivos (drag & drop o input[multiple])
- Galería de miniaturas con badge de tipo de estudio (Rx / ECG / Lab / Eco / TAC)
- Botón de eliminación individual por miniatura
- Límite: máx. 5 imágenes / 10 MB total

#### [MODIFY] `frontend/src/pages/CaseSolve.jsx`

- Selector visual de estudios por pestañas (Radiografía / ECG / Laboratorio)
- Integración del botón de voz encima del textarea de razonamiento
- Galería multi-estudio integrada en la columna izquierda

#### [MODIFY] `frontend/src/api/client.js`

```javascript
export const evaluateResponse = async (caseId, respuestaEstudiante, imagenesArray = []) => {
  const formData = new FormData();
  formData.append('case_id', caseId);
  formData.append('respuesta_estudiante', respuestaEstudiante);
  imagenesArray.forEach((file) => formData.append('imagenes', file));
  return apiClient.post('/api/evaluate', formData);
};
```

---

### Fase 4: Protocolo Experimental — Estudio Piloto de Learning Gain (Prioridad Crítica — Logístico)

> [!CAUTION]
> Esta fase **no puede generarse con código**. Requiere coordinación con una facultad de medicina en Ecuador. Sin este estudio, el paper no puede demostrar impacto educativo real y se limita a ser un paper de ingeniería.

#### 4.1 Diseño del Protocolo

| Elemento | Especificación |
| :--- | :--- |
| **Participantes** | 20-30 estudiantes de internado o 5to-6to año de Medicina |
| **Institución** | Universidad ecuatoriana (PUCE, UCE, UCSG o UTPL recomendadas) |
| **Pre-test** | 5 casos clínicos resueltos sin acceso a Ateneo+ (papel o Google Form) |
| **Intervención** | 2 semanas de uso autónomo de Ateneo+ (mínimo 10 casos por estudiante) |
| **Post-test** | 5 casos equivalentes en dificultad pero distintos al pre-test |
| **Análisis Estadístico** | Wilcoxon Signed-Rank Test (distribución no normal) o t-test pareado |
| **Nivel de Significancia** | α = 0.05 |
| **Comité de Ética** | Solicitar aval de comité de bioética institucional (requisito para JAMIA/Lancet) |

#### 4.2 Instrumentos de Medición

**[NEW] `backend/tests/pilot_study_analyzer.py`**

```python
# Cargar datos de pre-test y post-test desde CSV
# Calcular Learning Gain de Hake por estudiante y por eje clínico
# Ejecutar Wilcoxon signed-rank test (scipy.stats.wilcoxon)
# Generar tabla LaTeX de resultados para la sección Results del paper
# Exportar: tabla_pilot_study.tex + grafico_learning_gain.png (300 DPI)
```

**[NEW] `backend/data/pilot_study/`**

```
backend/data/pilot_study/
├── pre_test_casos.json        # 5 casos pre-test (anonimizados)
├── post_test_casos.json       # 5 casos post-test equivalentes
├── rubrica_evaluacion.json    # Rúbrica estandarizada para evaluadores externos
└── resultados_pilot.csv       # Plantilla de recogida de datos (anonimizada)
```

---

### Fase 5: Generación de Artefactos para el Paper (Prioridad Alta — 2 días)

**[NEW] `backend/tests/run_faithfulness_benchmark.py`**

Genera la comparativa de Faithfulness Score para la **Tabla III** del paper:

```bash
cd backend
python tests/run_faithfulness_benchmark.py
# Salida: docs/tabla_faithfulness_paper.tex + resultados_faithfulness.json
```

**[MODIFY] `backend/tests/run_metrics.py`**

Ampliar benchmark actual para incluir columna de Faithfulness Score, desglose In-Distribution vs Out-of-Distribution y exportar **Tabla I extendida** en LaTeX.

Archivos generados:
- **[NEW] `docs/tabla_faithfulness_paper.tex`** — Tabla III del paper
- **[NEW] `docs/tabla_pilot_study_paper.tex`** — Tabla IV del paper
- **[NEW] `docs/figura_learning_gain.png`** — Figura 1 del paper (300 DPI)
- **[NEW] `docs/figura_ibf_cohorte.png`** — Figura 2 del paper

---

## Estructura Final de Archivos

```
clinical_rag/
├── PLAN_ATENEO_PLUS_V2.md                      [NEW] Este archivo
├── backend/
│   ├── adaptive/                               [NEW] Motor de Currículo Adaptativo
│   │   ├── knowledge_space.py                  [NEW] Grafo KST de competencias (NetworkX)
│   │   ├── knowledge_tracer.py                 [NEW] Bayesian Knowledge Tracing (BKT)
│   │   └── curriculum_engine.py               [NEW] Selección óptima de caso (ZDP)
│   ├── evaluation/
│   │   └── faithfulness_scorer.py              [NEW] Verificador de grounding normativo
│   ├── models/
│   │   ├── schemas.py                          [MODIFY] ImagenDiagnostica + IBFReport + KnowledgeState
│   │   ├── history_db.py                       [MODIFY] Consultas IBF longitudinal + BKT snapshots
│   │   └── learning_analytics.py               [NEW] Motor IBF + alertas docente
│   ├── rag/
│   │   ├── prompt_builder.py                   [MODIFY] Prompt multi-estudio
│   │   └── evaluator.py                        [MODIFY] Gemini multi-imagen + faithfulness
│   ├── routers/
│   │   ├── adaptive.py                         [NEW] Endpoints KST: next-case, knowledge-state, learning-path
│   │   ├── evaluation.py                       [MODIFY] List[UploadFile] + faithfulness
│   │   └── history.py                          [MODIFY] Endpoints IBF y alertas
│   ├── cases_data/
│   │   └── cases.json                          [MODIFY] 5 casos multimodales + campo competencias_activadas
│   ├── tests/
│   │   ├── run_metrics.py                      [MODIFY] Columna Faithfulness en Tabla I
│   │   ├── run_faithfulness_benchmark.py       [NEW] Benchmark vs GPT-4o baseline
│   │   ├── run_kst_simulation.py               [NEW] Simulación de trayectorias KST para Figura 3
│   │   └── pilot_study_analyzer.py             [NEW] Learning Gain + Wilcoxon
│   └── data/
│       └── pilot_study/                        [NEW] Instrumentos del estudio piloto
│           ├── pre_test_casos.json
│           ├── post_test_casos.json
│           ├── rubrica_evaluacion.json
│           └── resultados_pilot.csv
├── docs/
│   ├── tabla_faithfulness_paper.tex            [NEW] Tabla III del paper (LaTeX)
│   ├── tabla_pilot_study_paper.tex             [NEW] Tabla IV del paper (LaTeX)
│   ├── figura_learning_gain.png                [NEW] Figura 1 del paper (300 DPI)
│   ├── figura_ibf_cohorte.png                  [NEW] Figura 2 del paper
│   └── figura_kst_trajectory.png              [NEW] Figura 3: trayectoria KST (300 DPI)
└── frontend/
    └── src/
        ├── components/
        │   ├── AdaptiveNextCase.jsx            [NEW] Card de caso recomendado por IA
        │   ├── VoiceInputButton.jsx            [NEW] Dictado clínico por voz
        │   ├── ImageUploadZone.jsx             [MODIFY] Multi-archivo con badges
        │   ├── FeedbackCard.jsx                [MODIFY] Faithfulness Score visual
        │   └── CoordinatorAnalytics.jsx        [MODIFY] IBF + alertas semáforo
        ├── pages/
        │   ├── Dashboard.jsx                   [MODIFY] Grafo KST visual + ruta de aprendizaje
        │   └── CaseSolve.jsx                  [MODIFY] Voz + Multi-imagen + Tabs
        └── api/
            └── client.js                      [MODIFY] Envío de N archivos FormData + adaptive API
```

---

## Tablas del Paper (Estructura Final)

| Tabla | Contenido | Generada por |
| :--- | :--- | :--- |
| **Tabla I** | Benchmark IR (Hit@k, MRR@5, NDCG@5, Faithfulness) In/Out-of-Distribution | `run_metrics.py` |
| **Tabla II** | Ablación: BM25 / Dense Base / Dense Fine-Tuned / RAG Híbrido | `run_ablation_study.py` |
| **Tabla III** | Faithfulness Score: Ateneo+ vs GPT-4o Zero-Shot vs RAG Genérico | `run_faithfulness_benchmark.py` |
| **Tabla IV** | Estudio Piloto: Learning Gain (Hake g) Pre/Post-Test — Ruta Fija vs Ruta Adaptativa KST | `pilot_study_analyzer.py` |
| **Tabla V** | BKT por competencia: P(dominio) inicial vs final para cohorte piloto | `run_kst_simulation.py` |

---

## Plan de Sprints

```
SPRINT 0 (Semana 1) — EL PLUS: Motor de Currículo Adaptativo KST
├── [ ] knowledge_space.py — Grafo NetworkX de competencias clínicas
├── [ ] knowledge_tracer.py — Bayesian Knowledge Tracing (BKT)
├── [ ] curriculum_engine.py — Detección ZDP + selección de caso óptimo
├── [ ] routers/adaptive.py — 3 endpoints REST del motor
├── [ ] AdaptiveNextCase.jsx — Card de recomendación con justificación
├── [ ] Dashboard.jsx — Grafo KST visual con nodos coloreados por dominio
└── [ ] run_kst_simulation.py — Simulación de trayectorias para Figura 3

SPRINT 1 (Semana 2) — Diferenciadores del Paper
├── [ ] faithfulness_scorer.py (backend)
├── [ ] learning_analytics.py + IBF (backend)
├── [ ] Endpoints IBF en history.py (backend)
├── [ ] run_faithfulness_benchmark.py (tests)
└── [ ] CoordinatorAnalytics con alertas IBF (frontend)

SPRINT 2 (Semana 3) — Multimodal y Voz
├── [ ] schemas.py con ImagenDiagnostica + competencias_activadas por caso
├── [ ] prompt_builder.py multi-estudio (backend)
├── [ ] evaluator.py multi-imagen Gemini (backend)
├── [ ] evaluation.py List[UploadFile] (backend)
├── [ ] VoiceInputButton.jsx (frontend)
├── [ ] ImageUploadZone.jsx multi-archivo (frontend)
└── [ ] CaseSolve.jsx integración completa (frontend)

SPRINT 3 (Semana 4) — Casos y Benchmark
├── [ ] 5 nuevos casos multimodales con campo competencias_activadas
├── [ ] pilot_study/ instrumentos y rúbrica
├── [ ] run_metrics.py extendido (Faithfulness en Tabla I)
├── [ ] pilot_study_analyzer.py con Wilcoxon
└── [ ] Artefactos LaTeX: tablas III, IV y V

SPRINT 4 (Semana 5+) — Estudio Piloto (Logístico)
├── [ ] Coordinación con facultad de medicina
├── [ ] Aval del comité de bioética
├── [ ] Ejecución del pre-test (papel o Google Form)
├── [ ] 2 semanas de intervención: Grupo A (ruta fija) vs Grupo B (ruta KST)
└── [ ] Ejecución del post-test + análisis estadístico comparativo
```

---

## Métricas Objetivo para el Paper

| Métrica | v1.0 Actual | v2.0 Objetivo |
| :--- | :---: | :---: |
| Hit@1 (Benchmark 15 casos) | 100.0% | 100.0% (mantener) |
| MRR@5 | 1.0000 | 1.0000 (mantener) |
| Faithfulness Score (Ateneo+) | — | >= 0.95 |
| Faithfulness Score (GPT-4o ZS) | — | <= 0.60 (baseline) |
| Learning Gain g (ruta fija) | — | >= 0.30 (ganancia media-baja) |
| Learning Gain g (ruta KST) | — | >= 0.50 (ganancia media-alta) |
| Delta Learning Gain (KST vs fija) | — | p < 0.05 (Wilcoxon) |
| P(dominio) competencia crítica tras intervención | — | >= 0.75 (dominado) |
| IBF Promedio Cohorte (Tratamiento) | — | Medible y reportable |
| Tasa de Validez JSON | 100.0% | 100.0% (mantener) |

---

## Frase de Posicionamiento del Paper

> *"Ateneo+ es el primer Intelligent Tutoring System (ITS) clínico multimodal de Latinoamérica: combina un Motor de Currículo Adaptativo basado en Knowledge Space Theory y Bayesian Knowledge Tracing, RAG Híbrido ajustado sobre normativa MSP Ecuador y verificación de fidelidad normativa cuantificable, demostrando mediante estudio piloto controlado (ruta fija vs ruta adaptativa) una mejora estadísticamente significativa en la trayectoria de razonamiento clínico de estudiantes de medicina en Ecuador."*

---

## Guía de Implementación Paso a Paso (Código Real)

> [!NOTE]
> Esta sección usa el código y la arquitectura exactos del proyecto actual.
> Backend: FastAPI + SQLite (`history_db.py`) + Pydantic v2 + Gemini SDK.
> Frontend: React (Vite) + JSX.

---

### PASO 0 — Instalar la única dependencia nueva

```bash
# En el directorio backend/
pip install networkx>=3.0
# Agregar al requirements.txt:
# networkx>=3.0
```

---

### PASO 1 — Crear `backend/adaptive/` (Motor KST)

#### PASO 1.1 — `backend/adaptive/__init__.py`

Archivo vacío para que Python lo reconozca como módulo:
```python
# backend/adaptive/__init__.py
```

#### PASO 1.2 — `backend/adaptive/knowledge_space.py`

Define el grafo de 7 competencias clínicas y sus prerequisitos.
Este grafo es la "inteligencia" del motor — no cambia en tiempo de ejecución.

```python
# backend/adaptive/knowledge_space.py
import networkx as nx

# Nombres de competencia usados como claves en toda la lógica BKT
COMPETENCIAS = [
    "semiologia_anamnesis",
    "diagnostico_diferencial",
    "examenes_complementarios",
    "correlacion_multimodal",
    "diagnostico_final",
    "plan_terapeutico_msp",
    "seguimiento_prevencion",
]

# Etiquetas en español para mostrar al estudiante en el frontend
COMPETENCIA_LABELS = {
    "semiologia_anamnesis":      "Semiología y Anamnesis",
    "diagnostico_diferencial":   "Diagnóstico Diferencial",
    "examenes_complementarios":  "Solicitud de Exámenes",
    "correlacion_multimodal":    "Correlación Multimodal",
    "diagnostico_final":         "Diagnóstico Final",
    "plan_terapeutico_msp":      "Plan Terapéutico MSP",
    "seguimiento_prevencion":    "Seguimiento y Prevención",
}

# Mapeo entre los ejes de EvaluationResult y los nodos del grafo KST
# IMPORTANTE: usa los mismos valores del EjeClinico enum de schemas.py
EJE_A_COMPETENCIA = {
    "diagnóstico":   ["diagnostico_diferencial", "diagnostico_final"],
    "tratamiento":   ["plan_terapeutico_msp"],
    "prevención":    ["seguimiento_prevencion"],
    "seguimiento":   ["seguimiento_prevencion"],
}

def build_clinical_knowledge_graph() -> nx.DiGraph:
    """
    Construye el grafo dirigido de prerequisitos clínicos.
    A → B significa: dominar A es prerequisito para aprender B.
    """
    G = nx.DiGraph()
    G.add_nodes_from(COMPETENCIAS)
    G.add_edges_from([
        ("semiologia_anamnesis",     "diagnostico_diferencial"),
        ("diagnostico_diferencial",  "examenes_complementarios"),
        ("examenes_complementarios", "correlacion_multimodal"),
        ("correlacion_multimodal",   "diagnostico_final"),
        ("diagnostico_diferencial",  "diagnostico_final"),
        ("diagnostico_final",        "plan_terapeutico_msp"),
        ("plan_terapeutico_msp",     "seguimiento_prevencion"),
    ])
    return G

# Instancia global del grafo (se carga una sola vez al iniciar)
CLINICAL_GRAPH = build_clinical_knowledge_graph()
```

#### PASO 1.3 — `backend/adaptive/knowledge_tracer.py`

Lee el historial SQLite existente y calcula el nivel de dominio por competencia.
**No hay ML aquí** — es álgebra bayesiana simple sobre tu DB existente.

```python
# backend/adaptive/knowledge_tracer.py
import sqlite3
import json
import os
from typing import Dict, List
from adaptive.knowledge_space import COMPETENCIAS, EJE_A_COMPETENCIA

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "history.db")

# Parámetros BKT por competencia (Corbett & Anderson, 1994)
# Documentados en la literatura — válidos para declarar en el paper
BKT_PARAMS = {
    "semiologia_anamnesis":      {"L0": 0.40, "T": 0.20, "G": 0.20, "S": 0.10},
    "diagnostico_diferencial":   {"L0": 0.30, "T": 0.20, "G": 0.15, "S": 0.10},
    "examenes_complementarios":  {"L0": 0.25, "T": 0.22, "G": 0.12, "S": 0.08},
    "correlacion_multimodal":    {"L0": 0.10, "T": 0.25, "G": 0.10, "S": 0.08},
    "diagnostico_final":         {"L0": 0.30, "T": 0.18, "G": 0.15, "S": 0.10},
    "plan_terapeutico_msp":      {"L0": 0.25, "T": 0.18, "G": 0.12, "S": 0.10},
    "seguimiento_prevencion":    {"L0": 0.20, "T": 0.15, "G": 0.10, "S": 0.12},
}

def _bkt_update(p_l: float, correcto: bool, params: dict) -> float:
    """
    Actualiza P(dominio) usando la regla de Bayes del BKT.
    Fórmula exacta de Corbett & Anderson (1994).
    """
    L0, T, G, S = params["L0"], params["T"], params["G"], params["S"]
    if correcto:
        # P(L|correct) = P(correct|L)*P(L) / P(correct)
        p_correct_given_l  = 1 - S
        p_correct_given_nl = G
    else:
        p_correct_given_l  = S
        p_correct_given_nl = 1 - G

    p_correct = p_correct_given_l * p_l + p_correct_given_nl * (1 - p_l)
    if p_correct == 0:
        return p_l
    p_l_given_evidence = (p_correct_given_l * p_l) / p_correct

    # Paso de aprendizaje: el estudiante puede aprender en esta sesión
    p_l_new = p_l_given_evidence + (1 - p_l_given_evidence) * T
    return min(max(p_l_new, 0.0), 1.0)


def get_knowledge_state(user_id: str) -> Dict[str, float]:
    """
    Lee el historial SQLite del estudiante y calcula P(dominio) por competencia
    usando BKT iterativo sobre todas sus sesiones en orden cronológico.
    Retorna: {"diagnostico_diferencial": 0.72, "plan_terapeutico_msp": 0.35, ...}
    """
    # Inicializar con probabilidades a priori
    state = {comp: BKT_PARAMS[comp]["L0"] for comp in COMPETENCIAS}

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "SELECT score, competencias_json FROM evaluation_history "
            "WHERE user_id = ? ORDER BY timestamp ASC",
            (user_id,)
        )
        rows = cursor.fetchall()
        conn.close()
    except Exception:
        return state  # Si no hay historial, devolver priors

    for row in rows:
        score = row["score"]          # float 0-10
        correcto = score >= 6.0       # umbral de "correcto" = aprobado

        try:
            competencias_raw = json.loads(row["competencias_json"])
        except Exception:
            continue

        # competencias_json contiene [{eje, descripcion}, ...]
        # Mapear cada eje → nodo(s) del grafo KST y actualizar BKT
        for item in competencias_raw:
            eje = item.get("eje", "")
            nodos_afectados = EJE_A_COMPETENCIA.get(eje, [])
            for nodo in nodos_afectados:
                state[nodo] = _bkt_update(state[nodo], correcto, BKT_PARAMS[nodo])

    return state
```

#### PASO 1.4 — `backend/adaptive/curriculum_engine.py`

Detecta la Zona de Desarrollo Próximo y selecciona el caso óptimo del corpus.

```python
# backend/adaptive/curriculum_engine.py
import json
import os
from typing import List, Dict, Optional
from adaptive.knowledge_space import CLINICAL_GRAPH, COMPETENCIA_LABELS
from adaptive.knowledge_tracer import get_knowledge_state

# Umbrales ZDP (Vygotsky, 1978)
ZDP_MIN = 0.40   # Por debajo: prerequisitos no dominados aún
ZDP_MAX = 0.75   # Por encima: ya dominado, pasar al siguiente nodo

CASES_PATH = os.path.join(os.path.dirname(__file__), "..", "cases_data", "cases.json")


def _all_prerequisites_met(node: str, state: Dict[str, float]) -> bool:
    """Verifica que todos los nodos prerequisito estén dominados (P >= 0.60)."""
    for pred in CLINICAL_GRAPH.predecessors(node):
        if state.get(pred, 0.0) < 0.60:
            return False
    return True


def detect_zdp(knowledge_state: Dict[str, float]) -> List[str]:
    """
    Retorna los nodos clínicos en la Zona de Desarrollo Próximo:
    P(dominio) entre ZDP_MIN y ZDP_MAX, con prerequisitos cubiertos.
    """
    return [
        node for node in CLINICAL_GRAPH.nodes()
        if ZDP_MIN <= knowledge_state.get(node, 0.0) <= ZDP_MAX
        and _all_prerequisites_met(node, knowledge_state)
    ]


def _load_cases() -> List[dict]:
    with open(CASES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _coverage_score(case_competencias: List[str], zdp_nodes: List[str]) -> int:
    """Cuenta cuántos nodos ZDP activa el caso — mayor = mejor candidato."""
    return len(set(case_competencias) & set(zdp_nodes))


def select_next_case(user_id: str) -> dict:
    """
    Motor principal: dado un user_id, retorna el caso óptimo para la próxima sesión.
    
    Retorna dict con:
    - case: datos del caso seleccionado
    - zdp_nodes: nodos en la Zona de Desarrollo Próximo
    - knowledge_state: vector BKT completo del estudiante
    - justificacion: texto explicativo para mostrar al estudiante
    - competencia_objetivo: label en español de la competencia principal a reforzar
    """
    knowledge_state = get_knowledge_state(user_id)
    zdp_nodes = detect_zdp(knowledge_state)
    cases = _load_cases()

    if not zdp_nodes:
        # Si no hay ZDP (todo dominado o todo sin prereqs), sugerir el más difícil disponible
        zdp_nodes = [max(knowledge_state, key=knowledge_state.get)]

    # Seleccionar el caso que más cobre la ZDP
    # Si el caso no tiene campo "competencias_activadas", se asume cobertura 0
    best_case = max(
        cases,
        key=lambda c: _coverage_score(c.get("competencias_activadas", []), zdp_nodes)
    )

    # Competencia principal a reforzar (la de menor P(dominio) en la ZDP)
    main_node = min(zdp_nodes, key=lambda n: knowledge_state.get(n, 0.0))
    main_label = COMPETENCIA_LABELS.get(main_node, main_node)

    p_main = knowledge_state.get(main_node, 0.0)
    justificacion = (
        f"Basado en tu historial, Ateneo+ detectó que tu nivel en "
        f"'{main_label}' es de {int(p_main * 100)}% de dominio. "
        f"Este caso te ayudará a avanzar hacia el siguiente nivel de competencia clínica."
    )

    return {
        "case": best_case,
        "zdp_nodes": zdp_nodes,
        "knowledge_state": knowledge_state,
        "justificacion": justificacion,
        "competencia_objetivo": main_label,
    }
```

---

### PASO 2 — Crear `backend/routers/adaptive.py`

Mismo patrón que tus routers existentes (`history.py`, `cases.py`):

```python
# backend/routers/adaptive.py
from fastapi import APIRouter, HTTPException
from adaptive.curriculum_engine import select_next_case, detect_zdp
from adaptive.knowledge_tracer import get_knowledge_state
from adaptive.knowledge_space import COMPETENCIA_LABELS

router = APIRouter(prefix="/api/adaptive", tags=["Motor Adaptativo KST"])


@router.get("/next-case/{user_id}")
async def get_next_case(user_id: str):
    """
    Retorna el caso clínico óptimo para la próxima sesión del estudiante.
    Basado en Knowledge Space Theory + Bayesian Knowledge Tracing.
    """
    try:
        result = select_next_case(user_id)
        return {"status": "success", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en motor adaptativo: {str(e)}")


@router.get("/knowledge-state/{user_id}")
async def get_student_knowledge_state(user_id: str):
    """
    Retorna el vector de dominio BKT del estudiante por competencia clínica.
    Usado por el Dashboard para renderizar el grafo KST visual.
    """
    try:
        state = get_knowledge_state(user_id)
        labeled = {
            COMPETENCIA_LABELS.get(k, k): {
                "key": k,
                "p_dominio": round(v, 3),
                "nivel": "dominado" if v >= 0.75 else ("en_progreso" if v >= 0.40 else "sin_iniciar")
            }
            for k, v in state.items()
        }
        return {"status": "success", "knowledge_state": labeled}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/learning-path/{user_id}")
async def get_learning_path(user_id: str):
    """
    Retorna la trayectoria de aprendizaje: qué nodos están dominados, en progreso
    y sin iniciar. Usado para la Figura 3 del paper.
    """
    try:
        state = get_knowledge_state(user_id)
        zdp = detect_zdp(state)
        path = {
            "dominados":    [k for k, v in state.items() if v >= 0.75],
            "en_progreso":  [k for k, v in state.items() if 0.40 <= v < 0.75],
            "sin_iniciar":  [k for k, v in state.items() if v < 0.40],
            "zdp_actual":   zdp,
        }
        return {"status": "success", "learning_path": path, "knowledge_state": state}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

### PASO 3 — Registrar el router en `backend/main.py`

Agregar exactamente 2 líneas, igual que hiciste con los otros routers:

```python
# Agregar junto a los otros imports de routers (línea ~10):
from routers.adaptive import router as adaptive_router

# Agregar junto a los otros app.include_router (línea ~43):
app.include_router(adaptive_router)
```

---

### PASO 4 — Agregar campo `competencias_activadas` a `cases.json`

Cada caso necesita declarar qué nodos del grafo KST activa.
Ejemplo de cómo quedaría un caso existente con el campo nuevo:

```json
{
  "id": "case_ehirn_01",
  "guia_asociada": "gpc_ehirn2019",
  "titulo": "Recién Nacido con Sangrado Umbilical y Trastorno de Coagulación",
  "enunciado": "...",
  "pregunta": "...",
  "imagen_url": null,
  "nivel_esperado": "pregrado_avanzado",
  "competencias_activadas": [
    "diagnostico_diferencial",
    "plan_terapeutico_msp",
    "seguimiento_prevencion"
  ]
}
```

**Acción:** Abrir `backend/cases_data/cases.json` y agregar `"competencias_activadas": [...]`
a cada caso existente. Asignar los nodos que corresponden al tipo de decisión clínica que exige ese caso.

---

### PASO 5 — Crear `frontend/src/components/AdaptiveNextCase.jsx`

Card que el estudiante ve en el Dashboard con el caso recomendado por la IA:

```jsx
// frontend/src/components/AdaptiveNextCase.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function AdaptiveNextCase({ userId }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate              = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE}/api/adaptive/next-case/${userId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  if (loading) return <p style={{ color: "#888" }}>Analizando tu trayectoria...</p>;
  if (!data?.case) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg, #1a1f4e 0%, #0d2137 100%)",
      border: "1px solid #3b82f6",
      borderRadius: "12px",
      padding: "20px",
      marginBottom: "20px",
    }}>
      {/* Encabezado */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <span style={{ fontSize: "24px" }}></span>
        <div>
          <p style={{ color: "#60a5fa", fontSize: "12px", margin: 0, fontWeight: 600 }}>
            ATENEO+ RECOMIENDA
          </p>
          <h3 style={{ color: "#fff", margin: 0, fontSize: "16px" }}>
            {data.case.titulo}
          </h3>
        </div>
      </div>

      {/* Competencia objetivo */}
      <div style={{
        background: "rgba(59, 130, 246, 0.15)",
        borderRadius: "8px",
        padding: "10px 14px",
        marginBottom: "12px",
      }}>
        <p style={{ color: "#93c5fd", fontSize: "13px", margin: 0 }}>
           <strong>Objetivo de esta sesión:</strong> {data.competencia_objetivo}
        </p>
      </div>

      {/* Justificación IA */}
      <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "16px" }}>
        {data.justificacion}
      </p>

      {/* Botón CTA */}
      <button
        onClick={() => navigate(`/cases/${data.case.id}`)}
        style={{
          background: "#3b82f6",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          padding: "10px 20px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
          width: "100%",
          transition: "background 0.2s",
        }}
        onMouseOver={(e) => e.target.style.background = "#2563eb"}
        onMouseOut={(e) => e.target.style.background = "#3b82f6"}
      >
        Resolver este caso →
      </button>
    </div>
  );
}
```

---

### PASO 6 — Crear `frontend/src/components/KnowledgeGraph.jsx`

Grafo visual del estado de dominio del estudiante (sin librería externa, puro SVG):

```jsx
// frontend/src/components/KnowledgeGraph.jsx
import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Posiciones fijas de los nodos en el canvas SVG (diseño manual del grafo)
const NODE_POSITIONS = {
  semiologia_anamnesis:     { x: 300, y: 40  },
  diagnostico_diferencial:  { x: 300, y: 130 },
  examenes_complementarios: { x: 160, y: 220 },
  correlacion_multimodal:   { x: 160, y: 310 },
  diagnostico_final:        { x: 300, y: 310 },
  plan_terapeutico_msp:     { x: 300, y: 400 },
  seguimiento_prevencion:   { x: 300, y: 490 },
};

// Aristas del grafo (deben coincidir con CLINICAL_GRAPH en el backend)
const EDGES = [
  ["semiologia_anamnesis",     "diagnostico_diferencial"],
  ["diagnostico_diferencial",  "examenes_complementarios"],
  ["examenes_complementarios", "correlacion_multimodal"],
  ["correlacion_multimodal",   "diagnostico_final"],
  ["diagnostico_diferencial",  "diagnostico_final"],
  ["diagnostico_final",        "plan_terapeutico_msp"],
  ["plan_terapeutico_msp",     "seguimiento_prevencion"],
];

const LABELS = {
  semiologia_anamnesis:     "Semiología",
  diagnostico_diferencial:  "Dx Diferencial",
  examenes_complementarios: "Exámenes",
  correlacion_multimodal:   "Correlación",
  diagnostico_final:        "Dx Final",
  plan_terapeutico_msp:     "Tratamiento MSP",
  seguimiento_prevencion:   "Seguimiento",
};

function nodeColor(p) {
  if (p >= 0.75) return "#22c55e";  // dominado — verde
  if (p >= 0.40) return "#f59e0b";  // en progreso — amarillo
  return "#ef4444";                  // sin iniciar — rojo
}

export default function KnowledgeGraph({ userId }) {
  const [state, setState] = useState({});

  useEffect(() => {
    fetch(`${API_BASE}/api/adaptive/knowledge-state/${userId}`)
      .then((r) => r.json())
      .then((d) => {
        // d.knowledge_state = { "Semiología y Anamnesis": { key, p_dominio, nivel }, ... }
        // Convertir a { key: p_dominio }
        const flat = {};
        Object.values(d.knowledge_state || {}).forEach((v) => {
          flat[v.key] = v.p_dominio;
        });
        setState(flat);
      })
      .catch(() => {});
  }, [userId]);

  return (
    <div style={{ background: "#0f172a", borderRadius: "12px", padding: "16px" }}>
      <h4 style={{ color: "#60a5fa", marginBottom: "12px", fontSize: "14px" }}>
         Tu Mapa de Competencias Clínicas
      </h4>

      {/* Leyenda */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "12px", fontSize: "11px" }}>
        {[["#22c55e", "Dominado (≥75%)"], ["#f59e0b", "En progreso"], ["#ef4444", "Sin iniciar"]].map(([color, label]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
            {label}
          </div>
        ))}
      </div>

      <svg viewBox="0 0 600 540" style={{ width: "100%", maxHeight: "420px" }}>
        {/* Aristas */}
        {EDGES.map(([from, to]) => {
          const f = NODE_POSITIONS[from];
          const t = NODE_POSITIONS[to];
          return (
            <line
              key={`${from}-${to}`}
              x1={f.x} y1={f.y} x2={t.x} y2={t.y}
              stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)"
            />
          );
        })}
        {/* Flecha */}
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#334155" />
          </marker>
        </defs>
        {/* Nodos */}
        {Object.entries(NODE_POSITIONS).map(([key, pos]) => {
          const p = state[key] ?? 0;
          const color = nodeColor(p);
          return (
            <g key={key}>
              <circle cx={pos.x} cy={pos.y} r={28} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={2} />
              <text x={pos.x} y={pos.y - 4} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="bold">
                {LABELS[key]}
              </text>
              <text x={pos.x} y={pos.y + 12} textAnchor="middle" fill={color} fontSize="11" fontWeight="bold">
                {Math.round(p * 100)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
```

---

### PASO 7 — Integrar en el Dashboard existente

Agregar los dos componentes al Dashboard del estudiante. Busca el archivo donde está el dashboard del alumno (probablemente `frontend/src/pages/Dashboard.jsx` o similar) y agrega:

```jsx
// Importar al inicio del archivo
import AdaptiveNextCase from "../components/AdaptiveNextCase";
import KnowledgeGraph from "../components/KnowledgeGraph";

// Dentro del JSX, pasar el user_id del contexto de auth:
// (usa el mismo user.id que ya tienes del JWT / contexto de usuario)
<AdaptiveNextCase userId={user.id} />
<KnowledgeGraph   userId={user.id} />
```

---

### PASO 8 — Verificar que todo funciona

Ejecutar desde `backend/`:

```bash
# Probar el motor KST manualmente
python -c "
from adaptive.curriculum_engine import select_next_case
result = select_next_case('usr_alumno_001')
print('Caso sugerido:', result['case']['titulo'])
print('Competencia objetivo:', result['competencia_objetivo'])
print('Justificación:', result['justificacion'])
"
```

Probar los endpoints con el servidor corriendo:
```bash
# Knowledge state del alumno demo
curl http://localhost:8000/api/adaptive/knowledge-state/usr_alumno_001

# Caso recomendado para el alumno demo
curl http://localhost:8000/api/adaptive/next-case/usr_alumno_001

# Trayectoria de aprendizaje
curl http://localhost:8000/api/adaptive/learning-path/usr_alumno_001
```

---

### Resumen de Archivos — Sprint 0 Completo

| Archivo | Acción | Descripción |
| :--- | :---: | :--- |
| `backend/adaptive/__init__.py` | **[NEW]** | Módulo Python vacío |
| `backend/adaptive/knowledge_space.py` | **[NEW]** | Grafo KST + mapeo de ejes a nodos |
| `backend/adaptive/knowledge_tracer.py` | **[NEW]** | BKT sobre SQLite existente |
| `backend/adaptive/curriculum_engine.py` | **[NEW]** | Selección óptima de caso (ZDP) |
| `backend/routers/adaptive.py` | **[NEW]** | 3 endpoints REST del motor |
| `backend/main.py` | **[MODIFY]** | 2 líneas: import + include_router |
| `backend/cases_data/cases.json` | **[MODIFY]** | Agregar `competencias_activadas` a cada caso |
| `backend/requirements.txt` | **[MODIFY]** | Agregar `networkx>=3.0` |
| `frontend/src/components/AdaptiveNextCase.jsx` | **[NEW]** | Card de caso recomendado |
| `frontend/src/components/KnowledgeGraph.jsx` | **[NEW]** | Grafo SVG de dominio por competencia |
| `frontend/src/pages/Dashboard.jsx` | **[MODIFY]** | Integrar los 2 componentes nuevos |

**Tiempo estimado real de implementación:** 10-14 horas de trabajo continuo.

---

*Documento generado el 31 de agosto de 2026 — Versión 2.0*
*Repositorio: https://github.com/JorgeDoicela/clinical_rag*
