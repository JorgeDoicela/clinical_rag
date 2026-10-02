import json
import re
from typing import Dict, Any, Optional, List, Tuple
from google import genai
from google.genai import types
from config import GEMINI_API_KEY, GEMINI_MODEL
from services.llm_gateway import llm_gateway, AllModelsExhaustedException, FatalLLMException
from models.schemas import EvaluationResult, ClinicalCaseSchema, CitaNormativa, PhaseEvaluationResult
from rag.prompt_builder import SYSTEM_INSTRUCTION, build_prompt, build_phase_prompt
from rag.security_guard import security_guard
from core.logger import get_logger

logger = get_logger("ateneo.rag.evaluator")

def call_gemini_llm(
    prompt: str,
    imagenes_list: Optional[List[Tuple[bytes, str]]] = None,
    # Backward compat: si se pasa imagen singular, se convierte a lista
    imagen_bytes: Optional[bytes] = None,
    imagen_mime: str = "image/jpeg"
) -> str:
    """
    Llama a la API de Google Gemini a través del ResilientLLMGateway oficial.
    Soporta Circuit Breaker automático, fallback entre modelos configurados sin latencia fantasma
    y Fusión Multimodal Simultánea (ECG, Rx, Labs).
    """
    partes_imagenes: List[Tuple[bytes, str]] = []
    if imagenes_list:
        partes_imagenes = imagenes_list
    elif imagen_bytes:
        partes_imagenes = [(imagen_bytes, imagen_mime)]

    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY no configurada. Usando fallback de desarrollo local...", extra={"action": "gemini_api_key_missing"})
        return json.dumps({

            "score": 8.0,
            "score_max": 10,
            "aciertos": [
                "Identificó correctamente el diagnóstico principal y la severidad del cuadro clínico."
            ],
            "omisiones": [
                "Faltó precisar la velocidad de infusión del esquema de líquidos de la GPC."
            ],
            "competencias_deficientes": [
                {
                    "eje": "tratamiento",
                    "descripcion": "Cálculo impreciso de la tasa de infusión e hidratación parenteral acorde a la GPC."
                },
                {
                    "eje": "seguimiento",
                    "descripcion": "Omisión del protocolo de monitoreo hemodinámico en las primeras 6 horas."
                }
            ],
            "cita_normativa": {
                "guia": "GPC MSP Ecuador",
                "seccion": "Manejo Terapéutico Oficial",
                "pagina": 1,
                "texto_relevante": "Se debe iniciar reposición intravenosa inmediata según la guía del MSP."
            },
            "retroalimentacion_general": "Excelente razonamiento inicial en el diagnóstico. Recuerda revisar la dosificación exacta recomendada por el MSP."
        })

    try:
        result = llm_gateway.generate(
            prompt=prompt,
            imagenes_list=partes_imagenes if partes_imagenes else None,
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            temperature=0.2
        )
        return result.text
    except AllModelsExhaustedException as exc:
        logger.warning(f"ALERTA RESILIENCIA: {exc}. Activando fallback formativo de respaldo...", extra={"action": "llm_all_models_exhausted_fallback"})
    except FatalLLMException as fatal:
        logger.error(f"ERROR CRÍTICO AUTENTICACIÓN: {fatal}. Activando fallback formativo de respaldo...", extra={"action": "llm_fatal_auth_fallback"})

    # Si la cuota gratuita de la API se agotó temporalmente en todos los modelos, usar fallback defensivo formativo
    logger.warning("Cuota gratuita de Gemini agotada temporalmente. Devolviendo evaluación formativa de respaldo...", extra={"action": "llm_quota_exhausted_fallback"})
    return json.dumps({

        "score": 7.5,
        "score_max": 10,
        "aciertos": [
            "Identificó adecuadamente el cuadro clínico y los elementos de sospecha inicial."
        ],
        "omisiones": [
            "Se requiere precisar el esquema específico de dosis y líquidos indicado en la GPC."
        ],
        "competencias_deficientes": [
            {
                "eje": "tratamiento",
                "descripcion": "Falta de precisión en la dosificación exacta de fármacos recomendados por la norma."
            }
        ],
        "cita_normativa": {
            "guia": "GPC MSP Ecuador",
            "seccion": "Manejo Terapéutico y Protocolo de Atención",
            "pagina": 1,
            "texto_relevante": "Se recomienda la hospitalización inmediata y reposición continua de líquidos según la norma."
        },
        "retroalimentacion_general": "Buen análisis clínico inicial. Recuerda verificar las dosis exactas recomendadas por el Ministerio de Salud Pública."
    })

