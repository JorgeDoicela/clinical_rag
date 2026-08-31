"""
Módulo de Learning Analytics y Cálculo del Índice de Brecha Formativa (IBF) para Ateneo+
Modelado matemático de brechas por cohorte y generación de alertas tempranas de intervención docente.
Referencia científica: Contribución metodológica central del artículo de investigación.
"""

from typing import List, Dict, Any, Optional

PUNTAJE_NORMATIVO_ESPERADO = 8.0 # Umbral de suficiencia médica normada (8/10 pts)
IBF_CRITICAL_THRESHOLD = 0.40     # Brecha Crítica > 40%
IBF_MODERATE_THRESHOLD = 0.20     # Brecha Moderada 20% - 40%

EJES_CLINICOS = [
    {"id": "diagnostico", "nombre": "Diagnóstico y Sospecha Nosológica"},
    {"id": "tratamiento", "nombre": "Tratamiento y Dosificación Farmacológica"},
    {"id": "prevencion", "nombre": "Prevención y Factores de Riesgo"},
    {"id": "seguimiento", "nombre": "Seguimiento Longitudinal y Criterios de Alta"}
]

def calculate_cohort_ibf(evaluations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calcula el Índice de Brecha Formativa (IBF) global y por eje para una cohorte de estudiantes:
    IBF_eje = 1.0 - (promedio_eje / puntaje_normativo_esperado)
    """
    if not evaluations:
        return {
            "total_evaluaciones": 0,
            "ibf_global": 0.0,
            "nivel_riesgo_global": "Sin Datos Suficientes",
            "ejes_analiticos": [],
            "alertas_docentes": []
        }

    # Acumuladores por eje
    sum_scores = {e["id"]: 0.0 for e in EJES_CLINICOS}
    count_scores = {e["id"]: 0 for e in EJES_CLINICOS}
    omisiones_por_eje = {e["id"]: [] for e in EJES_CLINICOS}

    for ev in evaluations:
        general_score = ev.get("score", 7.0)
        
        # Mapear scores por competencias o deducir del score general y omisiones
        for eje in EJES_CLINICOS:
            eid = eje["id"]
            # Si el registro tiene desglose o se estima
            penalizacion = 0.0
            for cd in ev.get("competencias_deficientes", []):
                if isinstance(cd, dict) and cd.get("eje") == eid:
                    penalizacion += 2.0
                    omisiones_por_eje[eid].append(cd.get("descripcion", ""))

            eje_score = max(1.0, min(10.0, general_score - penalizacion))
            sum_scores[eid] += eje_score
            count_scores[eid] += 1

    ejes_report = []
    alertas = []
    ibf_valores = []

    for eje in EJES_CLINICOS:
        eid = eje["id"]
        count = count_scores[eid] or 1
        promedio = round(sum_scores[eid] / count, 2)
        
        # Fórmula IBF
        ibf = max(0.0, min(1.0, 1.0 - (promedio / PUNTAJE_NORMATIVO_ESPERADO)))
        ibf = round(ibf, 4)
        ibf_valores.append(ibf)

        if ibf >= IBF_CRITICAL_THRESHOLD:
            severidad = "CRÍTICA"
            badge_color = "red"
            alertas.append({
                "eje": eje["nombre"],
                "ibf": ibf,
                "severidad": "CRÍTICA",
                "mensaje": f"Alerta Crítica: El {int(ibf*100)}% de la cohorte presenta brechas en '{eje['nombre']}' (promedio {promedio}/10 frente a 8.0 esperado).",
                "accion_sugerida": f"Programar sesión de simulación sincrónica y talleres de casos enfocados en {eje['nombre']}."
            })
        elif ibf >= IBF_MODERATE_THRESHOLD:
            severidad = "MODERADA"
            badge_color = "amber"
            alertas.append({
                "eje": eje["nombre"],
                "ibf": ibf,
                "severidad": "MODERADA",
                "mensaje": f"Brecha Moderada detectada en '{eje['nombre']}' (IBF: {int(ibf*100)}%, promedio {promedio}/10).",
                "accion_sugerida": f"Reforzar lectura de guías del MSP para {eje['nombre']}."
            })
        else:
            severidad = "LEVE / CONTROL"
            badge_color = "emerald"

        ejes_report.append({
            "eje_id": eid,
            "nombre": eje["nombre"],
            "promedio_cohorte": promedio,
            "puntaje_esperado": PUNTAJE_NORMATIVO_ESPERADO,
            "ibf": ibf,
            "ibf_porcentaje": round(ibf * 100, 1),
            "severidad": severidad,
            "badge_color": badge_color,
            "total_omisiones_registradas": len(omisiones_por_eje[eid])
        })

    ibf_global = round(sum(ibf_valores) / len(ibf_valores), 4)
    if ibf_global >= IBF_CRITICAL_THRESHOLD:
        nivel_global = "Riesgo Formativo Alto (Intervención Inmediata)"
    elif ibf_global >= IBF_MODERATE_THRESHOLD:
        nivel_global = "Riesgo Formativo Moderado (Refuerzo Recomendado)"
    else:
        nivel_global = "Rendimiento Formativo Óptimo (Alineado a GPC)"

    return {
        "total_evaluaciones": len(evaluations),
        "ibf_global": ibf_global,
        "ibf_global_porcentaje": round(ibf_global * 100, 1),
        "nivel_riesgo_global": nivel_global,
        "ejes_analiticos": ejes_report,
        "alertas_docentes": alertas
    }
