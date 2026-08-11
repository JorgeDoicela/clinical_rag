# Especificación Técnica de Ingesta, Casos Clínicos, API REST y Persistencia SQL

Este documento establece la especificación formal de la arquitectura de almacenamiento de datos, el protocolo de ingesta de documentos PDF, los modelos Pydantic, la especificación completa de la API REST FastAPI, el esquema relacional en SQLite3 y los algoritmos de analítica institucional de la plataforma **Ateneo**.

---

## 1. Arquitectura de Almacenamiento de Datos

El sistema gestiona la información mediante tres capas complementarias de persistencia:

```text
                                  CAPAS DE ALMACENAMIENTO
┌────────────────────────────────┐ ┌────────────────────────────────┐ ┌────────────────────────────────┐
│   ChromaDB (Vector Store)      │ │     SQLite3 (history.db)       │ │     Archivos Estáticos / JSON  │
├────────────────────────────────┤ ├────────────────────────────────┤ ├────────────────────────────────┤
│ Colección: `gpc_msp`           │ │ Tabla: `evaluation_history`    │ │ `cases.json` (Casos clínicos)  │
│ Vectores: 1024 dimensiones     │ │ Tabla: `ateneo_rooms`          │ │ `images/` (Estudios médicos)   │
│ Distancia: Coseno (HNSW)       │ │ Historial y analítica B2B      │ │ Dataset FT (`ft_dataset.json`) │
└────────────────────────────────┘ └────────────────────────────────┘ └────────────────────────────────┘
```

---

## 2. Definición del Esquema JSON de Casos Clínicos

