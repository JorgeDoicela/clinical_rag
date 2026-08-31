"""
Módulo de Bayesian Knowledge Tracing (BKT) para Ateneo+
Calcula probabilísticamente el dominio continuo de competencias clínicas.
Referencia científica: Corbett & Anderson (1994), Knowledge Tracing.
"""

from typing import Dict, List, Any, Optional
from adaptive.knowledge_space import CLINICAL_COMPETENCIES, knowledge_space

# Parámetros Psicométricos BKT Calibrados por Competencia
BKT_PARAMETERS: Dict[str, Dict[str, float]] = {
    "semiologia_anamnesis": {
        "L0": 0.40, # A priori inicial
        "T": 0.22,  # Tasa de aprendizaje
        "G": 0.15,  # Guess (acierto sin dominio)
        "S": 0.08   # Slip (error con dominio)
    },
    "diagnostico_diferencial": {
        "L0": 0.30,
        "T": 0.20,
        "G": 0.12,
        "S": 0.10
    },
    "examenes_complementarios": {
        "L0": 0.25,
        "T": 0.20,
        "G": 0.14,
        "S": 0.09
    },
    "correlacion_multimodal": {
        "L0": 0.15,
        "T": 0.25,
        "G": 0.10,
        "S": 0.08
    },
    "diagnostico_final": {
        "L0": 0.30,
        "T": 0.18,
        "G": 0.12,
        "S": 0.10
    },
    "plan_terapeutico_msp": {
        "L0": 0.20,
        "T": 0.20,
        "G": 0.10,
        "S": 0.12
    },
    "seguimiento_prevencion": {
        "L0": 0.25,
        "T": 0.18,
        "G": 0.15,
        "S": 0.10
    }
}

# Cache en memoria de estados de conocimiento por estudiante
_KNOWLEDGE_STATES_CACHE: Dict[str, Dict[str, float]] = {}
_LEARNING_SNAPSHOTS_CACHE: Dict[str, List[Dict[str, Any]]] = {}

def get_initial_knowledge_state() -> Dict[str, float]:
    """Retorna el estado de conocimiento inicial con las probabilidades a priori L0."""
    return {cid: params["L0"] for cid, params in BKT_PARAMETERS.items()}

def bayesian_update(p_prior: float, observation_correct: bool, params: Dict[str, float]) -> float:
    """
    Aplica la regla de Bayes y la probabilidad de transición de aprendizaje BKT:
    P(L_t | obs) -> P(L_{t+1})
    """
    g = params["G"]
    s = params["S"]
    t = params["T"]

    # 1. Actualización Posterior por Evidencia
    if observation_correct:
        numerator = p_prior * (1.0 - s)
        denominator = numerator + (1.0 - p_prior) * g
    else:
        numerator = p_prior * s
        denominator = numerator + (1.0 - p_prior) * (1.0 - g)

    p_posterior = numerator / max(1e-9, denominator)
    p_posterior = max(0.01, min(0.99, p_posterior))

    # 2. Transición de Aprendizaje (Adquisición de conocimiento)
    p_next = p_posterior + (1.0 - p_posterior) * t
    return round(max(0.01, min(0.99, p_next)), 4)

def get_student_knowledge_state(student_id: str) -> Dict[str, float]:
    """
    Retorna el vector continuo de probabilidades de dominio {competencia: P(dominio)} para el estudiante.
    Si no existe en cache, lo inicializa o reconstruye desde el historial SQLite.
    """
    if student_id not in _KNOWLEDGE_STATES_CACHE:
        # Reconstruir estado a partir del historial previo en SQLite si existe
        state = get_initial_knowledge_state()
        try:
            from models.history_db import get_user_evaluation_history
            history = get_user_evaluation_history(student_id)
            for record in reversed(history): # Cronológico
                score = record.get("score", 0.0)
                is_correct = score >= 7.0
                ejes = ["diagnostico", "tratamiento", "seguimiento"]
                for comp_id, params in BKT_PARAMETERS.items():
                    # Mapear eje clínico
                    comp_eje = CLINICAL_COMPETENCIES[comp_id]["eje_principal"]
                    comp_correct = is_correct
                    # Si hubo omisiones específicas en este eje
                    for cd in record.get("competencias_deficientes", []):
                        if isinstance(cd, dict) and cd.get("eje") == comp_eje:
                            comp_correct = False
                            break
                    state[comp_id] = bayesian_update(state[comp_id], comp_correct, params)
        except Exception:
            pass

        _KNOWLEDGE_STATES_CACHE[student_id] = state
        _LEARNING_SNAPSHOTS_CACHE[student_id] = [{
            "session_num": 0,
            "state": state.copy()
        }]

    return _KNOWLEDGE_STATES_CACHE[student_id]

def update_knowledge_state_from_score(student_id: str, case_competencies: List[str], score: float) -> Dict[str, float]:
    """
    Actualiza el estado de conocimiento del estudiante tras completar una sesión de caso clínico.
    """
    state = get_student_knowledge_state(student_id)
    is_correct = score >= 7.0

    for comp_id in case_competencies:
        if comp_id in BKT_PARAMETERS:
            state[comp_id] = bayesian_update(state[comp_id], is_correct, BKT_PARAMETERS[comp_id])

    _KNOWLEDGE_STATES_CACHE[student_id] = state
    
    # Guardar snapshot de trayectoria longitudinal
    history_list = _LEARNING_SNAPSHOTS_CACHE.setdefault(student_id, [])
    history_list.append({
        "session_num": len(history_list),
        "score_obtained": score,
        "state": state.copy()
    })

    return state

def get_student_learning_path(student_id: str) -> List[Dict[str, Any]]:
    """Retorna la secuencia histórica de snapshots BKT para trazar curvas de aprendizaje."""
    get_student_knowledge_state(student_id)
    return _LEARNING_SNAPSHOTS_CACHE.get(student_id, [])
