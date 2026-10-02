import random
import string
import datetime
import json
from typing import Dict, List, Any, Optional
from modules.collaboration.models import AteneoRoomModel
from modules.collaboration.repository import RoomRepository
from modules.cases.service import CaseService


class CollaborationService:
    """
    Servicio de Dominio para Salas de Ateneo Sincrónico y Colaboración en Tiempo Real.
    Gestiona el ciclo de vida de salas, participantes, estados pedagógicos y consenso formativo.
    """
    def __init__(self, repository: RoomRepository, case_service: CaseService):
        self.repository = repository
        self.case_service = case_service
        self._memory_cache: Dict[str, Dict[str, Any]] = {}

    def calculate_room_analytics(self, room: Dict[str, Any]) -> Dict[str, Any]:
        """Calcula la analítica de consenso e inteligencia colectiva de la sala."""
        participantes = list((room.get("participantes") or {}).values())
        respondidos = [p for p in participantes if p.get("respondido") and p.get("resultado_evaluacion")]

        if not respondidos:
            return {
                "promedio_sala": 0.0,
                "total_respondidos": 0,
                "total_conectados": len(participantes),
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

    def _save_to_storage(self, room_data: Dict[str, Any]) -> None:
        code = room_data["room_code"]
        self._memory_cache[code] = room_data

        now = datetime.datetime.utcnow().isoformat()
        record = AteneoRoomModel(
            room_code=code,
            case_id=room_data["case_id"],
            docente_id=room_data["docente_id"],
            docente_nombre=room_data["docente_nombre"],
            estado=room_data["estado"],
            data_json=json.dumps(room_data, ensure_ascii=False),
            updated_at=now
        )
        self.repository.save(record)

    def generate_room_code(self) -> str:
        while True:
            code = "ATENEO-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
            if code not in self._memory_cache and not self.repository.get(code):
                return code

    def create_room(
        self,
        case_id: str,
        docente_id: str,
        docente_nombre: str,
        custom_code: Optional[str] = None
    ) -> Dict[str, Any]:
        caso = self.case_service.get_case(case_id)
        if not caso:
            all_cases = self.case_service.list_cases()
            caso = all_cases[0] if all_cases else None

        if not caso:
            raise ValueError("No hay casos clínicos disponibles en el catálogo.")

        room_code = custom_code.upper() if custom_code else self.generate_room_code()
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
            "estado": "espera",
            "creado_en": now,
            "participantes": {},
        }

        self._save_to_storage(room_data)
        return room_data

    def get_room(self, room_code: str) -> Optional[Dict[str, Any]]:
        code = room_code.upper().strip()
        room = self._memory_cache.get(code)

        if not room:
            db_record = self.repository.get(code)
            if db_record:
                try:
                    room = json.loads(db_record.data_json)
                    self._memory_cache[code] = room
                except Exception as e:
                    print(f"[COLLAB_SERVICE] Error al deserializar sala {code}: {e}", flush=True)

        if room:
            room["analitica_consenso"] = self.calculate_room_analytics(room)

        return room

    def join_room(
        self,
        room_code: str,
        user_id: str,
        user_email: str,
        user_nombre: str,
        user_rol: str
    ) -> Dict[str, Any]:
        code = room_code.upper().strip()
        room = self.get_room(code)

        if not room:
            room = self.create_room(
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
            self._save_to_storage(room)

        return room

    def change_room_status(self, room_code: str, nuevo_estado: str, docente_id: str) -> Dict[str, Any]:
        code = room_code.upper().strip()
        room = self.get_room(code)
        if not room:
            raise ValueError(f"La sala '{code}' no existe.")

        estados_validos = ["espera", "resolucion", "discusion", "finalizado"]
        if nuevo_estado not in estados_validos:
            raise ValueError(f"Estado '{nuevo_estado}' no válido. Opciones: {estados_validos}")

        room["estado"] = nuevo_estado
        self._save_to_storage(room)
        return room

    def submit_student_answer(
        self,
        room_code: str,
        user_email: str,
        respuesta_estudiante: str,
        eval_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        code = room_code.upper().strip()
        room = self.get_room(code)
        if not room:
            raise ValueError(f"La sala '{code}' no existe.")

        user_key = user_email.lower()
        if user_key not in room["participantes"]:
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

        room["analitica_consenso"] = self.calculate_room_analytics(room)
        self._save_to_storage(room)
        return room

    def seed_demo_rooms_if_needed(self) -> None:
        if self.repository.count() > 0:
            return

        now = datetime.datetime.utcnow().isoformat()
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
                }
            }
        }
        room1["analitica_consenso"] = self.calculate_room_analytics(room1)
        self._save_to_storage(room1)
        print("[COLLAB_SERVICE] Salas de demostración sembradas exitosamente con SQLAlchemy.", flush=True)
