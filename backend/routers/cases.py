from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from pathlib import Path
from models.schemas import ClinicalCaseSchema
from models.clinical_case import load_all_cases, get_case_by_id
from config import RAW_PDFS_PATH

router = APIRouter(prefix="/api/cases", tags=["Casos Clínicos"])

@router.get("", response_model=List[ClinicalCaseSchema])
async def list_cases():
    """
    Retorna la lista completa de casos clínicos simulados disponibles.
    """
    return load_all_cases()

@router.get("/pdf-location/{guia_id}")
async def get_pdf_location(guia_id: str) -> Dict[str, Any]:
    """
    Localiza la URL estática del PDF oficial de la GPC buscando recursivamente
    en todas las subcarpetas por año (2013-2019, general).
    """
    raw_dir = Path(RAW_PDFS_PATH)
    clean_query = guia_id.lower().replace("_", "").replace("-", "")
    
    # 1. Búsqueda exacta y por similitud de nombre
    all_pdfs = list(raw_dir.rglob("*.pdf"))
    matched_pdf = None

    for pdf in all_pdfs:
        pdf_name_clean = pdf.stem.lower().replace("_", "").replace("-", "")
        if clean_query in pdf_name_clean or pdf_name_clean in clean_query:
            matched_pdf = pdf
            break

    if not matched_pdf and all_pdfs:
        # Fallback al primer PDF disponible
        matched_pdf = all_pdfs[0]

    if not matched_pdf:
        raise HTTPException(status_code=404, detail=f"No se encontró documento PDF para la guía '{guia_id}'.")

    # Obtener ruta relativa respecto a RAW_PDFS_PATH para la URL estática
    rel_path = matched_pdf.relative_to(raw_dir).as_posix()
    return {
        "guia_id": guia_id,
        "filename": matched_pdf.name,
        "pdf_url": f"/static/pdfs/{rel_path}"
    }

@router.get("/{case_id}", response_model=ClinicalCaseSchema)
async def get_case(case_id: str):
    """
    Retorna el detalle de un caso clínico específico.
    """
    caso = get_case_by_id(case_id)
    if not caso:
        raise HTTPException(status_code=404, detail=f"Caso clínico '{case_id}' no encontrado.")
    return caso
