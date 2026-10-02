import json
import logging
from io import BytesIO
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from rag.evaluator import evaluate_clinical_reasoning, evaluate_phase_reasoning
from rag.retriever import retrieve_relevant_chunk
from services.pdf_report_generator import generate_clinical_feedback_pdf
from models.schemas import EvaluationResult, PhaseEvaluationResult
from modules.cases.service import CaseService
from modules.analytics_history.service import AnalyticsHistoryService

logger = logging.getLogger(__name__)



class EvaluationService:
    """
    Servicio de Dominio de Evaluación Diagnóstica y Retroalimentación RAG.
    Orquesta la recuperación de contexto GPC, la inferencia en LLM Gateway,
    la certificación criptográfica en PDF y la persistencia del resultado.
    """
    def __init__(
        self,
        case_service: CaseService,
        analytics_service: AnalyticsHistoryService,
        adaptive_service: Optional[Any] = None
    ):
        self.case_service = case_service
        self.analytics_service = analytics_service
        self.adaptive_service = adaptive_service

    def evaluate_reasoning(
        self,
        case_id: str,
        student_answer: str,
        imagenes_bytes: Optional[List[Tuple[bytes, str]]] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None
    ) -> EvaluationResult:
        case = self.case_service.get_case(case_id)
        if not case:
            raise ValueError(f"Caso clínico '{case_id}' no encontrado.")

        eval_result = evaluate_clinical_reasoning(
            caso=case,
            respuesta_alumno=student_answer,
            imagenes_estudio=imagenes_bytes
        )

        # Si se proporcionan credenciales, persistir el intento evaluativo de forma automática
        if user_id and user_email:
            self.analytics_service.save_evaluation(
                user_id=user_id,
                user_email=user_email,
                case_id=case.id,
                guia_asociada=case.guia_asociada,
                case_title=case.titulo,
                eval_result=eval_result.model_dump() if hasattr(eval_result, "model_dump") else eval_result.dict()
            )

            # Impactar el modelo psicométrico BKT de forma transaccional y coherente
            if self.adaptive_service:
                competencias = getattr(case, "competencias_evaluadas", []) or []
                score_val = getattr(eval_result, "score", 0.0)
                try:
                    self.adaptive_service.record_evaluation_impact(user_id, competencias, score_val)
                except Exception as exc:
                    logger.warning(
                        "[EvaluationService] No se pudo registrar el impacto BKT para estudiante '%s': %s",
                        user_id,
                        exc
                    )

        return eval_result

    def evaluate_phase(
        self,
        case_id: str,
        fase_id: int,
        fase_nombre: str,
        respuesta_alumno: str,
        antecedentes_previos: str = "",
        imagenes_estudio: Optional[List[Tuple[bytes, str]]] = None
    ) -> PhaseEvaluationResult:
        case = self.case_service.get_case(case_id)
        if not case:
            raise ValueError(f"Caso clínico '{case_id}' no encontrado.")

        return evaluate_phase_reasoning(
            caso=case,
            fase_id=fase_id,
            fase_nombre=fase_nombre,
            respuesta_alumno=respuesta_alumno,
            antecedentes_previos=antecedentes_previos,
            imagenes_estudio=imagenes_estudio
        )

    def generate_pdf_report(
        self,
        student_name: str,
        case_id: str,
        case_title: str,
        guia_asociada: str,
        eval_result: Dict[str, Any],
        student_answer: str = ""
    ) -> BytesIO:
        return generate_clinical_feedback_pdf(
            student_name=student_name,
            case_id=case_id,
            case_title=case_title,
            guia_asociada=guia_asociada,
            eval_result=eval_result,
            student_answer=student_answer
        )
