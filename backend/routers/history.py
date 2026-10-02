from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import Optional, Dict, Any, List
import io

from modules.analytics_history.dependencies import get_analytics_service
from modules.analytics_history.service import AnalyticsHistoryService
from modules.evaluation.dependencies import get_evaluation_service
from modules.evaluation.service import EvaluationService
from auth.security import get_optional_current_user, UserResponse
from core.background_worker import background_worker, TaskStatus
from services.pdf_report_generator import generate_cohort_analytics_pdf, generate_clinical_feedback_pdf

router = APIRouter(prefix="/api/history", tags=["Historial y Analítica de Razonamiento"])


@router.get("", response_model=List[Dict[str, Any]])
async def get_history(
    user_id: Optional[str] = Query(None, description="ID o email del usuario opcional"),
    tenant_id: Optional[str] = Query(None, description="ID del tenant opcional"),
    current_user: Optional[UserResponse] = Depends(get_optional_current_user),
    analytics_service: AnalyticsHistoryService = Depends(get_analytics_service)
):
    """
    Retorna la lista del historial de evaluaciones del estudiante.
    """
    target_user = user_id or (current_user.email if current_user else "usr_alumno_001")
    resolved_tenant = tenant_id or (current_user.tenant_id if current_user else None)
    return analytics_service.get_user_history(target_user, tenant_id=resolved_tenant)

@router.get("/trends", response_model=Dict[str, Any])
async def get_trends(
    user_id: Optional[str] = Query(None, description="ID o email del usuario opcional"),
    tenant_id: Optional[str] = Query(None, description="ID del tenant opcional"),
    current_user: Optional[UserResponse] = Depends(get_optional_current_user),
    analytics_service: AnalyticsHistoryService = Depends(get_analytics_service)
):
    """
    Retorna las métricas de analítica de tendencias:
    - Gráfica de score en el tiempo por área de GPC.
    - Punto débil principal detectado ("Tu punto débil: ...").
    - Lista de patrones de omisiones más frecuentes.
    - Radar de competencias por eje clínico.
    """
    target_user = user_id or (current_user.email if current_user else "usr_alumno_001")
    resolved_tenant = tenant_id or (current_user.tenant_id if current_user else None)
    return analytics_service.get_student_advanced_analytics(target_user, tenant_id=resolved_tenant)

@router.get("/coordinator-analytics", response_model=Dict[str, Any])
async def get_coordinator_analytics(
    cohorte_id: Optional[str] = Query(None, description="ID de la cohorte académica opcional"),
    tenant_id: Optional[str] = Query(None, description="ID de la institución o tenant opcional"),
    current_user: Optional[UserResponse] = Depends(get_optional_current_user),
    analytics_service: AnalyticsHistoryService = Depends(get_analytics_service)
):
    """
    Retorna el reporte de Inteligencia Institucional B2B para Coordinación Académica:
    - Porcentaje de falla por módulo GPC en la cohorte (ej: 'El 68% de tus estudiantes falla en...').
    - Desglose de brechas masivas por módulo y ranking de deficiencias institucionales.
    - Aislamiento estricto por institución/facultad médica.
    """
    resolved_tenant = tenant_id or (current_user.tenant_id if current_user else None)
    return analytics_service.analyze_coordinator_cohort_analytics(cohorte_id=cohorte_id, tenant_id=resolved_tenant)


@router.post("/export-pdf")
async def export_pdf_history_alias(req: Dict[str, Any]):
    """
    Alias defensivo de generación de PDF en /api/history/export-pdf.
    """
    from fastapi.responses import StreamingResponse
    from fastapi import HTTPException
    from services.pdf_report_generator import generate_clinical_feedback_pdf

    try:
        eval_result = req.get("eval_result") or {
            "score": req.get("score", 0),
            "score_max": req.get("score_max", 10),
            "aciertos": req.get("aciertos", []),
            "omisiones": req.get("omisiones", []),
            "competencias_deficientes": req.get("competencias_deficientes", []),
            "cita_normativa": {"guia": req.get("guia_asociada", "MSP"), "texto_relevante": req.get("fragmento_gpc", "")},
            "retroalimentacion_general": req.get("retroalimentacion", "")
        }

        pdf_buffer = generate_clinical_feedback_pdf(
            student_name=req.get("student_name") or req.get("estudiante_nombre") or "Estudiante de Medicina",
            case_title=req.get("case_title") or "Caso Clínico MSP",
            case_id=req.get("case_id") or "caso_evaluado",
            guia_asociada=req.get("guia_asociada") or "Norma Oficial MSP Ecuador",
            eval_result=eval_result,
            student_answer=req.get("student_answer") or ""
        )

        filename = f"Informe_Clinico_Ateneo_{req.get('case_id', 'evaluacion')}.pdf"
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF institucional: {str(e)}")


