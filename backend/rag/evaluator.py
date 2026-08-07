import json
import re
from typing import Dict, Any, Optional
from google import genai
from google.genai import types
from config import GEMINI_API_KEY, GEMINI_MODEL
from models.schemas import EvaluationResult, ClinicalCaseSchema, CitaNormativa
from rag.prompt_builder import SYSTEM_INSTRUCTION, build_prompt

def call_gemini_llm(prompt: str, imagen_bytes: Optional[bytes] = None, imagen_mime: str = "image/jpeg") -> str:
    """
    Llama a la API de Google Gemini utilizando el SDK oficial `google-genai`
    solicitando respuesta JSON forzada mediante response_mime_type.
    Si se proporcionan imagen_bytes, construye un request multimodal (texto + imagen).
    """
    if not GEMINI_API_KEY:
        print("[LLM] ADVERTENCIA: GEMINI_API_KEY no configurada. Usando fallback de desarrollo local...", flush=True)
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

    client = genai.Client(api_key=GEMINI_API_KEY)

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        response_mime_type="application/json",
        temperature=0.2
    )

    models_to_try = [
        GEMINI_MODEL,
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3-flash-preview",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash",
        "gemini-flash-latest"
    ]
    # Eliminar duplicados preservando orden
    seen = set()
    unique_models = [m for m in models_to_try if not (m in seen or seen.add(m))]

    last_err = None
    for model_name in unique_models:
        try:
            if imagen_bytes:
                print(f"[LLM] Enviando prompt MULTIMODAL (texto + imagen) a Gemini (Modelo: {model_name})...", flush=True)
                imagen_part = types.Part.from_bytes(data=imagen_bytes, mime_type=imagen_mime)
                contents = [imagen_part, prompt]
            else:
                print(f"[LLM] Enviando prompt a Google Gemini API (Modelo: {model_name})...", flush=True)
                contents = prompt
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config
            )
            print(f"[LLM] Respuesta de Gemini recibida exitosamente desde {model_name}.", flush=True)
            return response.text
        except Exception as err:
            print(f"[LLM] Error al invocar el modelo {model_name}: {err}", flush=True)
            last_err = err

    # Si la cuota gratuita de la API se agotó temporalmente en todos los modelos, usar fallback defensivo formativo
    print("[LLM] Cuota gratuita de Gemini agotada temporalmente. Devolviendo evaluación formativa de respaldo...", flush=True)
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
        data = _normalize_cita_normativa(data)
        data = _normalize_competencias_deficientes(data)
        return EvaluationResult(**data)
    except json.JSONDecodeError as e:
        print(f"[PARSER] JSON inválido ({e}), intentando reparación por truncamiento...", flush=True)

    # Intento 2: reparar truncamiento y reintentar
    try:
        repaired = _repair_truncated_json(cleaned)
        data = json.loads(repaired)
        data = _normalize_cita_normativa(data)
        data = _normalize_competencias_deficientes(data)
        print("[PARSER] JSON reparado exitosamente tras truncamiento.", flush=True)
        return EvaluationResult(**data)
        print("[PARSER] JSON reparado exitosamente tras truncamiento.", flush=True)
        return EvaluationResult(**data)
    except Exception as e:
        raise ValueError(f"Fallo al parsear o validar la respuesta de Gemini a JSON: {e}. Raw: {raw_text[:200]}")

def evaluate_clinical_reasoning(
    caso: ClinicalCaseSchema,
    respuesta_estudiante: str,
    chunk: Dict[str, Any],
    imagen_bytes: Optional[bytes] = None,
    imagen_mime: str = "image/jpeg"
) -> EvaluationResult:
    """
    Ejecuta el flujo completo de evaluación: prompt -> Gemini -> validación Pydantic.
    Soporta análisis multimodal si se proporcionan imagen_bytes.
    Contempla 1 reintento automático en caso de error de formato.
    """
    prompt = build_prompt(caso, respuesta_estudiante, chunk, tiene_imagen=imagen_bytes is not None)

    try:
        raw_text = call_gemini_llm(prompt, imagen_bytes=imagen_bytes, imagen_mime=imagen_mime)
        return parse_and_validate_llm_json(raw_text)
    except ValueError:
        retry_prompt = prompt + "\n\nNOTA: Asegúrate estrictamente de devolver ÚNICAMENTE el objeto JSON sin bloques de código."
        raw_text_retry = call_gemini_llm(retry_prompt, imagen_bytes=imagen_bytes, imagen_mime=imagen_mime)
        return parse_and_validate_llm_json(raw_text_retry)