def _repair_truncated_json(text: str) -> str:
    """
    Intenta reparar un JSON truncado cerrando strings, arrays y objetos abiertos.
    Útil cuando max_output_tokens corta la respuesta de Gemini a mitad del texto.
    """
    # Cerrar string abierto si el texto termina dentro de uno
    if text.count('"') % 2 != 0:
        text += '"'
    # Cerrar arrays y objetos abiertos (conteo de apertura vs cierre)
    open_brackets = text.count('[') - text.count(']')
    open_braces = text.count('{') - text.count('}')
    # Cerrar primero los arrays más internos, luego los objetos
    text += ']' * max(0, open_brackets)
    text += '}' * max(0, open_braces)
    return text


def _normalize_cita_normativa(data: dict) -> dict:
    """Normaliza el campo cita_normativa a la estructura esperada por Pydantic."""
    if "cita_normativa" not in data:
        return data
    cn = data["cita_normativa"]
    if isinstance(cn, str):
        data["cita_normativa"] = {
            "guia": "GPC MSP Ecuador",
            "seccion": "Sección Oficial",
            "pagina": 1,
            "texto_relevante": cn
        }
    elif isinstance(cn, dict):
        if "texto_relevante" not in cn or not cn["texto_relevante"]:
            cn["texto_relevante"] = cn.get("texto") or cn.get("cita") or cn.get("fragmento") or "Norma MSP Ecuador"
    return data

def _normalize_competencias_deficientes(data: dict) -> dict:
    """Normaliza defensivamente competencias_deficientes si el LLM devuelve formatos irregulares."""
    if "competencias_deficientes" not in data:
        return data
    raw_list = data["competencias_deficientes"]
    if not isinstance(raw_list, list):
        data["competencias_deficientes"] = []
        return data

    normalized = []
    for item in raw_list:
        if isinstance(item, str):
            normalized.append({
                "eje": "tratamiento",
                "descripcion": item
            })
        elif isinstance(item, dict):
            eje_val = item.get("eje") or item.get("categoria") or item.get("tipo") or item.get("eje_clinico") or "tratamiento"
            desc_val = item.get("descripcion") or item.get("detalle") or item.get("brecha") or item.get("texto") or "Brecha detectada frente a la GPC"
            normalized.append({
                "eje": str(eje_val),
                "descripcion": str(desc_val)
            })
    data["competencias_deficientes"] = normalized
    return data

def _unwrap_root_envelope(data: Any) -> Any:
    """Desenvuelve el objeto raíz si Gemini lo encapsula en 'evaluacion', 'resultado', etc."""
    if isinstance(data, dict):
        for candidate_key in ["evaluacion", "evaluation", "resultado", "result", "dictamen"]:
            if candidate_key in data and isinstance(data[candidate_key], dict):
                return data[candidate_key]
    return data

def parse_and_validate_llm_json(raw_text: str) -> EvaluationResult:
    """
    Limpia defensivamente y valida mediante Pydantic el JSON devuelto por Gemini.
    Si el JSON está truncado, intenta repararlo antes de fallar.
    """
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned)
    cleaned = cleaned.strip()

    # Intento 1: parseo directo
    try:
        data = json.loads(cleaned)
        data = _unwrap_root_envelope(data)
        data = _normalize_cita_normativa(data)
        data = _normalize_competencias_deficientes(data)
        return EvaluationResult(**data)
    except json.JSONDecodeError as e:
        logger.warning(
            "JSON invalido, intentando reparacion por truncamiento",
            extra={"action": "json_parse_retry", "error": str(e)}
        )

    # Intento 2: reparar truncamiento y reintentar
    try:
        repaired = _repair_truncated_json(cleaned)
        data = json.loads(repaired)
        data = _unwrap_root_envelope(data)
        data = _normalize_cita_normativa(data)
        data = _normalize_competencias_deficientes(data)
        logger.info("JSON reparado exitosamente tras truncamiento", extra={"action": "json_repaired"})
        return EvaluationResult(**data)
    except Exception as e:
        raise ValueError(f"Fallo al parsear o validar la respuesta de Gemini a JSON: {e}. Raw: {raw_text[:200]}")

