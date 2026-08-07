from fastapi import APIRouter, HTTPException
from models.schemas import EvaluationRequest, EvaluationResult
from models.clinical_case import get_case_by_id
from rag.retriever import retrieve_relevant_chunk
from rag.evaluator import evaluate_clinical_reasoning

router = APIRouter(prefix="/api/evaluate", tags=["Evaluación RAG"])

@router.post("", response_model=EvaluationResult)
async def evaluate_response(req: EvaluationRequest):
    """
    Recibe la respuesta del estudiante, recupera el fragmento normativo de la GPC del MSP
    y ejecuta la evaluación con el modelo Gemini devuelviendo retroalimentación estructurada.
    """
    caso = get_case_by_id(req.case_id)
    if not caso:
        raise HTTPException(status_code=404, detail=f"Caso clínico '{req.case_id}' no encontrado.")

    if not req.respuesta_estudiante.strip():
        raise HTTPException(status_code=400, detail="La respuesta del estudiante no puede estar vacía.")

    try:
        chunk = retrieve_relevant_chunk(
            query=req.respuesta_estudiante,
            guia_filtro=caso.guia_asociada
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en la recuperación RAG: {str(e)}")

    try:
        resultado = evaluate_clinical_reasoning(
            caso=caso,
            respuesta_estudiante=req.respuesta_estudiante,
            chunk=chunk
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error durante el procesamiento del LLM: {str(e)}")
