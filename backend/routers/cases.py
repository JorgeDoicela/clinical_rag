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

def _normalize_filename_key(text: str) -> str:
    import unicodedata
    nfd = unicodedata.normalize("NFD", str(text).lower())
    ascii_clean = nfd.encode("ascii", "ignore").decode("ascii")
    return ascii_clean.replace("_", "").replace("-", "").replace(" ", "")

@router.get("/pdf-location/{guia_id}")
async def get_pdf_location(guia_id: str) -> Dict[str, Any]:
    """
    Localiza la URL estática del PDF oficial de la GPC buscando recursivamente
    en todas las subcarpetas por año (2013-2019, general) con mapeo semántico de alias.
    """
    raw_dir = Path(RAW_PDFS_PATH)
    clean_query = _normalize_filename_key(guia_id)
    
    # Mapeo de alias semánticos para casos clínicos canónicos
    SEMANTIC_ALIASES = {
        "preeclampsia": ["trastornoshipertensivos", "preeclampsia", "eclampsia"],
        "hemorragia": ["hemorragiapostparto", "hemorragiaposparto", "hemorragia"],
        "hemorragiaposparto": ["hemorragiapostparto", "hemorragiaposparto"],
        "tuberculosis": ["tuberculosis", "gptuberculosis"],
        "tb": ["tuberculosis", "gptuberculosis"],
        "vih": ["vih", "gpcvih"],
        "hta": ["hta", "gpchta"],
        "hipertension": ["hta", "gpchta", "hipertensiv"],
        "erc": ["enfermedadrenalcronica", "renal"],
        "renal": ["enfermedadrenalcronica", "renal"],
        "ehirn": ["ehirn", "gpcehirn"],
        "parto": ["trabajopartoposparto", "partoporcesarea"],
        "dengue": ["dengue", "fiebre"],
        "neumonia": ["neumonia", "gpcneumonia", "neumoniaadquirida"]
    }

    target_keywords = [clean_query]
    for key, aliases in SEMANTIC_ALIASES.items():
        if key in clean_query or clean_query in key:
            target_keywords.extend([_normalize_filename_key(a) for a in aliases])
            break

    all_pdfs = list(raw_dir.rglob("*.pdf"))
    matched_pdf = None

    # 1. Búsqueda por palabras clave objetivo
    for kw in target_keywords:
        for pdf in all_pdfs:
            pdf_name_clean = _normalize_filename_key(pdf.stem)
            if kw in pdf_name_clean:
                matched_pdf = pdf
                break
        if matched_pdf:
            break

    # 2. Si no hay coincidencia exacta para la guía
    if not matched_pdf:
        # Si no existe PDF físico local para esa guía (ej. Dengue con fragmentos sembrados),
        # buscar si existe algún PDF de medicina general o el primer archivo normativo afín
        for pdf in all_pdfs:
            if "componente" in pdf.stem.lower() or "general" in pdf.stem.lower():
                matched_pdf = pdf
                break

    if not matched_pdf and all_pdfs:
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
