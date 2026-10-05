# Plan de Arquitectura y Profesionalización de la Base de Datos (Ateneo+ DB)

Este documento establece el diagnóstico forense, el modelo entidad-relación normalizado y la hoja de ruta técnica paso a paso para elevar la capa de persistencia de **Ateneo+** a estándares de producción institucional (+10 años en ingeniería de software), soportando tanto desarrollo local en SQLite WAL como despliegues de alta disponibilidad en PostgreSQL.

---

## 0. Dependencias con Otros Planes

Este plan define la base del sistema. Ninguno de los otros planes puede ejecutar sus fases avanzadas sin que las fases de este plan esten completadas:

| Fase de este Plan | Desbloquea en Backend | Desbloquea en Frontend |
|:------------------|:----------------------|:-----------------------|
| **Fase 1** (PRAGMA + WAL) | Precondicion de Fase 2 Backend (UoW) | No afecta directamente |
| **Fase 2** (FK + DateTime + indices) | Precondicion de Fase 2 Backend (UoW) y Fase 6 Backend (Multi-Tenancy) | No afecta directamente |
| **Fase 3** (Migracion de datos) | Desbloquea Fase 6 Backend | No afecta directamente |
| **Fase 4** (Repositorios) | Desbloquea metricas nativas en Fases 4-5 Backend | Fase 11 Frontend (analytics avanzado) |
| **Fase 5** (Regresion completa) | Certificacion de integridad | Certificacion de contrato de API |

**Orden canonico:** BD (Fases 1-5) > Backend (Fases 1-10) > Frontend Bloque C (Fases 11-16)

---

## 1. Diagnóstico Forense del Esquema Actual

### 1.1. Inventario de Tablas y Registros Físicos (`backend/data/history.db`)

| Tabla | Registros | Clave Primaria | Estado FK en SQLAlchemy | Timestamps | Índices Compuestos |
|:------|:----------|:---------------|:------------------------|:-----------|:-------------------|
| **`users`** | 3 | `id` (VARCHAR 100) | Ninguna FK externa | `created_at` como `String(50)` | Ninguno |
| **`evaluation_history`** | >= 33 (variable con el uso) | `id` (INTEGER AUTO) | `user_id`: `String(100)` sin FK formal | `timestamp` como `String(50)` | Ninguno |
| **`ateneo_rooms`** | 25 | `room_code` (TEXT) | `docente_id`: `String(100)` sin FK formal | `updated_at` como `String(50)`, sin `created_at` | Ninguno |
| **`student_mastery`** | 1 | `user_id` (VARCHAR 100) | `user_id`: PK como `String(100)` sin FK formal | `updated_at` como `String(50)` | Ninguno |
| **`student_learning_snapshots`** | 1 | `id` (INTEGER AUTO) | `user_id`: `String(100)` sin FK formal | `timestamp` como `String(50)` | Ninguno |
| **`clinical_cases`** | 0 | `id` (VARCHAR 64) | `creado_por`: `String(100)` sin FK formal | `created_at` / `updated_at` como `DateTime` | Ninguno |

### 1.2. Diagrama del Estado Actual (Modelos Desconectados)

