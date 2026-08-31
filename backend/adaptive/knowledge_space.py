"""
Módulo de Knowledge Space Theory (KST) para Ateneo+
Modelado formal del espacio de conocimiento y grafo dirigido de competencias clínicas.
Referencia científica: Doignon & Falmagne (1985), Knowledge Space Theory.
"""

from typing import Dict, List, Set, Any

# Definición de Nodos del Grafo (Competencias Clínicas Estandarizadas)
CLINICAL_COMPETENCIES: Dict[str, Dict[str, Any]] = {
    "semiologia_anamnesis": {
        "id": "semiologia_anamnesis",
        "nombre": "Anamnesis y Semiología Clínica",
        "eje_principal": "diagnóstico",
        "descripcion": "Recolección estructurada de síntomas, antecedentes y signos de alarma.",
        "orden": 1
    },
    "diagnostico_diferencial": {
        "id": "diagnostico_diferencial",
        "nombre": "Diagnóstico Diferencial y Presuntivo",
        "eje_principal": "diagnóstico",
        "descripcion": "Estratificación de hipótesis diagnósticas y descarte de patologías imitadoras.",
        "orden": 2
    },
    "examenes_complementarios": {
        "id": "examenes_complementarios",
        "nombre": "Selección de Estudios Paraclínicos",
        "eje_principal": "diagnóstico",
        "descripcion": "Indicación justificada de estudios de laboratorio, gabinete e imagen.",
        "orden": 3
    },
    "correlacion_multimodal": {
        "id": "correlacion_multimodal",
        "nombre": "Interpretación y Correlación Multimodal",
        "eje_principal": "diagnóstico",
        "descripcion": "Lectura integrada de trazados ECG, radiografías y analítica frente a la clínica.",
        "orden": 4
    },
    "diagnostico_final": {
        "id": "diagnostico_final",
        "nombre": "Diagnóstico Definitivo y Severidad",
        "eje_principal": "diagnóstico",
        "descripcion": "Confirmación nosológica y estadificación de gravedad según la GPC del MSP.",
        "orden": 5
    },
    "plan_terapeutico_msp": {
        "id": "plan_terapeutico_msp",
        "nombre": "Terapéutica Farmacológica y Conducta",
        "eje_principal": "tratamiento",
        "descripcion": "Prescripción de primera línea, dosificación exacta por kg/peso y fluidoterapia normada.",
        "orden": 6
    },
    "seguimiento_prevencion": {
        "id": "seguimiento_prevencion",
        "nombre": "Monitoreo, Prevención y Criterios de Alta",
        "eje_principal": "seguimiento",
        "descripcion": "Protocolos de control ambulatorio, prevención terciaria y vigilancia de complicaciones.",
        "orden": 7
    }
}

# Aristas del Grafo de Prerrequisitos (A -> B : dominar A es prerrequisito necesario para B)
CLINICAL_PREREQUISITES: List[tuple[str, str]] = [
    ("semiologia_anamnesis", "diagnostico_diferencial"),
    ("diagnostico_diferencial", "examenes_complementarios"),
    ("examenes_complementarios", "correlacion_multimodal"),
    ("correlacion_multimodal", "diagnostico_final"),
    ("diagnostico_diferencial", "diagnostico_final"),
    ("diagnostico_final", "plan_terapeutico_msp"),
    ("plan_terapeutico_msp", "seguimiento_prevencion")
]

class KnowledgeSpace:
    """Gestor del grafo de conocimiento clínico y dependencias KST."""
    
    def __init__(self):
        self.competencies = CLINICAL_COMPETENCIES
        self.prerequisites = CLINICAL_PREREQUISITES
        self._adj_matrix: Dict[str, Set[str]] = {k: set() for k in self.competencies}
        self._rev_matrix: Dict[str, Set[str]] = {k: set() for k in self.competencies}
        
        for u, v in self.prerequisites:
            if u in self._adj_matrix and v in self._rev_matrix:
                self._adj_matrix[u].add(v)
                self._rev_matrix[v].add(u)

    def get_prerequisites(self, competency_id: str) -> Set[str]:
        """Retorna el conjunto de competencias prerrequisito directo para un nodo."""
        return self._rev_matrix.get(competency_id, set())

    def get_successors(self, competency_id: str) -> Set[str]:
        """Retorna las competencias que se desbloquean al dominar un nodo."""
        return self._adj_matrix.get(competency_id, set())

    def all_prerequisites_met(self, competency_id: str, knowledge_state: Dict[str, float], threshold: float = 0.60) -> bool:
        """Verifica si todos los prerrequisitos de una competencia superan el umbral de dominio."""
        prereqs = self.get_prerequisites(competency_id)
        if not prereqs:
            return True
        return all(knowledge_state.get(p, 0.0) >= threshold for p in prereqs)

    def get_topology_dict(self) -> Dict[str, Any]:
        """Exporta la topología del grafo para visualización en el frontend."""
        nodes = []
        for cid, meta in self.competencies.items():
            nodes.append({
                "id": cid,
                "nombre": meta["nombre"],
                "eje_principal": meta["eje_principal"],
                "descripcion": meta["descripcion"],
                "orden": meta["orden"]
            })
        edges = [{"source": u, "target": v} for u, v in self.prerequisites]
        return {"nodes": nodes, "edges": edges}

# Instancia global singleton del espacio de conocimiento
knowledge_space = KnowledgeSpace()
