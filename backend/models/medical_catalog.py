import json
import re
from pathlib import Path
from typing import Dict, Any, Optional, List

_CATALOG_DATA = None

def load_medical_catalog() -> Dict[str, Any]:
    """Carga y cachea el catálogo oficial de metadatos CIE-10 y Especialidades."""
    global _CATALOG_DATA
    if _CATALOG_DATA is None:
        catalog_path = Path(__file__).resolve().parent.parent / "data" / "catalogo_cie10_gpc.json"
        if catalog_path.exists():
            with open(catalog_path, "r", encoding="utf-8") as f:
                _CATALOG_DATA = json.load(f)
        else:
            _CATALOG_DATA = {"catalogo_guias": [], "especialidades_principales": []}
    return _CATALOG_DATA

def get_medical_metadata_for_guide(filename_or_id: str) -> Dict[str, Any]:
    """
    Infiere automáticamente el código CIE-10, la Especialidad Médica,
    el Grupo Etario y el Título Oficial analizando el identificador o nombre del archivo PDF.
    """
    catalog = load_medical_catalog()
    clean_target = filename_or_id.lower().replace("-", "_").replace(" ", "_")

    for entry in catalog.get("catalogo_guias", []):
        guia_key = entry.get("guia_key", "")
        if guia_key and guia_key in clean_target:
            return {
                "cie10_codigo": entry.get("cie10_codigo", "Z00"),
                "cie10_descripcion": entry.get("cie10_descripcion", "Atención médica general"),
                "especialidad": entry.get("especialidad", "Medicina Interna"),
                "grupo_etario": entry.get("grupo_etario", "Población General"),
                "titulo_oficial": entry.get("titulo_oficial", filename_or_id),
                "nivel_atencion": entry.get("nivel_atencion", "Todos los Niveles")
            }

        for pattern in entry.get("patrones_nombre", []):
            pattern_clean = pattern.lower().replace("-", "_")
            if pattern_clean in clean_target:
                return {
                    "cie10_codigo": entry.get("cie10_codigo", "Z00"),
                    "cie10_descripcion": entry.get("cie10_descripcion", "Atención médica general"),
                    "especialidad": entry.get("especialidad", "Medicina Interna"),
                    "grupo_etario": entry.get("grupo_etario", "Población General"),
                    "titulo_oficial": entry.get("titulo_oficial", filename_or_id),
                    "nivel_atencion": entry.get("nivel_atencion", "Todos los Niveles")
                }

    # Fallback heurístico para guías no catalogadas explícitamente
    return {
        "cie10_codigo": "Z00.0",
        "cie10_descripcion": "Examen médico general MSP",
        "especialidad": "Medicina General / Salud Pública",
        "grupo_etario": "Población General",
        "titulo_oficial": filename_or_id,
        "nivel_atencion": "Primer Nivel de Atención"
    }

def get_all_specialties() -> List[str]:
    """Retorna la lista de todas las especialidades médicas soportadas."""
    catalog = load_medical_catalog()
    return catalog.get("especialidades_principales", [])
