from fastapi import APIRouter, HTTPException
from typing import List
from models.schemas import ClinicalCaseSchema
from models.clinical_case import load_all_cases, get_case_by_id

router = APIRouter(prefix="/api/cases", tags=["Casos Clínicos"])

@router.get("", response_model=List[ClinicalCaseSchema])
async def list_cases():
    """
    Retorna la lista completa de casos clínicos simulados disponibles.
    """
    return load_all_cases()

@router.get("/{case_id}", response_model=ClinicalCaseSchema)
async def get_case(case_id: str):
    """
    Retorna el detalle de un caso clínico específico.
    """
    caso = get_case_by_id(case_id)
    if not caso:
        raise HTTPException(status_code=404, detail=f"Caso clínico '{case_id}' no encontrado.")
    return caso
