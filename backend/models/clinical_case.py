import json
from pathlib import Path
from typing import List, Optional
from config import CASES_FILE_PATH
from models.schemas import ClinicalCaseSchema

def load_all_cases() -> List[ClinicalCaseSchema]:
    path = Path(CASES_FILE_PATH)
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
        return [ClinicalCaseSchema(**item) for item in data.get("cases", [])]

def get_case_by_id(case_id: str) -> Optional[ClinicalCaseSchema]:
    cases = load_all_cases()
    for c in cases:
        if c.id == case_id:
            return c
    return None
