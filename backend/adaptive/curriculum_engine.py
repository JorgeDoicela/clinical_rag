"""
Motor de Currículo Adaptativo para Ateneo+
Selección proactiva del caso óptimo basado en la Zona de Desarrollo Próximo (ZDP) y KST.
Referencia científica: Vygotsky (1978), Doignon & Falmagne (1985).
"""

from typing import Dict, List, Any, Optional
from models.clinical_case import load_all_cases
from models.schemas import ClinicalCaseSchema
from adaptive.knowledge_space import CLINICAL_COMPETENCIES, knowledge_space
from adaptive.knowledge_tracer import get_student_knowledge_state

# Mapeo de casos clínicos del catálogo a las competencias KST que activan principalmente
CASE_COMPETENCY_MAP: Dict[str, List[str]] = {
    "case_dengue_01": ["semiologia_anamnesis", "diagnostico_diferencial", "plan_terapeutico_msp"],
    "case_preeclampsia_01": ["semiologia_anamnesis", "diagnostico_final", "plan_terapeutico_msp"],
    "case_diabetes_01": ["diagnostico_final", "plan_terapeutico_msp", "seguimiento_prevencion"],
    "case_hemorragia_01": ["semiologia_anamnesis", "diagnostico_final", "plan_terapeutico_msp"],
    "case_tb_01": ["semiologia_anamnesis", "examenes_complementarios", "plan_terapeutico_msp"],
    "case_vih_01": ["examenes_complementarios", "plan_terapeutico_msp", "seguimiento_prevencion"],
    "case_hta_01": ["semiologia_anamnesis", "correlacion_multimodal", "plan_terapeutico_msp", "seguimiento_prevencion"],
    "case_erc_01": ["examenes_complementarios", "diagnostico_final", "seguimiento_prevencion"],
    "case_ehirn_01": ["semiologia_anamnesis", "correlacion_multimodal", "plan_terapeutico_msp"],
    "case_nac_01": ["semiologia_anamnesis", "examenes_complementarios", "correlacion_multimodal", "plan_terapeutico_msp"],
    "case_sepsis_neonatal_01": ["semiologia_anamnesis", "examenes_complementarios", "plan_terapeutico_msp"],
    "case_aborto_01": ["semiologia_anamnesis", "diagnostico_final", "plan_terapeutico_msp"]
}

def detect_zone_of_proximal_development(knowledge_state: Dict[str, float]) -> List[str]:
    """
    Identifica las competencias en la Zona de Desarrollo Próximo (ZDP):
    - Probabilidad de dominio entre 0.30 y 0.75.
    - Todos sus prerrequisitos en el grafo KST cumplen el umbral de preparación (>= 0.50).
    """
    zdp_nodes = []
    for comp_id, p_val in knowledge_state.items():
        if 0.25 <= p_val <= 0.75:
            if knowledge_space.all_prerequisites_met(comp_id, knowledge_state, threshold=0.45):
                zdp_nodes.append(comp_id)

    # Si no hay nodos en ZDP (ej. estudiante nuevo o avanzado), seleccionar el nodo no dominado de menor orden
    if not zdp_nodes:
        unmastered = sorted(
            [c for c, p in knowledge_state.items() if p < 0.75],
            key=lambda c: (CLINICAL_COMPETENCIES[c]["orden"], knowledge_state[c])
        )
        if unmastered:
            zdp_nodes = [unmastered[0]]
        else:
            zdp_nodes = ["correlacion_multimodal"]

    return zdp_nodes

def select_optimal_next_case(student_id: str) -> Dict[str, Any]:
    """
    Ejecuta el algoritmo de recomendación adaptativa:
    1. Lee el estado de dominio BKT del estudiante.
    2. Identifica las competencias en la ZDP.
    3. Puntúa los casos del catálogo según cobertura de la ZDP.
    4. Genera la justificación pedagógica en lenguaje natural.
    """
    knowledge_state = get_student_knowledge_state(student_id)
    zdp_nodes = detect_zone_of_proximal_development(knowledge_state)
    all_cases = load_all_cases()

    # Competencia prioritaria (la de menor dominio dentro de la ZDP)
    target_comp_id = min(zdp_nodes, key=lambda c: knowledge_state.get(c, 0.5))
    target_comp_meta = CLINICAL_COMPETENCIES.get(target_comp_id, CLINICAL_COMPETENCIES["semiologia_anamnesis"])

    best_case: Optional[ClinicalCaseSchema] = None
    best_score = -1.0

    for case in all_cases:
        case_comps = CASE_COMPETENCY_MAP.get(case.id, ["semiologia_anamnesis", "plan_terapeutico_msp"])
        
        # Ponderación: alta si incluye la competencia objetivo, más bonus por otros nodos ZDP
        score = 0.0
        if target_comp_id in case_comps:
            score += 5.0
        for node in zdp_nodes:
            if node in case_comps:
                score += 2.0

        # Priorizar casos multimodales o multifase para casos con correlación multimodal en ZDP
        if "correlacion_multimodal" in zdp_nodes and (case.imagen_url or getattr(case, "fases", None)):
            score += 3.0

        if score > best_score:
            best_score = score
            best_case = case

    if not best_case and all_cases:
        best_case = all_cases[0]

    # Calcular nivel general de dominio
    avg_mastery = sum(knowledge_state.values()) / len(knowledge_state)
    if avg_mastery < 0.40:
        nivel_text = "Nivel Inicial (En formación)"
    elif avg_mastery < 0.70:
        nivel_text = "Nivel Intermedio (Desarrollo activo)"
    elif avg_mastery < 0.85:
        nivel_text = "Nivel Competente (Alineado a GPC)"
    else:
        nivel_text = "Nivel Avanzado / Experto"

    p_target_pct = int(knowledge_state.get(target_comp_id, 0.3) * 100)
    
    # Justificación pedagógica basada en evidencia
    prereqs = knowledge_space.get_prerequisites(target_comp_id)
    if prereqs:
        prereq_names = [CLINICAL_COMPETENCIES[p]["nombre"] for p in prereqs if p in CLINICAL_COMPETENCIES]
        justificacion = (
            f"Ateneo+ seleccionó este caso porque presentas una base sólida en {', '.join(prereq_names[:2])} "
            f"y tu siguiente hito de aprendizaje óptimo es dominar '{target_comp_meta['nombre']}' (dominio actual: {p_target_pct}%)."
        )
    else:
        justificacion = (
            f"Ateneo+ recomienda este caso para afianzar tus competencias fundamentales en "
            f"'{target_comp_meta['nombre']}' (dominio actual: {p_target_pct}%)."
        )

    return {
        "case": best_case.dict() if best_case else None,
        "competencia_objetivo": {
            "id": target_comp_id,
            "nombre": target_comp_meta["nombre"],
            "eje_principal": target_comp_meta["eje_principal"],
            "descripcion": target_comp_meta["descripcion"],
            "p_dominio": knowledge_state.get(target_comp_id, 0.3)
        },
        "justificacion_pedagogica": justificacion,
        "zdp_competencias": zdp_nodes,
        "knowledge_state": knowledge_state,
        "nivel_dominio_general": nivel_text,
        "promedio_dominio_global": round(avg_mastery, 3)
    }