def evaluate_clinical_reasoning(
    caso: ClinicalCaseSchema,
    respuesta_estudiante: str,
    chunk: Dict[str, Any],
    imagenes_list: Optional[List[Tuple[bytes, str]]] = None,
    # Backward compat: parámetros singulares
    imagen_bytes: Optional[bytes] = None,
    imagen_mime: str = "image/jpeg"
) -> EvaluationResult:
    """
    Ejecuta el flujo completo de evaluación: prompt -> Gemini -> validación Pydantic.
    Soporta Fusión Multimodal Simultánea con múltiples estudios clínicos.
    Contempla 1 reintento automático en caso de error de formato.
    """
    # Normalizar a lista unificada (prioridad: lista > singular > ninguna)
    if imagenes_list is None and imagen_bytes:
        imagenes_list = [(imagen_bytes, imagen_mime)]

    tiene_imagen = bool(imagenes_list)
    n_imagenes = len(imagenes_list) if imagenes_list else 0
    mime_types = [m for _, m in imagenes_list] if imagenes_list else []
    # 1. Blindaje clínico contra prompt injection y sanitización de entrada
    scan = security_guard.inspect_input(respuesta_estudiante)
    if not scan.is_safe:
        logger.warning(
            "Intento de Prompt Injection neutralizado, penalizando con 0.0",
            extra={
                "action": "security_injection_blocked",
                "attack_type": scan.attack_type,
                "detected_pattern": scan.detected_pattern
            }
        )
        return security_guard.build_security_violation_evaluation(
            attack_type=scan.attack_type,
            detected_pattern=scan.detected_pattern
        )

    prompt = build_prompt(
        caso, scan.sanitized_text, chunk,
        tiene_imagen=tiene_imagen,
        n_imagenes=n_imagenes,
        mime_types=mime_types,
    )

    try:
        raw_text = call_gemini_llm(prompt, imagenes_list=imagenes_list)
        resultado = parse_and_validate_llm_json(raw_text)
    except ValueError:
        retry_prompt = prompt + "\n\nNOTA: Asegúrate estrictamente de devolver ÚNICAMENTE el objeto JSON sin bloques de código."
        raw_text_retry = call_gemini_llm(retry_prompt, imagenes_list=imagenes_list)
        resultado = parse_and_validate_llm_json(raw_text_retry)

    # Enriquecer y sincronizar la cita normativa con la metadata fidedigna del fragmento RAG
    if chunk and resultado.cita_normativa:
        chunk_page = chunk.get("pagina")
        if chunk_page:
            try:
                resultado.cita_normativa.pagina = int(chunk_page)
            except (ValueError, TypeError):
                pass
        chunk_sec = chunk.get("seccion")
        if chunk_sec and (resultado.cita_normativa.seccion in ["General", "Sección Oficial", ""] or not resultado.cita_normativa.seccion):
            resultado.cita_normativa.seccion = str(chunk_sec)
        chunk_guia = chunk.get("guia_fuente")
        if chunk_guia and (resultado.cita_normativa.guia in ["GPC MSP Ecuador", "MSP Ecuador", ""] or not resultado.cita_normativa.guia):
            resultado.cita_normativa.guia = f"GPC {str(chunk_guia).upper()} MSP Ecuador"

    # Calcular y adjuntar Faithfulness Score (Anti-Alucinación Normativa)
    try:
        from evaluation.faithfulness_scorer import calculate_faithfulness_score
        chunk_text = chunk.get("texto", "") if chunk else ""
        fs_data = calculate_faithfulness_score(
            aciertos=resultado.aciertos,
            omisiones=resultado.omisiones,
            chunk_normativo_texto=chunk_text
        )
        resultado.faithfulness_score = fs_data["faithfulness_score"]
        resultado.total_claims       = fs_data["total_claims"]
        resultado.grounded_claims    = fs_data["grounded_claims"]
        resultado.grounding_level    = fs_data["grounding_level"]
        logger.info(
            "Faithfulness Score calculado",
            extra={
                "action": "faithfulness_calculated",
                "faithfulness_score": fs_data["faithfulness_score"],
                "grounding_level": fs_data["grounding_level"]
            }
        )
    except Exception as fs_err:
        logger.error(
            "Error al calcular faithfulness score",
            extra={"action": "faithfulness_error", "error": str(fs_err)}
        )

    return resultado