```mermaid
erDiagram
    USERS {
        VARCHAR id PK
        VARCHAR email UK
        VARCHAR nombre
        VARCHAR rol
        VARCHAR hashed_password
        BOOLEAN activo
        STRING created_at "String(50) — no DateTime"
    }

    EVALUATION_HISTORY {
        INTEGER id PK
        STRING user_id "String(100) — sin FK SQLAlchemy"
        STRING user_email
        STRING case_id
        STRING guia_asociada
        STRING case_title
        FLOAT score
        INTEGER score_max
        TEXT aciertos_json
        TEXT omisiones_json
        TEXT competencias_json
        TEXT cita_normativa_json
        TEXT retroalimentacion_general
        STRING timestamp "String(50) — no DateTime"
    }

    ATENEO_ROOMS {
        STRING room_code PK
        STRING case_id
        STRING docente_id "String(100) — sin FK SQLAlchemy"
        STRING docente_nombre
        STRING estado
        TEXT data_json
        STRING updated_at "String(50) — sin created_at"
    }

    STUDENT_MASTERY {
        STRING user_id PK "String(100) — sin FK SQLAlchemy"
        TEXT state_json
        STRING updated_at "String(50) — no DateTime"
    }

    STUDENT_LEARNING_SNAPSHOTS {
        INTEGER id PK
        STRING user_id "String(100) — sin FK SQLAlchemy"
        INTEGER session_num
        FLOAT score_obtained
        TEXT state_json
        STRING timestamp "String(50) — no DateTime"
    }

    CLINICAL_CASES {
        VARCHAR id PK
        VARCHAR guia_asociada
        VARCHAR titulo
        TEXT enunciado
        TEXT pregunta
        VARCHAR imagen_url
        VARCHAR nivel_esperado
        VARCHAR fragmento_gpc_ideal_id
        VARCHAR modo_simulacion
        JSON fases
        JSON competencias_activadas
        VARCHAR creado_por "String(100) — sin FK SQLAlchemy"
        DATETIME created_at "DateTime nativo — unico modelo correcto"
        DATETIME updated_at
    }
```

---

## 2. Modelo Entidad-Relación Objetivo (Estándar Senior)

El esquema normalizado introduce integridad referencial estricta, índices compuestos para aceleración de analíticas y columnas de primer orden para métricas clínicas:

```mermaid
erDiagram
    USERS ||--o{ EVALUATION_HISTORY : "genera"
    USERS ||--o{ ATENEO_ROOMS : "administra_como_docente"
    USERS ||--o| STUDENT_MASTERY : "tiene_estado"
    USERS ||--o{ STUDENT_LEARNING_SNAPSHOTS : "registra_trayectoria"
    USERS ||--o{ CLINICAL_CASES : "crea_como_autor"

    USERS {
        VARCHAR(100) id PK
        VARCHAR(150) email UK
        VARCHAR(200) nombre
        VARCHAR(50) rol
        VARCHAR(255) hashed_password
        BOOLEAN activo
        DATETIME created_at
        DATETIME updated_at
    }

    EVALUATION_HISTORY {
        INTEGER id PK
        VARCHAR(100) user_id FK "REFERENCES users(id) ON DELETE CASCADE"
        VARCHAR(150) user_email
        VARCHAR(100) case_id
        VARCHAR(150) guia_asociada
        VARCHAR(255) case_title
        FLOAT score
        INTEGER score_max
        FLOAT faithfulness_score "Columna de primer orden indexada"
        VARCHAR(50) cohorte_id "Identificador de grupo académico"
        FLOAT tiempo_segundos
        TEXT aciertos_json
        TEXT omisiones_json
        TEXT competencias_json
        TEXT cita_normativa_json
        TEXT retroalimentacion_general
        DATETIME created_at "Indexado conjuntamente con user_id"
    }

    ATENEO_ROOMS {
        VARCHAR(20) room_code PK
        VARCHAR(100) case_id
        VARCHAR(100) docente_id FK "REFERENCES users(id) ON DELETE RESTRICT"
        VARCHAR(150) docente_nombre
        VARCHAR(50) estado
        TEXT data_json
        DATETIME created_at
        DATETIME updated_at
    }

    STUDENT_MASTERY {
        VARCHAR(100) user_id PK,FK "REFERENCES users(id) ON DELETE CASCADE"
        TEXT state_json
        DATETIME updated_at
    }

    STUDENT_LEARNING_SNAPSHOTS {
        INTEGER id PK
        VARCHAR(100) user_id FK "REFERENCES users(id) ON DELETE CASCADE"
        INTEGER session_num
        FLOAT score_obtained
        TEXT state_json
        DATETIME created_at "Indexado conjuntamente con user_id"
    }

    CLINICAL_CASES {
        VARCHAR(64) id PK
        VARCHAR(128) guia_asociada
        VARCHAR(255) titulo
        TEXT enunciado
        TEXT pregunta
        VARCHAR(255) imagen_url
        VARCHAR(64) nivel_esperado
        VARCHAR(64) fragmento_gpc_ideal_id
        VARCHAR(32) modo_simulacion
        JSON fases
        JSON competencias_activadas
        VARCHAR(100) creado_por FK "REFERENCES users(id) ON DELETE SET NULL"
        DATETIME created_at
        DATETIME updated_at
    }
```

