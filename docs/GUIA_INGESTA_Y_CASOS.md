# Especificación Técnica de Ingesta, Casos Clínicos, API REST y Persistencia SQL

Este documento especifica la estructura de datos, el protocolo de ingesta de documentos PDF, la especificación de endpoints de la API REST, la arquitectura de persistencia en SQLite y los algoritmos de analítica en tiempo real del sistema **Ateneo**.

---

## 1. Arquitectura de Persistencia de Datos

El sistema gestiona la información a través de tres capas de almacenamiento:

```text
                                  CAPAS DE ALMACENAMIENTO
┌────────────────────────────────┐ ┌────────────────────────────────┐ ┌────────────────────────────────┐
│   ChromaDB (Vector Store)      │ │     SQLite3 (history.db)       │ │     JSON Estructurado          │
├────────────────────────────────┤ ├────────────────────────────────┤ ├────────────────────────────────┤
│ Colección: `gpc_msp`           │ │ Tabla: `evaluation_history`    │ │ `cases.json` (Casos simulados) │
│ Vectores: 1024 dimensiones     │ │ Tabla: `ateneo_rooms`          │ │ `images/` (Recursos gráficos)  │
│ Distancia: Coseno              │ │ Historial y analítica B2B      │ │ Dataset FT (`ft_dataset.json`) │
└────────────────────────────────┘ └────────────────────────────────┘ └────────────────────────────────┘
```

---

## 2. Definición del Esquema JSON de Casos Clínicos

Los casos clínicos simulados se gestionan en `backend/cases_data/cases.json` mediante el objeto Pydantic `ClinicalCaseSchema`:

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

### Especificación de Campos
* `id` *(string, obligatorio)*: Identificador único del caso.
* `guia_asociada` *(string, obligatorio)*: Código identificador de la guía clínica en ChromaDB (`guia_fuente`).
* `titulo` *(string, obligatorio)*: Nombre descriptivo del caso.
* `enunciado` *(string, obligatorio)*: Descripción de la historia clínica, signos vitales y datos de laboratorio.
* `pregunta` *(string, obligatorio)*: Pregunta evaluativa dirigida al usuario.
* `nivel_esperado` *(string, opcional)*: Nivel académico (`pregrado_intermedio`, `pregrado_avanzado`). Default: `pregrado_avanzado`.
* `imagen_url` *(string, opcional)*: Ruta relativa para servir archivos estáticos (`/static/images/nombre.png`).
* `fragmento_gpc_ideal_id` *(string, opcional)*: Identificador de referencia para pruebas de benchmark.

---

## 3. Especificación de la API REST

### 3.1 Autenticación (`/auth`)
* `POST /auth/login`: Autentica usuarios preconfigurados (`admin@ateneo.edu.ec`, `docente@ateneo.edu.ec`, `alumno@ateneo.edu.ec`) y genera un token JWT de sesión.
* `GET /auth/me`: Retorna los datos del usuario autenticado actual.
* `GET /auth/users`: Retorna el catálogo de usuarios (Requiere rol `administrador`).

### 3.2 Casos Clínicos (`/api/cases`)
* `GET /api/cases`: Retorna la lista completa de casos clínicos activos.
* `GET /api/cases/{case_id}`: Retorna los detalles de un caso clínico específico.

### 3.3 Evaluación RAG (`/api/evaluate`)
* `POST /api/evaluate`: Recibe `case_id` (Form), `respuesta_estudiante` (Form) y opcionalmente `imagen` (UploadFile).
  1. Recupera el chunk relevante desde ChromaDB (`retrieve_relevant_chunk`).
  2. Procesa la respuesta e imagen clínica en Gemini API (`evaluate_clinical_reasoning`).
  3. Almacena automáticamente el resultado en `evaluation_history` de SQLite.
  4. Retorna el objeto estructurado `EvaluationResult`.

### 3.4 Historial y Analítica (`/api/history`)
* `GET /api/history`: Retorna el historial cronológico de evaluaciones de un estudiante.
* `GET /api/history/trends`: Genera las métricas de tendencias individuales, radar de competencias por eje y patrones de omisión frecuentes.
* `GET /api/history/coordinator-analytics`: Genera el reporte institucional B2B para coordinadores académicas (porcentaje de falla colectiva por módulo GPC).

### 3.5 Ateneo de Sala Colaborativo (`/api/ateneo`)
* `POST /api/ateneo/create`: Docente crea una sala sincrónica (Genera `room_code` único de 6 caracteres).
* `POST /api/ateneo/join`: Estudiante o docente se une a una sala existente.
* `GET /api/ateneo/room/{room_code}`: Retorna el estado en tiempo real de la sala y la analítica de consenso.
* `POST /api/ateneo/room/{room_code}/status`: Cambia la fase de la sala (`espera` $\rightarrow$ `resolucion` $\rightarrow$ `discusion` $\rightarrow$ `finalizado`).
* `POST /api/ateneo/room/{room_code}/submit`: Envía la respuesta de un estudiante en la sala, ejecuta la evaluación RAG y actualiza la analítica de consenso.

---

## 4. Esquema de Base de Datos SQLite3 (`history.db`)

### 4.1 Tabla `evaluation_history`
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

### 4.2 Tabla `ateneo_rooms`
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

## 5. Algoritmo de Analítica de Consenso Colectivo

El módulo `models/room_session.py` calcula la analítica de grupo para las salas colaborativas:

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
