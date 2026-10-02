import json
from pathlib import Path
from typing import List, Optional
from core.config import settings
from models.schemas import ClinicalCaseSchema


class CaseRepository:
    """
    Repositorio de Casos Clínicos.
    Abstrae la persistencia del catálogo médico (actualmente JSON estructurado,
    preparado para migración transparente a PostgreSQL / SQLAlchemy).
    """
    def __init__(self, cases_file_path: Optional[str] = None):
        self.cases_file_path = Path(cases_file_path or settings.cases_file_path)
        self._cache: Optional[List[ClinicalCaseSchema]] = None

    def get_all(self, reload: bool = False) -> List[ClinicalCaseSchema]:
        if self._cache is not None and not reload:
            return self._cache

        if not self.cases_file_path.exists():
            return []

        with open(self.cases_file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            self._cache = [ClinicalCaseSchema(**item) for item in data.get("cases", [])]

        return self._cache

    def get_by_id(self, case_id: str) -> Optional[ClinicalCaseSchema]:
        cases = self.get_all()
        for c in cases:
            if c.id == case_id:
                return c
        return None