---

## 3. Diccionario de Datos Exhaustivo

### 3.1. Tabla: `users`
Almacena credenciales e identidades con control de acceso basado en roles (RBAC).

| Columna | Tipo SQL | Nulo | Restricciones / Por Defecto | Descripción |
|:--------|:---------|:----:|:----------------------------|:------------|
| `id` | `VARCHAR(100)` | No | Clave Primaria | Identificador único del usuario (`usr_alumno_001`, `usr_docente_001`, etc.). |
| `email` | `VARCHAR(150)` | No | `UNIQUE`, Índice | Correo electrónico institucional para inicio de sesión. |
| `nombre` | `VARCHAR(200)` | No | Ninguna | Nombre y apellidos del usuario. |
| `rol` | `VARCHAR(50)` | No | `'alumno'` | Rol de seguridad (`alumno`, `docente`, `administrador`). |
| `hashed_password` | `VARCHAR(255)` | No | Ninguna | Hash seguro de contraseña mediante algoritmo Bcrypt con salt dinámico. |
| `activo` | `BOOLEAN` | No | `TRUE` | Estado de habilitación de la cuenta. |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | Fecha y hora UTC de registro en la plataforma. |
| `updated_at` | `DATETIME` | Sí | `ON UPDATE CURRENT_TIMESTAMP` | Fecha y hora UTC de la última modificación de perfil. |

---

### 3.2. Tabla: `evaluation_history`
Almacena el historial formativo de simulaciones clínicas resueltas con retroalimentación RAG.

