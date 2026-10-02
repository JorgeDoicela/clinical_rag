"""
Módulo de Blindaje Clínico contra Prompt Injection, Jailbreaks y Sanitización de Entradas.
Protege el evaluador normativo y el motor socrático contra técnicas de manipulación de instrucciones,
fugas de contexto del sistema o respuestas maliciosas en texto libre de estudiantes.
"""
import re
import logging
from typing import Dict, Any, List, Optional, Tuple, Generator
from dataclasses import dataclass

from models.schemas import EvaluationResult, PhaseEvaluationResult, CitaNormativa

logger = logging.getLogger("ateneo.prompt_security")

MAX_INPUT_LENGTH = 5000


@dataclass
class SecurityScanResult:
    """Resultado del análisis heurístico y léxico de seguridad."""
    is_safe: bool
    attack_type: Optional[str] = None
    detected_pattern: Optional[str] = None
    risk_score: float = 0.0
    sanitized_text: str = ""


# Catálogo de patrones heurísticos compilados contra ataques adversarios
PROMPT_INJECTION_PATTERNS: List[Tuple[str, re.Pattern, float]] = [
    # 1. Anulación de instrucciones previas (Instruction Override)
    (
        "instruction_override",
        re.compile(
            r"(?i)\b(ignore|disregard|forget|override|bypass)\b[\s\w,]{0,20}\b(previous|all|prior|system|above)\b[\s\w,]{0,20}\b(instructions|prompts|rules|commands|directives)\b",
        ),
        1.0
    ),
    (
        "instruction_override_es",
        re.compile(
            r"(?i)\b(ignora|olvida|desestima|omite|anula)\b[\s\w,]{0,20}\b(todas|las|cualquier|anteriores|previas)\b[\s\w,]{0,20}\b(instrucciones|reglas|directivas|ordenes|indicaciones)\b",
        ),
        1.0
    ),
    (
        "instruction_override_direct",
        re.compile(
            r"(?i)\b(ignore\s+previous\s+instructions|ignora\s+las\s+instrucciones\s+anteriores|olvida\s+todas\s+las\s+reglas)\b",
        ),
        1.0
    ),

    # 2. Secuestro de rol / Personificación adversaria (Roleplay Hijacking / Jailbreak)
    (
        "roleplay_hijack",
        re.compile(
            r"(?i)\b(you\s+are\s+now|act\s+as\s+a|pretend\s+to\s+be|simulate\s+being)\b[\s\w,]{0,30}\b(unrestricted|unfiltered|jailbroken|dan\s+mode|evil|developer\s+mode)\b",
        ),
        0.95
    ),
    (
        "roleplay_hijack_es",
        re.compile(
            r"(?i)\b(ahora\s+eres|act[uú]a\s+como|finge\s+ser)\b[\s\w,]{0,30}\b(sin\s+restricciones|modo\s+dan|desarrollador|sin\s+filtros|modo\s+libre)\b",
        ),
        0.95
    ),
    (
        "dan_mode",
        re.compile(r"(?i)\b(dan\s+mode|modo\s+dan|jailbreak|developer\s+mode)\b"),
        0.9
    ),

    # 3. Fuga de contexto del sistema (System Prompt Leaking)
    (
        "prompt_leaking",
        re.compile(
            r"(?i)\b(print|show|display|reveal|output|repeat|dime|muestra|revela|escribe)\b[\s\w,]{0,25}\b(your|the|all|el|tus)?\s*(system\s+prompt|initial\s+instructions|system\s+instructions|prompt\s+del\s+sistema|instrucciones\s+del\s+sistema)\b",
        ),
        0.95
    ),
    (
        "prompt_leaking_query",
        re.compile(
            r"(?i)\b(cu[aá]les\s+son\s+tus\s+instrucciones|what\s+are\s+your\s+instructions|repeat\s+everything\s+above)\b",
        ),
        0.9
    ),

    # 4. Coerción o manipulación directa de calificación (Grade Manipulation)
    (
        "grade_coercion",
        re.compile(
            r"(?i)\b(give\s+me|assign\s+me|set\s+score|calif[ií]came\s+con|as[ií]gname\s+una\s+nota\s+de|ponme\s+una\s+nota\s+de|ponme|dame)\b[\s\w,]{0,15}\b(10|10\.0|10/10|diez|m[aá]xima\s+nota|sobresaliente|perfect[oa])\b",
        ),
        0.85
    ),
    (
        "grade_coercion_directive",
        re.compile(
            r"(?i)\b(say\s+that\s+my\s+answer\s+is\s+correct|di\s+que\s+mi\s+respuesta\s+es\s+correcta|di\s+que\s+todo\s+est[aá]\s+perfecto)\b",
        ),
        0.85
    ),

    # 5. Evasión de delimitadores y tags del sistema (Delimiter Smuggling)
    (
        "delimiter_smuggling",
        re.compile(
            r"(?i)(</student_clinical_argument>|</system>|</prompt>|<system>|\[INST\]|\[/INST\]|<\|im_start\|>|<\|im_end\|>|```system)",
        ),
        1.0
    ),
]


