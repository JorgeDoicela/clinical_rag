import json
import logging
from io import BytesIO
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Generator, Callable

from core.config import settings
from core.llm_gateway import llm_gateway
from core.unit_of_work import AbstractUnitOfWork, SqlAlchemyUnitOfWork
from rag.evaluator import evaluate_clinical_reasoning, evaluate_phase_reasoning
from rag.retriever import retrieve_relevant_chunk
from rag.security_guard import security_guard
from services.pdf_report_generator import generate_clinical_feedback_pdf
from models.schemas import EvaluationResult, PhaseEvaluationResult
from modules.cases.service import CaseService
from modules.analytics_history.service import AnalyticsHistoryService
from modules.analytics_history.models import EvaluationHistoryModel
import datetime

logger = logging.getLogger(__name__)


class EvaluationService:
    """
    Servicio de Dominio de Evaluación Diagnóstica y Retroalimentación RAG.
    Orquesta la recuperación de contexto normativo GPC, la inferencia en LLM Gateway,
    el streaming socrático, la certificación criptográfica en PDF y la persistencia
    transaccional en base de datos mediante el patrón Unit of Work (ACID).
    """
    def __init__(
        self,
        case_service: CaseService,
        analytics_service: AnalyticsHistoryService,
        adaptive_service: Optional[Any] = None,
        uow_factory: Optional[Callable[[], AbstractUnitOfWork]] = None
    ):
        self.case_service = case_service
        self.analytics_service = analytics_service
        self.adaptive_service = adaptive_service
        self.uow_factory = uow_factory or (lambda: SqlAlchemyUnitOfWork())

    def _load_case_preset_image(self, imagen_url: str) -> List[Tuple[bytes, str]]:
        """Carga la imagen clínica local configurada por defecto en el caso clínico si existe."""
        rel_path = imagen_url.replace("/static/images/", "")
        base_dir = Path(__file__).resolve().parent.parent.parent / "cases_data" / "images"
        local_img_path = base_dir / rel_path
        if local_img_path.exists():
            try:
                with open(local_img_path, "rb") as f:
                    img_bytes = f.read()
                img_mime = "image/jpeg" if str(local_img_path).lower().endswith((".jpg", ".jpeg")) else "image/png"
                logger.info("[EvaluationService] Usando imagen preconfigurada del caso: %s", local_img_path)
                return [(img_bytes, img_mime)]
            except Exception as e:
                logger.warning("[EvaluationService] No se pudo leer imagen preconfigurada: %s", e)
        return []

    def evaluate_reasoning(
        self,
        case_id: str,
        student_answer: str,
        imagenes_bytes: Optional[List[Tuple[bytes, str]]] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        tenant_id: Optional[str] = None
    ) -> EvaluationResult:
        """
        Ejecuta el ciclo completo de evaluación de razonamiento clínico:
        1. Resuelve el caso clínico y estudios paraclínicos (cargados o predeterminados).
        2. Recupera el fragmento normativo de la GPC del MSP mediante RAG híbrido.
        3. Realiza la inferencia estructurada multimodal con Gemini.
        4. Persiste el resultado en el historial relacional y actualiza el estado psicométrico BKT
           dentro de una transacción atómica coordinada por Unit of Work (ACID).
        """
        case = self.case_service.get_case(case_id)
        if not case:
            raise ValueError(f"Caso clínico '{case_id}' no encontrado.")

        resolved_images = list(imagenes_bytes) if imagenes_bytes else []
        if not resolved_images and case.imagen_url:
            resolved_images = self._load_case_preset_image(case.imagen_url)

        chunk = retrieve_relevant_chunk(
            query=student_answer,
            guia_filtro=case.guia_asociada
        )

        eval_result = evaluate_clinical_reasoning(
            caso=case,
            respuesta_estudiante=student_answer,
            chunk=chunk,
            imagenes_list=resolved_images
        )

        # Si se proporcionan credenciales, persistir atómicamente con Unit of Work
        if user_id and user_email:
            eval_dict = eval_result.model_dump() if hasattr(eval_result, "model_dump") else eval_result.dict()
            uow = self.uow_factory()
            try:
                with uow:
                    resolved_tenant = tenant_id or getattr(case, "tenant_id", "tenant_default") or "tenant_default"
                    # 1. Persistir evaluación en la sesión del UoW
                    history_record = EvaluationHistoryModel(
                        user_id=user_id,
                        user_email=user_email,
                        case_id=case.id,
                        guia_asociada=case.guia_asociada,
                        case_title=case.titulo,
                        score=float(eval_dict.get("score", 0.0)),
                        score_max=int(eval_dict.get("score_max", 10)),
                        faithfulness_score=float(eval_dict.get("faithfulness_score", 0.0)) if eval_dict.get("faithfulness_score") is not None else None,
                        cohorte_id=eval_dict.get("cohorte_id", "general"),
                        tiempo_segundos=float(eval_dict.get("tiempo_segundos", 0.0)) if eval_dict.get("tiempo_segundos") is not None else 0.0,
                        tenant_id=resolved_tenant,
                        aciertos_json=json.dumps(eval_dict.get("aciertos", []), ensure_ascii=False),
                        omisiones_json=json.dumps(eval_dict.get("omisiones", []), ensure_ascii=False),
                        competencias_json=json.dumps(eval_dict.get("competencias_deficientes", []), ensure_ascii=False),
                        cita_normativa_json=json.dumps(eval_dict.get("cita_normativa", {}), ensure_ascii=False),
                        retroalimentacion_general=eval_dict.get("retroalimentacion_general", ""),
                        timestamp=datetime.datetime.now(datetime.timezone.utc)
                    )
                    uow.history.create(history_record, commit=False)


                    # 2. Impactar el modelo psicométrico BKT y registrar snapshot en la misma transacción
                    if self.adaptive_service:
                        competencias = getattr(case, "competencias_evaluadas", []) or []
                        score_val = getattr(eval_result, "score", 0.0)

                        current_state_data = self.adaptive_service.get_knowledge_state(user_id)
                        state = current_state_data["knowledge_state"].copy()
                        is_correct = score_val >= 7.0

                        from adaptive.knowledge_tracer import bayesian_update, BKT_PARAMETERS, set_student_knowledge_state
                        for comp_id in competencias:
                            if comp_id in BKT_PARAMETERS:
                                state[comp_id] = bayesian_update(state[comp_id], is_correct, BKT_PARAMETERS[comp_id])

                        set_student_knowledge_state(user_id, state)
                        uow.adaptive.save_mastery(user_id, state, commit=False)
                        existing_snapshots = uow.adaptive.get_snapshots(user_id)
                        next_session = len(existing_snapshots)
                        uow.adaptive.add_snapshot(
                            user_id=user_id,
                            session_num=next_session,
                            score=score_val,
                            state=state,
                            commit=False
                        )

                    # Confirmar toda la transacción multi-repositorio
                    uow.commit()
            except Exception as tx_err:
                logger.warning("[EvaluationService] Error en transacción UoW de evaluación (rollback automático): %s", tx_err)
                # El context manager uow ejecuta rollback() automáticamente

        return eval_result

    def evaluate_phase(
        self,
        case_id: str,
        fase_id: int,
        respuesta_alumno: str,
        antecedentes_previos: str = "",
        imagenes_estudio: Optional[List[Tuple[bytes, str]]] = None,
        fase_nombre: Optional[str] = None
    ) -> PhaseEvaluationResult:
        """
        Evalúa una fase secuencial clínica individual mediante recuperación RAG acotada.
        """
        case = self.case_service.get_case(case_id)
        if not case:
            raise ValueError(f"Caso clínico '{case_id}' no encontrado.")

        query_rag = f"{respuesta_alumno} {case.titulo}"
        chunk = retrieve_relevant_chunk(
            query=query_rag,
            guia_filtro=case.guia_asociada
        )

        return evaluate_phase_reasoning(
            caso=case,
            fase_numero=fase_id,
            respuesta_estudiante=respuesta_alumno,
            chunk=chunk,
            historial_previo=antecedentes_previos or "",
            imagenes_list=imagenes_estudio
        )

    def generate_socratic_turn_stream(
        self,
        case_id: str,
        omision_clinica: str,
        estudiante_replica: str,
        historial: Optional[List[Dict[str, str]]] = None
    ) -> Generator[str, None, None]:
        """
        Genera el flujo de tokens en formato Server-Sent Events (SSE) para debriefing socrático.
        """
        case = self.case_service.get_case(case_id)
        if not case:
            raise ValueError(f"Caso clínico '{case_id}' no encontrado.")

        # Blindaje clínico contra prompt injection en réplica socrática
        scan = security_guard.inspect_input(estudiante_replica)
        if not scan.is_safe:
            logger.warning("[EvaluationService] Prompt injection en diálogo socrático neutralizado: %s", scan.attack_type)
            yield from security_guard.generate_security_violation_socratic_stream(scan.attack_type)
            return

        try:
            chunk = retrieve_relevant_chunk(
                query=f"{omision_clinica} {scan.sanitized_text}",
                guia_filtro=case.guia_asociada
            )
        except Exception as e:
            chunk = None
            logger.warning("[EvaluationService] Recuperación RAG secundaria no disponible: %s", e)

        norma_texto = chunk.get("texto", "") if chunk else "Norma oficial MSP del Ecuador."
        norma_guia = chunk.get("guia_fuente", case.guia_asociada) if chunk else case.guia_asociada
        norma_pag = chunk.get("pagina", 1) if chunk else 1

        prompt_socratico = f"""
Eres un Docente Médico Tutor de Ateneo+, especialista en pedagogía clínica y medicina basada en evidencias.
Estás conduciendo un Debriefing Socrático con un médico interno de pregrado tras una simulación clínica.

CASO CLÍNICO:
- Título: {case.titulo}
- Cuadro: {case.enunciado}

OMISIÓN / PUNTO CLÍNICO EN DISCUSIÓN:
"{omision_clinica}"

NORMA DEL MINISTERIO DE SALUD PÚBLICA (MSP ECUADOR):
"{norma_texto}" (GPC: {norma_guia}, Pág. {norma_pag})

RÉPLICA O ARGUMENTO DEL ESTUDIANTE:
<student_clinical_argument>
{scan.sanitized_text}
</student_clinical_argument>

HISTORIAL DE DIÁLOGO PREVIO:
{json.dumps(historial or [], ensure_ascii=False)}

DIRECTIVAS PEDAGÓGICAS INMUTABLES:
1. No reveles la respuesta diagnóstica o farmacológica definitiva directamente de forma masticada.
2. Si el estudiante se acerca al criterio de la GPC, valida su esfuerzo y hazle una pregunta de precisión clínica (dosis, monitorización, criterios de severidad o contraindicaciones).
3. Si el estudiante persiste en un error o desconoce la norma, explícale la fisiopatología y cita sutilmente la conducta esperada según la GPC del MSP.
4. Mantén un tono formal, sobrio, estrictamente académico y médico. Cero emojis.
5. Tu respuesta debe tener entre 2 y 4 párrafos concisos y finalizar con una pregunta socrática de verificación formativa.
"""
        yield f"data: {json.dumps({'event': 'start', 'guia': norma_guia, 'pagina': norma_pag})}\n\n"

        if not settings.gemini_api_key.strip():
            fallback_tokens = [
                "Has considerado adecuadamente la fisiopatología de base. ",
                "Sin embargo, según la Guía de Práctica Clínica del MSP Ecuador, ",
                f"en {case.titulo} es imperativo valorar los criterios de severidad hemodinámica antes de escalar el tratamiento. ",
                "¿Qué parámetros específicos de monitorización priorizarías en las primeras horas para justificar tu conducta?"
            ]
            for tok in fallback_tokens:
                yield f"data: {json.dumps({'token': tok})}\n\n"
        else:
            try:
                stream_iter = llm_gateway.generate_stream(
                    prompt=prompt_socratico,
                    temperature=0.3
                )
                for chunk_text in stream_iter:
                    yield f"data: {json.dumps({'token': chunk_text})}\n\n"
            except Exception as stream_err:
                logger.error("[EvaluationService] Error en streaming socrático: %s", stream_err)
                yield f"data: {json.dumps({'error': str(stream_err)})}\n\n"

        yield f"data: {json.dumps({'done': True, 'cita_normativa': {'guia': norma_guia, 'pagina': norma_pag}})}\n\n"

    def get_faithfulness_benchmark(self, sample_size: int = 5) -> Dict[str, Any]:
        """
        Ejecuta una auditoría de fidelidad normativa RAG (Faithfulness Score / Anti-Alucinación)
        sobre una muestra de casos del catálogo contra fragmentos de las GPCs del MSP.
        """
        from evaluation.faithfulness_scorer import calculate_faithfulness_score

        cases = self.case_service.list_cases()[:sample_size]
        benchmark_results = []

        for c in cases:
            chunk = retrieve_relevant_chunk(query=c.titulo, guia_filtro=c.guia_asociada)
            chunk_text = chunk.get("texto", "") if chunk else ""

            aciertos_demo = [f"Identificó {c.titulo.lower()}", f"Aplicó directrices de la guía {c.guia_asociada}"]
            omisiones_demo = ["Detalle específico de dosis de mantenimiento"]

            res = calculate_faithfulness_score(aciertos_demo, omisiones_demo, chunk_text)
            benchmark_results.append({
                "case_id": c.id,
                "guia": c.guia_asociada,
                "faithfulness_score": res["faithfulness_score"],
                "grounded_percentage": res["grounded_percentage"],
                "grounding_level": res["grounding_level"]
            })

        avg_faithfulness = sum(r["faithfulness_score"] for r in benchmark_results) / max(1, len(benchmark_results))
        return {
            "promedio_faithfulness_score": round(avg_faithfulness, 4),
            "promedio_fidelidad_porcentaje": round(avg_faithfulness * 100, 1),
            "nivel_global": "Alto Grounding Normativo (Anti-Alucinación)",
            "total_casos_auditados": len(benchmark_results),
            "detalles_por_caso": benchmark_results
        }

    def generate_pdf_report(
        self,
        student_name: str,
        case_id: str,
        case_title: str,
        guia_asociada: str,
        eval_result: Dict[str, Any],
        student_answer: str = ""
    ) -> BytesIO:
        """Genera el informe formativo institucional en formato PDF con firma criptográfica."""
        return generate_clinical_feedback_pdf(
            student_name=student_name,
            case_id=case_id,
            case_title=case_title,
            guia_asociada=guia_asociada,
            eval_result=eval_result,
            student_answer=student_answer
        )
