import json
import re
from typing import Dict, Any
from google import genai
from google.genai import types
from config import GEMINI_API_KEY, GEMINI_MODEL
from models.schemas import EvaluationResult, ClinicalCaseSchema, CitaNormativa
from rag.prompt_builder import SYSTEM_INSTRUCTION, build_prompt

def call_gemini_llm(prompt: str) -> str:
    """
    Llama a la API de Google Gemini utilizando el SDK oficial `google-genai`
    solicitando respuesta JSON forzada mediante response_mime_type.
    """
    if not GEMINI_API_KEY:
        # Fallback de prueba para desarrollo local sin API Key configurada
        return json.dumps({
            "score": 8.0,
            "score_max": 10,
            "aciertos": [
                "Identificó correctamente el diagnóstico principal y la severidad del cuadro clínico."
            ],
            "omisiones": [
                "Faltó precisar la velocidad de infusión del esquema de líquidos de la GPC."
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

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=config
    )

    return response.text

def parse_and_validate_llm_json(raw_text: str) -> EvaluationResult:
    """
    Limpia defensivamente y valida mediante Pydantic el JSON devuelto por Gemini.
    """
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned)
    cleaned = cleaned.strip()

    try:
        data = json.loads(cleaned)
        return EvaluationResult(**data)
    except (json.JSONDecodeError, Exception) as e:
        raise ValueError(f"Fallo al parsear o validar la respuesta de Gemini a JSON: {e}. Raw: {raw_text[:200]}")

def evaluate_clinical_reasoning(caso: ClinicalCaseSchema, respuesta_estudiante: str, chunk: Dict[str, Any]) -> EvaluationResult:
    """
    Ejecuta el flujo completo de evaluación: prompt -> Gemini -> validación Pydantic.
    Contempla 1 reintento automático en caso de error de formato.
    """
    prompt = build_prompt(caso, respuesta_estudiante, chunk)
    
    try:
        raw_text = call_gemini_llm(prompt)
        return parse_and_validate_llm_json(raw_text)
    except ValueError:
        # Reintento con instrucción adicional defensiva
        retry_prompt = prompt + "\n\nNOTA: Asegúrate estrictamente de devolver ÚNICAMENTE el objeto JSON sin bloques de código."
        raw_text_retry = call_gemini_llm(retry_prompt)
        return parse_and_validate_llm_json(raw_text_retry)