class PromptSecurityGuard:
    """
    Guardia de seguridad heurístico y léxico para blindaje de entradas clínicas.
    Detecta y neutraliza intentos de inyección de instrucciones previniendo
    vulnerabilidades en el evaluador normativo.
    """

    @staticmethod
    def sanitize_text(text: str) -> str:
        """
        Limpia caracteres de control, caracteres invisibles y neutraliza
        delimitadores del sistema sin alterar la notación médica legítima
        (ej. 'TFG < 30 ml/min', 'TA > 160/110', 'pH < 7.35').
        """
        if not text:
            return ""

        # Truncar longitud excesiva para evitar agotamiento de tokens
        sanitized = text[:MAX_INPUT_LENGTH].strip()

        # Eliminar caracteres nulos y caracteres invisibles zero-width
        sanitized = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\u200b-\u200f\ufeff]", "", sanitized)

        # Neutralizar tags de delimitación específicos del prompt
        sanitized = re.sub(
            r"(?i)</?student_clinical_argument>",
            "[delimitador_neutralizado]",
            sanitized
        )
        sanitized = re.sub(
            r"(?i)</?system>",
            "[tag_sistema_neutralizado]",
            sanitized
        )

        return sanitized

    @classmethod
    def inspect_input(cls, text: str) -> SecurityScanResult:
        """
        Inspecciona el texto del estudiante en busca de vectores de inyección o jailbreak.
        Retorna un objeto SecurityScanResult detallado.
        """
        if not text or not text.strip():
            return SecurityScanResult(
                is_safe=True,
                risk_score=0.0,
                sanitized_text=""
            )

        sanitized = cls.sanitize_text(text)

        # Evaluar patrones adversarios
        for attack_name, pattern, risk in PROMPT_INJECTION_PATTERNS:
            match = pattern.search(text)
            if match:
                detected_str = match.group(0)
                logger.warning(
                    "[SecurityGuard] Amenaza detectada: tipo='%s', patrón='%s', texto_muestra='%s'",
                    attack_name, detected_str, text[:80]
                )
                return SecurityScanResult(
                    is_safe=False,
                    attack_type=attack_name,
                    detected_pattern=detected_str,
                    risk_score=risk,
                    sanitized_text=sanitized
                )

        return SecurityScanResult(
            is_safe=True,
            risk_score=0.0,
            sanitized_text=sanitized
        )

    @staticmethod
    def build_security_violation_evaluation(
        attack_type: Optional[str] = None,
        detected_pattern: Optional[str] = None
    ) -> EvaluationResult:
        """
        Genera un dictamen formal con nota 0.0 y penalización pedagógica
        por intento de vulneración de integridad académica y profesionalismo clínico.
        """
        detalle = f" (patrón detectado: '{detected_pattern}')" if detected_pattern else ""
        return EvaluationResult(
            score=0.0,
            score_max=10,
            aciertos=[],
            omisiones=[
                f"Violación de Integridad Académica y Ética Médica: Se detectó un intento deliberado de manipulación de directivas del evaluador ({attack_type or 'inyección de prompt'}){detalle}.",
                "Ausencia de argumentación clínica fundamentada en la Guía de Práctica Clínica del MSP Ecuador."
            ],
            competencias_deficientes=[
                {
                    "eje": "diagnóstico",
                    "descripcion": "Conducta antiética y transgresión de directivas pedagógicas del simulador clínico institucional."
                },
                {
                    "eje": "tratamiento",
                    "descripcion": "Ausencia total de esquema terapéutico o farmacológico normado."
                },
                {
                    "eje": "prevención",
                    "descripcion": "Falta de análisis de factores de riesgo y medidas de prevención."
                },
                {
                    "eje": "seguimiento",
                    "descripcion": "Omisión de criterios de seguimiento y de seguridad del paciente."
                }
            ],
            cita_normativa=CitaNormativa(
                guia="Código de Ética Médica y Normativa Institucional MSP",
                seccion="Integridad Académica y Profesionalismo Clínico",
                pagina=1,
                texto_relevante="El ejercicio y formación médica exigen la más estricta probidad, veracidad e integridad ética. Todo intento de alterar la evaluación clínica acarrea reprobación disciplinaria inmediata."
            ),
            retroalimentacion_general=(
                "ADVERTENCIA DE SEGURIDAD E INTEGRIDAD: Se ha identificado una tentativa de elusión o manipulación de las directivas del evaluador. "
                "Conforme al reglamento de evaluación médica de Ateneo+, el caso ha sido calificado con 0.0/10 por transgresión del código de ética académica."
            ),
            faithfulness_score=0.0,
            total_claims=0,
            grounded_claims=0,
            grounding_level="Nulo (Violación de Seguridad)"
        )

    @staticmethod
    def build_security_violation_phase_evaluation(
        fase_numero: int,
        attack_type: Optional[str] = None,
        detected_pattern: Optional[str] = None
    ) -> PhaseEvaluationResult:
        """
        Genera un PhaseEvaluationResult sancionatorio con nota 0.0 y bloqueo de avance.
        """
        detalle = f" ('{detected_pattern}')" if detected_pattern else ""
        return PhaseEvaluationResult(
            fase_numero=fase_numero,
            score_fase=0.0,
            aciertos=[],
            omisiones=[
                f"Violación de Integridad Académica: Intento de inyección de instrucciones en fase {fase_numero}{detalle}.",
                "Falta de razonamiento clínico para el hito evaluado."
            ],
            competencias_deficientes=[
                {
                    "eje": "diagnóstico",
                    "descripcion": "Conducta antiética en la simulación clínica por fases."
                }
            ],
            cita_normativa=CitaNormativa(
                guia="Código de Ética Médica y Normativa MSP",
                seccion="Integridad en Simulación Clínica",
                pagina=1,
                texto_relevante="Toda simulación clínica debe realizarse bajo principios de veracidad y rigor científico."
            ),
            retroalimentacion_fase=(
                f"ADVERTENCIA: Intento de manipulación de directivas detectado en la Fase {fase_numero}. "
                "La fase ha sido calificada con 0.0 y el avance queda bloqueado."
            ),
            desbloquea_siguiente=False,
            datos_fase_siguiente=None
        )

    @staticmethod
    def generate_security_violation_socratic_stream(
        attack_type: Optional[str] = None
    ) -> Generator[str, None, None]:
        """
        Emite tokens SSE de advertencia pedagógica ante manipulación en debriefing socrático.
        """
        mensaje = (
            "ADVERTENCIA PEDAGÓGICA Y ÉTICA:\n\n"
            "Se ha detectado un intento de alterar las instrucciones del diálogo socrático. "
            "El simulador Ateneo+ exige una discusión profesional centrada exclusivamente en la evidencia clínica "
            "y en la Guía de Práctica Clínica del MSP Ecuador. Por favor, formula una réplica o justificación clínica legítima."
        )
        for palabra in mensaje.split(" "):
            yield f"data: {palabra} \n\n"
        yield "data: [DONE]\n\n"


# Instancia singleton accesible de forma transversal
security_guard = PromptSecurityGuard()
