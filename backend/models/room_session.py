import random
import string
import datetime
import json
import sqlite3
import os
from typing import Dict, List, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "history.db")

# Almacenamiento en memoria sincronizado con SQLite
ATENEO_ROOMS_DB: Dict[str, Dict[str, Any]] = {}

def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_rooms_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ateneo_rooms (
            room_code TEXT PRIMARY KEY,
            case_id TEXT NOT NULL,
            docente_id TEXT NOT NULL,
            docente_nombre TEXT NOT NULL,
            estado TEXT NOT NULL,
            data_json TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    conn.commit()

    # Cargar salas existentes en memoria al iniciar
    cursor.execute("SELECT * FROM ateneo_rooms")
    rows = cursor.fetchall()
    conn.close()

    for row in rows:
        try:
            room_code = row["room_code"]
            data = json.loads(row["data_json"])
            ATENEO_ROOMS_DB[room_code] = data
        except Exception as e:
            print(f"[ROOM_DB] Error al cargar sala {row['room_code']}: {e}", flush=True)

def calculate_room_analytics(room: Dict[str, Any]) -> Dict[str, Any]:
    """Calcula la analítica de consenso e inteligencia colectiva para la sala de Ateneo."""
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

    # Conteo de brechas comunes
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

    nivel_consenso = "Alto Consenso Alineado a la GPC" if promedio >= 8.0 else ("Consenso Medio en Evaluación" if promedio >= 6.5 else "Brecha Colectiva Crítica Detectada")

    return {
        "promedio_sala": promedio,
        "total_respondidos": len(respondidos),
        "total_conectados": len(participantes),
        "nivel_consenso": nivel_consenso,
        "top_brechas_sala": top_brechas
    }

def seed_demo_ateneo_rooms():
    """Siembra salas de Ateneo de demostración activas con respuestas reales de alumnos."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Limpiar salas temporales anteriores
    cursor.execute("DELETE FROM ateneo_rooms WHERE room_code IN ('ATENEO-8492', 'ATENEO-3910')")
    conn.commit()
    conn.close()

    now = datetime.datetime.utcnow().isoformat()

    # SALA 1: ATENEO-8492 (Recién Nacido EHIRN - Fase de Discusión en Vivo)
    room1 = {
        "room_code": "ATENEO-8492",
        "case_id": "case_ehirn_01",
        "case_title": "Recién Nacido con Sangrado Umbilical y Trastorno de Coagulación (EHIRN Clásica)",
        "case_enunciado": "Recién nacido masculino de 3 días de vida, nacido de parto fortuito en domicilio sin profilaxis neonatal de Vitamina K al nacer. Presenta sangrado continuo en napa a nivel del muñón umbilical de 6 horas de evolución...",
        "case_pregunta": "Analice el reporte de laboratorio adjunto, clasifique el tipo de EHIRN y prescriba el esquema completo de tratamiento de urgencia según la GPC del MSP Ecuador.",
        "guia_asociada": "gpc_ehirn2019",
        "imagen_url": "/static/images/ehirn_coagulograma.png",
        "docente_id": "usr_docente_001",
        "docente_nombre": "Dr. Carlos Andrade (Docente de Medicina)",
        "estado": "discusion",
        "creado_en": now,
        "participantes": {
            "alumno@ateneo.edu.ec": {
                "id": "usr_alumno_001",
                "email": "alumno@ateneo.edu.ec",
                "nombre": "Estudiante María José Silva",
                "rol": "alumno",
                "respuesta": "Sospecha de EHIRN Clásica por sangrado a los 3 días sin profilaxis. Recomiendo administración inmediata de Fitomenadiona 1 mg IM o IV lenta, monitoreo de signos vitales cada 15 min y evaluación hemodinámica continua.",
                "respondido": True,
                "respondido_en": now,
                "resultado_evaluacion": {
                    "score": 8.5,
                    "score_max": 10,
                    "aciertos": ["Diagnóstico preciso de EHIRN Clásica.", "Dosis adecuada de Fitomenadiona 1 mg IM."],
                    "omisiones": ["Faltó especificar el tiempo de infusión lenta IV en caso de sangrado activo."],
                    "competencias_deficientes": [
                        {"eje": "tratamiento", "descripcion": "Velocidad de administración parenteral de Vitamina K1."}
                    ],
                    "cita_normativa": {
                        "guia": "GPC EHIRN MSP Ecuador",
                        "seccion": "Tratamiento de Urgencia",
                        "pagina": 14,
                        "texto_relevante": "Fitomenadiona 1 mg IM o IV lenta inmediata en caso de sangrado."
                    },
                    "retroalimentacion_general": "Excelente razonamiento diagnóstico y terapéutico."
                }
            },
            "juan.perez@ateneo.edu.ec": {
                "id": "usr_estudiante_002",
                "email": "juan.perez@ateneo.edu.ec",
                "nombre": "Estudiante Juan Pérez",
                "rol": "alumno",
                "respuesta": "Es un trastorno de coagulación por falta de Vitamina K. Recomiendo hospitalización y administración de líquidos IV.",
                "respondido": True,
                "respondido_en": now,
                "resultado_evaluacion": {
                    "score": 6.0,
                    "score_max": 10,
                    "aciertos": ["Identificó la causa asociada a Vitamina K."],
                    "omisiones": ["Omitió la dosis exacta de Fitomenadiona.", "Faltó esquema de laboratorio de control."],
                    "competencias_deficientes": [
                        {"eje": "tratamiento", "descripcion": "Dosificación exacta de líquidos e infusión pediátrica en urgencias."}
                    ],
                    "cita_normativa": {
                        "guia": "GPC EHIRN MSP Ecuador",
                        "seccion": "Tratamiento",
                        "pagina": 14,
                        "texto_relevante": "Fitomenadiona 1 mg IM inmediata."
                    },
                    "retroalimentacion_general": "Precisa las dosis pediátricas recomendadas por el MSP."
                }
            },
            "carolina.mendoza@ateneo.edu.ec": {
                "id": "usr_estudiante_003",
                "email": "carolina.mendoza@ateneo.edu.ec",
                "nombre": "Estudiante Carolina Mendoza",
                "rol": "alumno",
                "respuesta": "EHIRN de presentación clásica. Indico Vitamina K1 1 mg IM dosis única y si el sangrado persiste considerar Plasma Fresco Congelado 10-15 ml/kg.",
                "respondido": True,
                "respondido_en": now,
                "resultado_evaluacion": {
                    "score": 9.0,
                    "score_max": 10,
                    "aciertos": ["Clasificación correcta de EHIRN Clásica.", "Dosis exacta de Vitamina K1 e indicación de Plasma Fresco."],
                    "omisiones": ["Detalle de vía de infusión continua."],
                    "competencias_deficientes": [],
                    "cita_normativa": {
                        "guia": "GPC EHIRN MSP Ecuador",
                        "seccion": "Manejo Hemostático",
                        "pagina": 15,
                        "texto_relevante": "Plasma Fresco Congelado 10-15 ml/kg si hay sangrado mayor."
                    },
                    "retroalimentacion_general": "Excelente plan de manejo integral."
                }
            }
        }
    }
    room1["analitica_consenso"] = calculate_room_analytics(room1)
    _save_room_to_db(room1)

    print("[DB SEED] Salas de Ateneo de demostración sembradas exitosamente.", flush=True)

# Inicializar tabla al importar
init_rooms_db()

def _save_room_to_db(room_data: Dict[str, Any]):
    code = room_data["room_code"]
    ATENEO_ROOMS_DB[code] = room_data
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.datetime.utcnow().isoformat()
        cursor.execute("""
            INSERT INTO ateneo_rooms (room_code, case_id, docente_id, docente_nombre, estado, data_json, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(room_code) DO UPDATE SET
                estado = excluded.estado,
                data_json = excluded.data_json,
                updated_at = excluded.updated_at
        """, (
            code,
            room_data["case_id"],
            room_data["docente_id"],
            room_data["docente_nombre"],
            room_data["estado"],
            json.dumps(room_data, ensure_ascii=False),
            now
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[ROOM_DB] Error al guardar sala en DB: {e}", flush=True)

def generate_room_code() -> str:
    """Genera un código único de sala de 6 caracteres alfanuméricos."""
    while True:
        code = "ATENEO-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
        if code not in ATENEO_ROOMS_DB:
            return code

def create_room(case_id: str, docente_id: str, docente_nombre: str, custom_code: Optional[str] = None) -> Dict[str, Any]:
    from models.clinical_case import get_case_by_id
    caso = get_case_by_id(case_id)
    if not caso:
        # Fallback al primer caso si el id no existe
        from models.clinical_case import get_all_cases
        all_cases = get_all_cases()
        caso = all_cases[0] if all_cases else None

    if not caso:
        raise ValueError(f"No hay casos clínicos disponibles.")

    room_code = custom_code.upper() if custom_code else generate_room_code()
    now = datetime.datetime.utcnow().isoformat()

    room_data = {
        "room_code": room_code,
        "case_id": caso.id,
        "case_title": caso.titulo,
        "case_enunciado": caso.enunciado,
        "case_pregunta": caso.pregunta,
        "guia_asociada": caso.guia_asociada,
        "imagen_url": caso.imagen_url,
        "docente_id": docente_id,
        "docente_nombre": docente_nombre,
        "estado": "espera",  # 'espera' | 'resolucion' | 'discusion' | 'finalizado'
        "creado_en": now,
        "participantes": {},
    }

    _save_room_to_db(room_data)
    return room_data

def get_room(room_code: str) -> Optional[Dict[str, Any]]:
    code = room_code.upper().strip()
    room = None
    if code in ATENEO_ROOMS_DB:
        room = ATENEO_ROOMS_DB[code]
    else:
        # Buscar en SQLite si no está en la variable global
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT data_json FROM ateneo_rooms WHERE room_code = ?", (code,))
            row = cursor.fetchone()
            conn.close()
            if row:
                data = json.loads(row["data_json"])
                ATENEO_ROOMS_DB[code] = data
                room = data
        except Exception as e:
            print(f"[ROOM_DB] Error al buscar sala en DB: {e}", flush=True)

    if room:
        room["analitica_consenso"] = calculate_room_analytics(room)

    return room

def join_room(room_code: str, user_id: str, user_email: str, user_nombre: str, user_rol: str) -> Dict[str, Any]:
    code = room_code.upper().strip()
    room = get_room(code)

    # Si la sala no existe, crearla dinámicamente como sala activa para facilitar la prueba
    if not room:
        print(f"[ROOM_DB] Sala '{code}' no encontrada. Creando sala de demostración automáticamente...", flush=True)
        room = create_room(
            case_id="case_ehirn_01",
            docente_id="usr_docente_001",
            docente_nombre="Dr. Carlos Andrade (Docente)",
            custom_code=code
        )

    user_key = user_email.lower()
    if user_key not in room["participantes"]:
        room["participantes"][user_key] = {
            "id": user_id,
            "email": user_email,
            "nombre": user_nombre,
            "rol": user_rol,
            "respuesta": None,
            "resultado_evaluacion": None,
            "respondido": False,
            "unido_en": datetime.datetime.utcnow().isoformat()
        }
        _save_room_to_db(room)

    return room

def change_room_status(room_code: str, nuevo_estado: str, docente_id: str) -> Dict[str, Any]:
    code = room_code.upper().strip()
    room = get_room(code)
    if not room:
        raise ValueError(f"La sala '{code}' no existe.")

    estados_validos = ["espera", "resolucion", "discusion", "finalizado"]
    if nuevo_estado not in estados_validos:
        raise ValueError(f"Estado '{nuevo_estado}' no válido. Opciones: {estados_validos}")

    room["estado"] = nuevo_estado
    _save_room_to_db(room)
    return room



def submit_student_answer(room_code: str, user_email: str, respuesta_estudiante: str, eval_result: Dict[str, Any]) -> Dict[str, Any]:
    code = room_code.upper().strip()
    room = get_room(code)
    if not room:
        raise ValueError(f"La sala '{code}' no existe.")

    user_key = user_email.lower()
    if user_key not in room["participantes"]:
        # Auto-registrar si por alguna razón no estaba registrado
        room["participantes"][user_key] = {
            "id": "usr_alumno_001",
            "email": user_email,
            "nombre": "Estudiante Alumno",
            "rol": "alumno",
            "respuesta": None,
            "resultado_evaluacion": None,
            "respondido": False,
            "unido_en": datetime.datetime.utcnow().isoformat()
        }

    p = room["participantes"][user_key]
    p["respuesta"] = respuesta_estudiante
    p["resultado_evaluacion"] = eval_result
    p["respondido"] = True
    p["respondido_en"] = datetime.datetime.utcnow().isoformat()

    # Recalcular analítica de consenso
    room["analitica_consenso"] = calculate_room_analytics(room)

    _save_room_to_db(room)
    return room

# Sembrar salas de demostración al importar
seed_demo_ateneo_rooms()