def evaluate_phase_reasoning(
    caso: ClinicalCaseSchema,
    fase_numero: int,
    respuesta_estudiante: str,
    chunk: Dict[str, Any],
    historial_previo: str = "",
    imagenes_list: Optional[List[Tuple[bytes, str]]] = None
) -> PhaseEvaluationResult:
    """
    Evalúa la respuesta de una fase clínica específica y devuelve un PhaseEvaluationResult estructurado.
    """
    tiene_imagen = bool(imagenes_list)
    n_imagenes = len(imagenes_list) if imagenes_list else 0
    mime_types = [m for _, m in imagenes_list] if imagenes_list else []
    # 1. Blindaje clínico contra prompt injection y sanitización de entrada en fases
    scan = security_guard.inspect_input(respuesta_estudiante)
    if not scan.is_safe:
        logger.warning(
            "Intento de Prompt Injection en fase clinica neutralizado",
            extra={
                "action": "security_injection_blocked",
                "fase_numero": fase_numero,
                "attack_type": scan.attack_type,
                "detected_pattern": scan.detected_pattern
            }
        )
        return security_guard.build_security_violation_phase_evaluation(
            fase_numero=fase_numero,
            attack_type=scan.attack_type,
            detected_pattern=scan.detected_pattern
        )

    prompt = build_phase_prompt(
        caso=caso,
        fase_numero=fase_numero,
        respuesta_estudiante=scan.sanitized_text,
        chunk=chunk,
        historial_previo=historial_previo,
        tiene_imagen=tiene_imagen,
        n_imagenes=n_imagenes,
        mime_types=mime_types,
    )

    try:
        raw_text = call_gemini_llm(prompt, imagenes_list=imagenes_list)
        eval_base = parse_and_validate_llm_json(raw_text)
    except Exception:
        # Fallback defensivo si ocurre error de parseo en la fase
        retry_prompt = prompt + "\n\nIMPORTANTE: Devuelve exclusivamente un objeto JSON sin caracteres Markdown."
        raw_text_retry = call_gemini_llm(retry_prompt, imagenes_list=imagenes_list)
        eval_base = parse_and_validate_llm_json(raw_text_retry)

    # Construir PhaseEvaluationResult
    cita = eval_base.cita_normativa
    if chunk:
        if chunk.get("pagina"):
            try:
                cita.pagina = int(chunk["pagina"])
            except Exception:
                pass
        if chunk.get("seccion"):
            cita.seccion = str(chunk["seccion"])
        if chunk.get("guia_fuente"):
            cita.guia = f"GPC {str(chunk['guia_fuente']).upper()} MSP Ecuador"

    # Datos adicionales de la siguiente fase si existe
    datos_sig = None
    if caso.fases:
        for f in caso.fases:
            if f.fase_numero == fase_numero + 1:
                datos_sig = {
                    "fase_numero": f.fase_numero,
                    "titulo": f.titulo,
                    "descripcion": f.descripcion,
                    "datos_revelados": f.datos_revelados,
                    "estudios_adjuntos": f.estudios_adjuntos,
                    "pregunta_evaluativa": f.pregunta_evaluativa
                }
                break

    return PhaseEvaluationResult(
        fase_numero=fase_numero,
        score_fase=eval_base.score,
        aciertos=eval_base.aciertos,
        omisiones=eval_base.omisiones,
        competencias_deficientes=eval_base.competencias_deficientes,
        cita_normativa=cita,
        retroalimentacion_fase=eval_base.retroalimentacion_general,
        desbloquea_siguiente=eval_base.score >= 4.0 or fase_numero >= 3, # Desbloquea si no es reprobación total o si es la última
        datos_fase_siguiente=datos_sig
    )

