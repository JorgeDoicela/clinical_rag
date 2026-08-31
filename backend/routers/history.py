from fastapi import APIRouter, Depends, Query
from typing import Optional, Dict, Any, List
from models.history_db import get_user_evaluation_history, analyze_user_trends, analyze_coordinator_cohort_analytics
from auth.security import get_current_user, UserResponse

router = APIRouter(prefix="/api/history", tags=["Historial y Analítica de Razonamiento"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_history(
    user_id: Optional[str] = Query(None, description="ID o email del usuario opcional"),
    current_user: Optional[UserResponse] = Depends(get_current_user)
):
    """
    Retorna la lista del historial de evaluaciones del estudiante.
    """
    target_user = user_id or (current_user.email if current_user else "usr_alumno_001")
    return get_user_evaluation_history(target_user)

@router.get("/trends", response_model=Dict[str, Any])
async def get_trends(
    user_id: Optional[str] = Query(None, description="ID o email del usuario opcional"),
    current_user: Optional[UserResponse] = Depends(get_current_user)
):
    """
    Retorna las métricas de analítica de tendencias:
    - Gráfica de score en el tiempo por área de GPC.
    - Punto débil principal detectado ("Tu punto débil: ...").
    - Lista de patrones de omisiones más frecuentes.
    - Radar de competencias por eje clínico.
    """
    target_user = user_id or (current_user.email if current_user else "usr_alumno_001")
    return analyze_user_trends(target_user)

@router.get("/coordinator-analytics", response_model=Dict[str, Any])
async def get_coordinator_analytics(
    cohorte_id: Optional[str] = Query(None, description="ID de la cohorte académica opcional")
):
    """
    Retorna el reporte de Inteligencia Institucional B2B para Coordinación Académica:
    - Porcentaje de falla por módulo GPC en la cohorte (ej: 'El 68% de tus estudiantes falla en...').
    - Desglose de brechas masivas por módulo y ranking de deficiencias institucionales.
    """
    return analyze_coordinator_cohort_analytics(cohorte_id)

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