| Columna | Tipo SQL | Nulo | Restricciones / Por Defecto | Descripción |
|:--------|:---------|:----:|:----------------------------|:------------|
| `id` | `INTEGER` | No | Clave Primaria, Autoincremental | Identificador secuencial de la evaluación. |
| `user_id` | `VARCHAR(100)` | No | `FK -> users(id) ON DELETE CASCADE` | Estudiante evaluado. Elimina historial si el usuario es borrado. |
| `user_email` | `VARCHAR(150)` | No | Ninguna | Correo histórico capturado en el momento de la evaluación. |
| `case_id` | `VARCHAR(100)` | No | Índice | Identificador del caso clínico evaluado. |
| `guia_asociada` | `VARCHAR(150)` | No | Ninguna | Guía de Práctica Clínica del MSP asociada al caso. |
| `case_title` | `VARCHAR(255)` | No | Ninguna | Título descriptivo del caso. |
| `score` | `FLOAT` | No | Check `(score >= 0 AND score <= 10)` | Puntuación obtenida (0.0 a 10.0). |
| `score_max` | `INTEGER` | No | `10` | Puntuación máxima de referencia. |
| `faithfulness_score` | `FLOAT` | Sí | Índice | Métrica de fidelidad normativa calculada por el algoritmo anti-alucinación. |
| `cohorte_id` | `VARCHAR(50)` | Sí | `'general'`, Índice | Agrupador institucional para analítica B2B de directores y docentes. |
| `tiempo_segundos` | `FLOAT` | Sí | `0.0` | Tiempo invertido por el alumno en redactar y someter el caso. |
| `aciertos_json` | `TEXT` | No | `'[]'` | Lista serializada JSON con aspectos normativos acertados. |
| `omisiones_json` | `TEXT` | No | `'[]'` | Lista serializada JSON con aspectos normativos omitidos. |
| `competencias_json`| `TEXT` | No | `'[]'` | Lista serializada JSON de competencias clínicas deficientes por eje. |
| `cita_normativa_json`| `TEXT` | No | `'{}'` | Objeto JSON con la referencia exacta a la norma del MSP (página, fragmento). |
| `retroalimentacion_general`| `TEXT`| No| `''` | Dictamen pedagógico cualitativo emitido por el modelo LLM. |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP`, Índice | Marca temporal de la evaluación. |

**Índices Compuestos de Rendimiento:**
* `ix_eval_user_created`: `(user_id, created_at DESC)` — Acelera la consulta del historial cronológico del alumno (`/api/history`).
* `ix_eval_cohort_guide`: `(cohorte_id, guia_asociada)` — Acelera el cálculo del *Índice de Brecha Formativa (IBF)* institucional (`/api/history/ibf-cohort`).

---

### 3.3. Tabla: `ateneo_rooms`
Almacena las sesiones sincrónicas de resolución colaborativa de casos entre docentes y estudiantes.

| Columna | Tipo SQL | Nulo | Restricciones / Por Defecto | Descripción |
|:--------|:---------|:----:|:----------------------------|:------------|
| `room_code` | `VARCHAR(20)` | No | Clave Primaria, Índice | Código nemotécnico de 6 caracteres (ej. `ATENEO-4Z1A`). |
| `case_id` | `VARCHAR(100)` | No | Índice | Caso clínico asignado a la sesión colaborativa. |
| `docente_id` | `VARCHAR(100)` | No | `FK -> users(id) ON DELETE RESTRICT` | Docente creador y moderador de la sala. |
| `docente_nombre`| `VARCHAR(150)`| No | Ninguna | Nombre visible del moderador. |
| `estado` | `VARCHAR(50)` | No | `'espera'` | Estado de la sala (`espera`, `discusion`, `cerrada`). |
| `data_json` | `TEXT` | No | `'{}'` | Estado serializado de participantes, intervenciones y dictámenes. |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | Fecha de creación de la sala. |
| `updated_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | Fecha y hora de última actividad sincrónica. |

---

### 3.4. Tabla: `student_mastery`
Almacena el estado latente consolidado de dominio continuo para las 7 competencias clínicas (BKT).

