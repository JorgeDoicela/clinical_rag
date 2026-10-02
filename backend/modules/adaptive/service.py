from typing import Dict, Any, List
from adaptive.knowledge_space import knowledge_space
from adaptive.knowledge_tracer import get_student_knowledge_state, get_student_learning_path
from adaptive.curriculum_engine import select_optimal_next_case


class AdaptiveCurriculumService:
    """
    Servicio de Dominio de Currículo Adaptativo e Inteligencia ITS.
    Encapsula los algoritmos psicométricos KST (Espacios de Conocimiento),
    BKT (Rastreo Bayesiano) y la selección en Zona de Desarrollo Próximo (ZDP).
    """
    def get_optimal_next_case(self, student_id: str) -> Dict[str, Any]:
        return select_optimal_next_case(student_id)

    def get_knowledge_state(self, student_id: str) -> Dict[str, Any]:
        state = get_student_knowledge_state(student_id)
        topology = knowledge_space.get_topology_dict()
        return {
            "student_id": student_id,
            "knowledge_state": state,
            "topology": topology
        }

    def get_learning_path(self, student_id: str) -> List[Dict[str, Any]]:
        return get_student_learning_path(student_id)

    def get_topology(self) -> Dict[str, Any]:
        return knowledge_space.get_topology_dict()