@router.post("/export-cohort-pdf-async", status_code=status.HTTP_202_ACCEPTED)
async def export_cohort_pdf_async(
    cohorte_id: Optional[str] = Query("cohorte_2026_medicina", description="ID de la cohorte académica"),
    tenant_id: Optional[str] = Query(None, description="ID institucional opcional"),
    current_user: Optional[UserResponse] = Depends(get_optional_current_user),
    analytics_service: AnalyticsHistoryService = Depends(get_analytics_service)
):
    """
    Encola la generación masiva del reporte de cohorte en un worker asíncrono en segundo plano.
    Retorna HTTP 202 Accepted con el task_id para consulta periódica sin bloquear la API.
    """
    resolved_tenant = tenant_id or (current_user.tenant_id if current_user else "tenant_default")
    analytics_data = analytics_service.analyze_coordinator_cohort_analytics(
        cohorte_id=cohorte_id,
        tenant_id=resolved_tenant
    )
    tenant_name = "Facultad de Medicina (MSP Ecuador)" if resolved_tenant == "tenant_default" else f"Institución {resolved_tenant}"
    filename = f"Informe_Cohorte_{cohorte_id}.pdf"

    task_id = await background_worker.submit_task(
        task_type="cohort_pdf_report",
        fn=generate_cohort_analytics_pdf,
        cohorte_id=cohorte_id,
        tenant_name=tenant_name,
        analytics_data=analytics_data,
        filename=filename
    )
    return {
        "task_id": task_id,
        "status": "PENDING",
        "check_status_url": f"/api/history/tasks/{task_id}",
        "download_url": f"/api/history/tasks/{task_id}/download",
        "message": "Generación de reporte de cohorte encolada exitosamente."
    }


@router.get("/tasks/{task_id}")
async def get_history_task_status(task_id: str):
    """
    Consulta el estado de una tarea en segundo plano de analíticas o reportes.
    """
    task = background_worker.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarea en segundo plano no encontrada.")
    res = task.to_dict()
    res["download_url"] = f"/api/history/tasks/{task_id}/download"
    return res


@router.get("/tasks/{task_id}/download")
async def download_history_task_artifact(task_id: str):
    """
    Descarga el informe de cohorte en PDF generado por la tarea asíncrona.
    """
    task = background_worker.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarea en segundo plano no encontrada.")
    if task.status != TaskStatus.COMPLETED:
        raise HTTPException(status_code=400, detail=f"La tarea está en estado '{task.status.value}' y aún no ha finalizado.")
    artifact = background_worker.get_artifact(task_id)
    if not artifact:
        raise HTTPException(status_code=404, detail="El artefacto binario generado no está disponible.")
    return StreamingResponse(
        io.BytesIO(artifact),
        media_type=task.media_type,
        headers={"Content-Disposition": f'attachment; filename="{task.filename}"'}
    )


@router.get("/ibf-cohort", response_model=Dict[str, Any])
async def get_cohort_ibf_analytics(
    room_id: Optional[str] = Query(None, description="ID de sala o cohorte opcional"),
    analytics_service: AnalyticsHistoryService = Depends(get_analytics_service)
):
    """
    Retorna el cálculo formal del Índice de Brecha Formativa (IBF) por cohorte y alertas tempranas docentes.
    """
    from models.learning_analytics import calculate_cohort_ibf
    
    # Obtener historial general de evaluaciones mediante el servicio desacoplado
    history = analytics_service.get_user_history("usr_alumno_001")
    return calculate_cohort_ibf(history)

@router.get("/faithfulness-benchmark", response_model=Dict[str, Any])
async def get_faithfulness_benchmark(
    evaluation_service: EvaluationService = Depends(get_evaluation_service)
):
    """
    Ejecuta una auditoría de fidelidad normativa RAG (Faithfulness Score / Anti-Alucinación)
    sobre casos del catálogo contra fragmentos de las GPCs del MSP delegando en EvaluationService.
    """
    return evaluation_service.get_faithfulness_benchmark(sample_size=5)