| Columna | Tipo SQL | Nulo | Restricciones / Por Defecto | Descripción |
|:--------|:---------|:----:|:----------------------------|:------------|
| `user_id` | `VARCHAR(100)` | No | Clave Primaria, `FK -> users(id) ON DELETE CASCADE` | Estudiante al que pertenece el perfil psicométrico. |
| `state_json` | `TEXT` | No | `'{}'` | Diccionario JSON `{ competencia_id: p_mastery }` (probabilidad $P(L_t)$ de 0 a 1). |
| `updated_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | Fecha de última actualización del motor BKT. |

---

### 3.5. Tabla: `student_learning_snapshots`
Almacena los puntos discretos de la curva de aprendizaje longitudinal para reconstrucción psicométrica.

| Columna | Tipo SQL | Nulo | Restricciones / Por Defecto | Descripción |
|:--------|:---------|:----:|:----------------------------|:------------|
| `id` | `INTEGER` | No | Clave Primaria, Autoincremental | Identificador secuencial del snapshot. |
| `user_id` | `VARCHAR(100)` | No | `FK -> users(id) ON DELETE CASCADE` | Estudiante evaluado. |
| `session_num` | `INTEGER` | No | Ninguna | Número ordinal de la sesión evaluativa (1, 2, 3...). |
| `score_obtained` | `FLOAT` | No | Ninguna | Calificación obtenida en esa sesión clínica. |
| `state_json` | `TEXT` | No | `'{}'` | Snapshot de las probabilidades de maestría tras la sesión. |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | Marca temporal del snapshot. |

**Índice Compuesto de Rendimiento:**
* `ix_snapshot_user_session`: `(user_id, session_num ASC)` — Acelera la reconstrucción de curvas de aprendizaje en el panel adaptativo (`/api/adaptive/learning-path`).

---

### 3.6. Tabla: `clinical_cases`
Almacena casos clínicos dinámicos creados institucionalmente por docentes en la base de datos relacional.

| Columna | Tipo SQL | Nulo | Restricciones / Por Defecto | Descripción |
|:--------|:---------|:----:|:----------------------------|:------------|
| `id` | `VARCHAR(64)` | No | Clave Primaria, Índice | Identificador canónico del caso (ej. `case_asma_01`). |
| `guia_asociada` | `VARCHAR(128)` | No | Índice | Guía de Práctica Clínica vinculada. |
| `titulo` | `VARCHAR(255)` | No | Ninguna | Título descriptivo del caso médico. |
| `enunciado` | `TEXT` | No | Ninguna | Cuadro clínico inicial del paciente. |
| `pregunta` | `TEXT` | No | Ninguna | Pregunta formativa a responder por el estudiante. |
| `imagen_url` | `VARCHAR(255)` | Sí | Ninguna | URL relativa o estática de paraclínicos (ECG, Rx, Labs). |
| `nivel_esperado` | `VARCHAR(64)` | Sí | `'pregrado_avanzado'` | Nivel pedagógico de dificultad. |
| `fragmento_gpc_ideal_id` | `VARCHAR(64)` | Sí | Ninguna | Identificador del fragmento normativo de referencia. |
| `modo_simulacion` | `VARCHAR(32)` | Sí | `'single_turn'` | Modalidad (`single_turn` o `fases`). |
| `fases` | `JSON` | Sí | Ninguna | Estructura jerárquica de fases clínicas secuenciales. |
| `competencias_activadas`| `JSON` | Sí | Ninguna | Lista de competencias del grafo KST involucradas. |
| `creado_por` | `VARCHAR(100)` | Sí | `FK -> users(id) ON DELETE SET NULL` | Docente autor del caso dinámico. |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | Fecha de creación del caso. |
| `updated_at` | `DATETIME` | Sí | `ON UPDATE CURRENT_TIMESTAMP` | Fecha de última edición. |

---

## 4. Plan de Ejecución por Fases (Paso a Paso sin Parches)

### Fase 1: Habilitación de Integridad Referencial en el Motor
* **Estado:** **Completado.**
* **Pasos de Ejecución:**
  1. Actualizar `backend/core/database.py`:
     - Configurar listener para ejecutar `PRAGMA foreign_keys=ON;` en SQLite cada vez que se establece una conexión (junto con el modo WAL ya activo).
     - Estandarizar la ruta por defecto de la base de datos hacia `backend/data/ateneo_clinical.db` (preservando migración automática transparente desde `history.db` para no perder los datos existentes).
* **Criterios de Aceptación:**
  * `PRAGMA foreign_keys` retorna `1` en cada conexión SQLite abierta por SQLAlchemy.
  * Suite completa del backend aprueba al 100% (`uv run python -m tests.run_all_tests`).

### Fase 2: Refactorización de Modelos Relacionales (SQLAlchemy 2.0)
* **Estado:** **Completado.**
* **Pasos de Ejecución:**
  1. Actualizar `modules/auth/models.py`:
     - Migrar `created_at` a `DateTime(timezone=True)` con `func.now()`.
  2. Actualizar `modules/analytics_history/models.py`:
     - Agregar `ForeignKey("users.id", ondelete="CASCADE")` a `user_id`.
     - Agregar columnas de primer orden: `faithfulness_score: Float`, `cohorte_id: String(50)`, `tiempo_segundos: Float`.
     - Migrar `timestamp` a `DateTime(timezone=True)`.
     - Crear índices compuestos `ix_eval_user_created` e `ix_eval_cohort_guide`.
  3. Actualizar `modules/collaboration/models.py`:
     - Agregar columna `created_at: DateTime(timezone=True)` con `server_default=func.now()`.
     - Agregar `ForeignKey("users.id", ondelete="RESTRICT")` a `docente_id`.
     - Migrar `updated_at` a `DateTime(timezone=True)` con `onupdate=func.now()`.
  4. Actualizar `modules/adaptive/models.py`:
     - Agregar `ForeignKey("users.id", ondelete="CASCADE")` a `StudentMasteryModel.user_id` y `StudentSnapshotModel.user_id`.
     - Migrar fechas a `DateTime(timezone=True)`.
     - Crear índice compuesto `ix_snapshot_user_session` en `student_learning_snapshots`.
  5. Actualizar `modules/cases/models.py`:
     - Agregar `ForeignKey("users.id", ondelete="SET NULL")` a `creado_por`.
* **Criterios de Aceptación:**
  * Todas las tablas poseen FK declaradas con las políticas `ON DELETE` correctas y SafeDateTime unificado.
  * Índices compuestos `ix_eval_user_created`, `ix_eval_cohort_guide` e `ix_snapshot_user_session` presentes en el esquema.
  * 6 suites maestras del backend aprobadas al 100% (`uv run python -m tests.run_all_tests`).

### Fase 3: Migración de Datos y Preservación de Registros Existentes
* **Estado:** **Completado.**
* **Pasos de Ejecución:**
  1. Crear el script de migración determinístico `scripts/migrate_history_to_ateneo_clinical.py` que:
     - Cree la base de datos con el nuevo esquema normalizado (`ateneo_clinical.db`).
     - Migre los usuarios, 33 evaluaciones, 52 salas y estados psicométricos existentes en `history.db` garantizando que no se pierda ningún dato histórico.
     - Resuelva la integridad de usuarios huérfanos (`usr_estudiante_002` a `usr_estudiante_007`) matriculándolos formalmente en `users`.
     - Verifique que la integridad referencial sea 100% válida tras la migración (ejecutando `PRAGMA foreign_key_check`).
* **Criterios de Aceptación:**
  * El script migró todos los registros existentes sin pérdida de datos.
  * `PRAGMA foreign_key_check` retorna 0 violaciones en el nuevo esquema.
  * La base de datos rechaza inserciones con `user_id` no existente por `IntegrityError`.

### Fase 4: Sincronización de Repositorios de Dominio
* **Estado:** **Completado.**
* **Pasos de Ejecución:**
  1. Actualizar `HistoryRepository`:
     - Sincronizar inserciones para poblar `faithfulness_score`, `cohorte_id` y `tiempo_segundos` como columnas directas.
     - Optimizar consultas de analítica de coordinadores (`analyze_coordinator_cohort_analytics`) utilizando agregaciones SQL nativas (`func.avg`, `func.count`, `func.distinct`, `group_by(guia_asociada)`).
  2. Actualizar `RoomRepository`:
     - Agregar métodos de consulta tipados `get_active_rooms` y `get_by_docente`.
* **Criterios de Aceptación:**
  * Las inserciones en `evaluation_history` persisten `faithfulness_score` y `cohorte_id` como columnas de primer orden.
  * Métricas de cohorte calculadas con agregaciones SQL nativas sin carga de diccionarios en bucles.
  * 6 suites maestras del backend aprobadas al 100%.

### Fase 5: Verificación Integral de Regresión
* **Estado:** **Completado.**
* **Pasos de Ejecución:**
  1. Ejecutar la suite completa de pruebas del backend (`uv run python -m tests.run_all_tests`).
  2. Validar que las 6 suites aprueben al 100% con las nuevas restricciones de llaves foráneas e índices.
  3. Ejecutar la suite de pruebas del frontend (`npm run test`) para constatar cero alteraciones en los contratos del cliente.
  4. Ejecutar validación de tipos TypeScript (`npm run typecheck`) y build de producción (`npm run build`).
  5. Ejecutar suite E2E de Playwright (`npm run test:e2e`).
  6. Actualizar `.agents/memory.md` y hoja de ruta.
* **Criterios de Aceptación:**
  * Las 6 suites maestras del backend aprobadas al 100% (`uv run python -m tests.run_all_tests`).
  * 16 suites y 72 pruebas unitarias del frontend aprobadas al 100% (`npm run test`).
  * 15/15 pruebas E2E Playwright aprobadas (`npm run test:e2e`).
  * Cero errores de TypeScript (`npm run typecheck`).
  * `PRAGMA integrity_check` retorna `ok` y `PRAGMA foreign_key_check` retorna 0 violaciones.

---

## 5. Infraestructura ya Implementada (Línea Base)

| Componente | Ubicación | Estado | Notas |
|:-----------|:----------|:------:|:------|
| `PRAGMA foreign_keys=ON` en listener SQLAlchemy | `backend/core/database.py` | **Completado** | Activo en modo SQLite |
| Modo WAL activo (`journal_mode=WAL`) | `backend/core/database.py` | **Completado** | `PRAGMA synchronous=NORMAL` también activo |
| `UserModel` con campos base y `SafeDateTime` | `backend/modules/auth/models.py` | **Completado** | `SafeDateTime` con `func.now()` |
| `EvaluationHistoryModel` con columnas de 1er orden | `backend/modules/analytics_history/models.py` | **Completado** | `faithfulness_score`, `cohorte_id`, `tiempo_segundos`, `timestamp` como `SafeDateTime` |
| `AteneoRoomModel` con FK y timestamps completos | `backend/modules/collaboration/models.py` | **Completado** | `created_at` y `updated_at` como `SafeDateTime`, `docente_id` FK |
| `StudentMasteryModel` y `StudentSnapshotModel` con FK | `backend/modules/adaptive/models.py` | **Completado** | `SafeDateTime` y FK formal a `users.id` |
| `ClinicalCaseModel` con `SafeDateTime` nativo | `backend/modules/cases/models.py` | **Completado** | `creado_por` FK formal con `ON DELETE SET NULL` |
| FK formales con `ON DELETE` en todos los modelos | Todos los módulos | **Completado** | Todas las tablas referencian `users.id` con políticas explícitas |
| Índices compuestos (`ix_eval_user_created`, etc.) | `evaluation_history`, `student_learning_snapshots` | **Completado** | 3 índices creados e indexados |
| Timestamps unificados con `SafeDateTime` | Todos los modelos | **Completado** | Compatibilidad SQLite y PostgreSQL |
| Columnas de primer orden (`faithfulness_score`, `cohorte_id`, `tiempo_segundos`) | `evaluation_history` | **Completado** | Persistencia directa y agregaciones nativas |

---

## 6. Matriz de Seguimiento por Sesiones

| Sesión / Hito | Fase Asignada | Enfoque Principal | Entregable Clave | Estado |
|:---:|:---|:---|:---|:---:|
| **Sesión 1** | **Fase 1** | Integridad Referencial en Motor SQLite | `PRAGMA foreign_keys=ON` en listener + ruta `ateneo_clinical.db` | **Completado** |
| **Sesión 2** | **Fase 2** | Refactorización de Modelos Relacionales | FK estrictas con `ON DELETE` + índices compuestos + columnas de primer orden | **Completado** |
| **Sesión 3** | **Fase 3** | Migración Determinística de Datos | Script `migrate_history_to_ateneo_clinical.py` + `PRAGMA foreign_key_check` | **Completado** |
| **Sesión 4** | **Fase 4** | Sincronización de Repositorios | Inserción de `faithfulness_score`, `cohorte_id` y consultas SQL nativas agregadas | **Completado** |
| **Sesión 5** | **Fase 5** | Verificación Integral de Regresión | 6 suites backend + 72 tests frontend + 15 Playwright E2E al 100% | **Completado** |
