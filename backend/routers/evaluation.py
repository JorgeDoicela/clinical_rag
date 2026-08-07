from fastapi import APIRouter, HTTPException, Form, File, UploadFile
from typing import Optional
from models.clinical_case import get_case_by_id
from rag.retriever import retrieve_relevant_chunk
from rag.evaluator import evaluate_clinical_reasoning
from models.schemas import EvaluationResult

router = APIRouter(prefix="/api/evaluate", tags=["Evaluación RAG"])

@router.post("", response_model=EvaluationResult)
async def evaluate_response(
    case_id: str = Form(...),
    respuesta_estudiante: str = Form(...),
    imagen: Optional[UploadFile] = File(None)
):
    """
    Recibe la respuesta del estudiante y opcionalmente una imagen clínica (hemograma,
    radiografía, ECG, etc.), recupera el fragmento normativo de la GPC del MSP
    y ejecuta la evaluación multimodal con Gemini devolviendo retroalimentación estructurada.
    """
    caso = get_case_by_id(case_id)
    if not caso:
        raise HTTPException(status_code=404, detail=f"Caso clínico '{case_id}' no encontrado.")

    if not respuesta_estudiante.strip():
        raise HTTPException(status_code=400, detail="La respuesta del estudiante no puede estar vacía.")

    # Leer imagen si fue adjuntada
    imagen_bytes = None
    imagen_mime = "image/jpeg"
    if imagen and imagen.filename:
        imagen_bytes = await imagen.read()
        imagen_mime = imagen.content_type or "image/jpeg"
        print(f"[ROUTER] Imagen recibida: {imagen.filename} ({imagen_mime}, {len(imagen_bytes)} bytes)", flush=True)

    try:
        chunk = retrieve_relevant_chunk(
            query=respuesta_estudiante,
            guia_filtro=caso.guia_asociada
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en la recuperación RAG: {str(e)}")

    try:
        resultado = evaluate_clinical_reasoning(
            caso=caso,
            respuesta_estudiante=respuesta_estudiante,
            chunk=chunk,
            imagen_bytes=imagen_bytes,
            imagen_mime=imagen_mime
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error durante el procesamiento del LLM: {str(e)}")