Los casos clínicos simulados se gestionan en [backend/cases_data/cases.json](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/cases_data/cases.json) e instancian mediante la clase Pydantic `ClinicalCaseSchema` en [backend/models/schemas.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/models/schemas.py#L54-L62):

```json
{
  "id": "case_dengue_01",
  "guia_asociada": "dengue",
  "titulo": "Paciente febril con signos de alarma por Dengue",
  "enunciado": "Paciente femenino de 24 años acude por cuadro febril de 4 días de evolución...",
  "pregunta": "Clasifique la severidad del caso según la GPC del MSP Ecuador y describa la conducta terapéutica inmediata.",
  "nivel_esperado": "pregrado_avanzado",
  "imagen_url": "/static/images/dengue_hemograma.png",
  "fragmento_gpc_ideal_id": "dengue_chunk_004"
}
```

### Especificación de Campos del Modelo `ClinicalCaseSchema`
* `id` *(string, obligatorio)*: Identificador único del caso clínico.
* `guia_asociada` *(string, obligatorio)*: Identificador de la norma médica en ChromaDB (`guia_fuente`).
* `titulo` *(string, obligatorio)*: Título descriptivo del caso.
* `enunciado` *(string, obligatorio)*: Historia clínica detallada, signos vitales y datos de laboratorio.
* `pregunta` *(string, obligatorio)*: Pregunta evaluativa dirigida al estudiante.
* `nivel_esperado` *(string, opcional)*: Nivel académico (`pregrado_intermedio`, `pregrado_avanzado`). Valor predeterminado: `pregrado_avanzado`.
* `imagen_url` *(string, opcional)*: Ruta relativa del recurso gráfico estático (`/static/images/nombre.png`).
* `fragmento_gpc_ideal_id` *(string, opcional)*: Identificador de referencia utilizado en las pruebas de benchmark.

---

## 3. Especificación Completa de la API REST FastAPI

### 3.1 Módulo de Autenticación ([backend/routers/auth.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/routers/auth.py))
* `POST /api/auth/login`
  * **Payload (JSON):** `{"email": "...", "password": "..."}`
  * **Respuesta (JSON):** Retorna `TokenResponse` conteniendo el token JWT de acceso (HS256) y el objeto `UserResponse` (`id`, `email`, `nombre`, `rol`).
* `GET /api/auth/me`
  * **Cabecera:** `Authorization: Bearer <token_jwt>`
  * **Respuesta (JSON):** Retorna el objeto `UserResponse` con los datos del usuario autenticado actual.
* `GET /api/auth/users`
  * **Cabecera:** `Authorization: Bearer <token_jwt>` (Requiere rol `administrador`).
  * **Respuesta (JSON):** Retorna la lista completa de usuarios registrados.

### 3.2 Módulo de Casos Clínicos ([backend/routers/cases.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/routers/cases.py))
* `GET /api/cases`
  * **Respuesta (JSON):** Retorna la lista completa de casos clínicos activos (`List[ClinicalCaseSchema]`).
* `GET /api/cases/{case_id}`
  * **Respuesta (JSON):** Retorna el objeto `ClinicalCaseSchema` correspondiente al identificador solicitado.

### 3.3 Módulo de Evaluación RAG ([backend/routers/evaluation.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/routers/evaluation.py))
* `POST /api/evaluate`
  * **Formato de Carga:** `multipart/form-data`
  * **Campos:**
    - `case_id` *(Form string, obligatorio)*
    - `respuesta_estudiante` *(Form string, obligatorio)*
    - `imagen` *(UploadFile binary, opcional)*
  * **Secuencia de Procesamiento:**
    1. Obtiene el caso clínico y lee la imagen adjunta (o carga la imagen preconfigurada en `cases_data/images/`).
    2. Ejecuta la búsqueda vectorial por distancia coseno en ChromaDB invocando `retrieve_relevant_chunk`.
    3. Construye el prompt multimodal e invoca a Google Gemini API mediante `evaluate_clinical_reasoning`.
    4. Valida y repara sintácticamente la salida en el objeto `EvaluationResult`.
    5. Guarda el registro de evaluación automáticamente en `evaluation_history` de SQLite.
  * **Respuesta (JSON):** Objeto `EvaluationResult` (`score`, `aciertos`, `omisiones`, `competencias_deficientes`, `cita_normativa`, `retroalimentacion_general`).

### 3.4 Módulo de Historial y Analítica B2B ([backend/routers/history.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/routers/history.py))
* `GET /api/history`
  * **Cabecera:** `Authorization: Bearer <token_jwt>`
  * **Respuesta (JSON):** Retorna las últimas evaluaciones registradas para el estudiante.
* `GET /api/history/trends`
  * **Cabecera:** `Authorization: Bearer <token_jwt>`
  * **Respuesta (JSON):** Genera la analítica longitudinal individual, puntuaciones temporales por GPC, patrón de omisiones y el gráfico de radar de competencias en los 4 ejes clínicos.
* `GET /api/history/coordinator-analytics`
  * **Cabecera:** `Authorization: Bearer <token_jwt>` (Requiere rol `docente` o `administrador`).
  * **Respuesta (JSON):** Genera el informe institucional B2B para directores de carrera con la tasa de falla por módulo GPC y el ranking de deficiencias colectivas.

### 3.5 Módulo de Salas de Ateneo Sincrónicas ([backend/routers/collaboration.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/routers/collaboration.py))
* `POST /api/ateneo/create`: Docente crea una sala sincrónica (genera `room_code` alfanumérico de 6 caracteres).
* `POST /api/ateneo/join`: Estudiante o docente se conecta a la sala de Ateneo.
* `GET /api/ateneo/room/{room_code}`: Retorna el estado en tiempo real de la sala, las entregas de los participantes y el cálculo de consenso de grupo.
* `POST /api/ateneo/room/{room_code}/status`: Modifica la fase de la sala (`espera` $\rightarrow$ `resolucion` $\rightarrow$ `discusion` $\rightarrow$ `finalizado`).
* `POST /api/ateneo/room/{room_code}/submit`: Recibe la respuesta del estudiante, ejecuta la evaluación RAG y actualiza la analítica de consenso en tiempo real.

---

## 4. Esquema Relacional de Base de Datos SQLite3 (`history.db`)

### 4.1 Tabla `evaluation_history` ([backend/models/history_db.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/models/history_db.py#L18-L35))
```sql
CREATE TABLE IF NOT EXISTS evaluation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    case_id TEXT NOT NULL,
    guia_asociada TEXT NOT NULL,
    case_title TEXT NOT NULL,
    score REAL NOT NULL,
    score_max INTEGER NOT NULL DEFAULT 10,
    aciertos_json TEXT NOT NULL,
    omisiones_json TEXT NOT NULL,
    competencias_json TEXT NOT NULL,
    cita_normativa_json TEXT NOT NULL,
    retroalimentacion_general TEXT NOT NULL,
    timestamp TEXT NOT NULL
);
```

### 4.2 Tabla `ateneo_rooms` ([backend/models/room_session.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/models/room_session.py#L23-L33))
```sql
CREATE TABLE IF NOT EXISTS ateneo_rooms (
    room_code TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    docente_id TEXT NOT NULL,
    docente_nombre TEXT NOT NULL,
    estado TEXT NOT NULL,
    data_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

---

## 5. Algoritmo de Analítica de Consenso Colectivo en Tiempo Real

El módulo [room_session.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/models/room_session.py#L49-L90) procesa el rendimiento de la cohorte conectada a una sala sincrónica:

```python
def calculate_room_analytics(room: Dict[str, Any]) -> Dict[str, Any]:
    participantes = list((room.get("participantes") or {}).values())
    respondidos = [p for p in participantes if p.get("respondido") and p.get("resultado_evaluacion")]

    if not respondidos:
        return {
            "promedio_sala": 0.0,
            "total_respondidos": 0,
            "nivel_consenso": "Sin entregas aún",
            "top_brechas_sala": []
        }

    scores = [p["resultado_evaluacion"].get("score", 0) for p in respondidos]
    promedio = round(sum(scores) / len(scores), 1)

    deficiencias_map: Dict[str, int] = {}
    for p in respondidos:
        eval_res = p["resultado_evaluacion"]
        for comp in eval_res.get("competencias_deficientes", []):
            desc = comp.get("descripcion", "") if isinstance(comp, dict) else str(comp)
            if desc:
                deficiencias_map[desc] = deficiencias_map.get(desc, 0) + 1
        for om in eval_res.get("omisiones", []):
            if om and len(om) > 10:
                deficiencias_map[om] = deficiencias_map.get(om, 0) + 1

    top_brechas = [
        {"brecha": k, "estudiantes_afectados": v, "porcentaje": round((v / len(respondidos)) * 100)}
        for k, v in sorted(deficiencias_map.items(), key=lambda x: x[1], reverse=True)[:4]
    ]

    nivel_consenso = (
        "Alto Consenso Alineado a la GPC" if promedio >= 8.0 
        else ("Consenso Medio en Evaluación" if promedio >= 6.5 
        else "Brecha Colectiva Crítica Detectada")
    )
    return {
        "promedio_sala": promedio,
        "total_respondidos": len(respondidos),
        "total_conectados": len(participantes),
        "nivel_consenso": nivel_consenso,
        "top_brechas_sala": top_brechas
    }
```

---

## 6. Recomendación de Ingesta Nativa en Entornos Contenerizados (Docker)

Al montar la aplicación mediante volúmenes en vivo Docker (`./backend:/app`):

1. **Prevención de Incompatibilidad de Deserialización (`KeyError: '_type'`):**
   Si el archivo `chroma.sqlite3` se genera en el sistema operativo Host (Windows/macOS) y luego se monta en un contenedor Linux, pueden producirse inconsistencias de formato en los metadatos de las colecciones de ChromaDB.
2. **Procedimiento Recomendado:**
   Ejecutar la ingesta de vectores de manera **nativa dentro de la imagen de producción**:
   ```bash
   docker compose stop backend
   rm -rf backend/data/chroma_db
   docker compose run --rm backend python ingestion/run_ingestion.py
   docker compose up -d
   ```
   Esto garantiza que los archivos binarios de SQLite y los índices HNSW se generen estrictamente con la versión de `chromadb` (`0.6.3`) sobre Linux.
