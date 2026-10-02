import json
from typing import Dict, Any, List, Optional
from adaptive.knowledge_space import knowledge_space
from adaptive.knowledge_tracer import (
    get_initial_knowledge_state,
    get_student_knowledge_state,
    set_student_knowledge_state,
    update_knowledge_state_from_score,
    get_student_learning_path,
    project_knowledge_state_from_history,
    bayesian_update,
    BKT_PARAMETERS
)
from adaptive.curriculum_engine import select_optimal_next_case
from modules.adaptive.repository import AdaptiveRepository
from modules.analytics_history.repository import HistoryRepository


class AdaptiveCurriculumService:
    """
    Servicio de Dominio de Currículo Adaptativo e Inteligencia ITS.
    Encapsula los algoritmos psicométricos KST (Espacios de Conocimiento),
    BKT (Rastreo Bayesiano) y la selección en Zona de Desarrollo Próximo (ZDP),
    orquestando la persistencia durable de maestría y snapshots.
    """
    def __init__(
        self,
        repository: Optional[AdaptiveRepository] = None,
        history_repository: Optional[HistoryRepository] = None
    ):
        self.repository = repository
        self.history_repository = history_repository

    def get_optimal_next_case(self, student_id: str) -> Dict[str, Any]:
        # Garantizar que el estado persistido esté sincronizado antes de seleccionar caso
        self.get_knowledge_state(student_id)
        return select_optimal_next_case(student_id)

    def get_knowledge_state(self, student_id: str) -> Dict[str, Any]:
        state = None

        # 1. Intentar consultar estado persistido en AdaptiveRepository
        if self.repository:
            state = self.repository.get_mastery(student_id)

        # 2. Si no hay estado previo, proyectar desde eventos históricos en HistoryRepository
        if state is None and self.history_repository:
            history_records = self.history_repository.get_by_user(student_id, limit=100)
            if history_records:
                records_dict = []
                for r in history_records:
                    try:
                        comp_def = json.loads(r.competencias_json) if r.competencias_json else []
                    except Exception:
                        comp_def = []
                    records_dict.append({
                        "score": r.score,
                        "competencias_deficientes": comp_def,
                        "timestamp": r.timestamp
                    })
                state = project_knowledge_state_from_history(records_dict)
            else:
                state = get_initial_knowledge_state()

            # Guardar proyección en base de datos si el repositorio está activo
            if self.repository:
                self.repository.save_mastery(student_id, state)
                self.repository.add_snapshot(
                    user_id=student_id,
                    session_num=0,
                    score=0.0,
                    state=state
                )

        # 3. Fallback a caché algorítmico L1 si no hay infraestructura de base de datos
        if state is None:
            state = get_student_knowledge_state(student_id)
        else:
            set_student_knowledge_state(student_id, state)

        topology = knowledge_space.get_topology_dict()
        return {
            "student_id": student_id,
            "knowledge_state": state,
            "topology": topology
        }

    def get_learning_path(self, student_id: str) -> List[Dict[str, Any]]:
        if self.repository:
            snapshots = self.repository.get_snapshots(student_id)
            if snapshots:
                return snapshots

        # Si aún no hay snapshots persistidos, asegurar carga de estado y consultar L1
        self.get_knowledge_state(student_id)
        if self.repository:
            snapshots = self.repository.get_snapshots(student_id)
            if snapshots:
                return snapshots

        return get_student_learning_path(student_id)

    def record_evaluation_impact(
        self,
        student_id: str,
        case_competencies: List[str],
        score: float
    ) -> Dict[str, float]:
        """
        Registra el impacto psicométrico de una evaluación completada, actualizando
        el vector BKT y guardando un nuevo snapshot longitudinal en base de datos.
        """
        current_state_data = self.get_knowledge_state(student_id)
        state = current_state_data["knowledge_state"].copy()
        is_correct = score >= 7.0

        for comp_id in case_competencies:
            if comp_id in BKT_PARAMETERS:
                state[comp_id] = bayesian_update(state[comp_id], is_correct, BKT_PARAMETERS[comp_id])

        set_student_knowledge_state(student_id, state)

        if self.repository:
            self.repository.save_mastery(student_id, state)
            existing_snapshots = self.repository.get_snapshots(student_id)
            next_session = len(existing_snapshots)
            self.repository.add_snapshot(
                user_id=student_id,
                session_num=next_session,
                score=score,
                state=state
            )

        return state

    def get_topology(self) -> Dict[str, Any]:
        return knowledge_space.get_topology_dict()
