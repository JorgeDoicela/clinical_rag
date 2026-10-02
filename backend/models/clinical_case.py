"""
Módulo de compatibilidad para backend/models/clinical_case.py.
Delega en modules/cases/service.py (Domain Service).
"""
from typing import List, Optional
from models.schemas import ClinicalCaseSchema
from modules.cases.dependencies import get_case_service

_service = get_case_service()


def load_all_cases() -> List[ClinicalCaseSchema]:
    return _service.list_cases()


def get_case_by_id(case_id: str) -> Optional[ClinicalCaseSchema]:
    return _service.get_case(case_id)
