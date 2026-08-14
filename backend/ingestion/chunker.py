import re
from typing import List, Dict, Any
from models.medical_catalog import get_medical_metadata_for_guide

def chunk_by_section(
    pages: List[Dict[str, Any]], 
    guia_id: str, 
    max_chunk_size: int = 800,
    overlap_size: int = 150
) -> List[Dict[str, Any]]:
    """
    Segmenta el texto respetando párrafos, detectando secciones de las GPC del MSP,
    enriqueciendo con metadatos de CIE-10 y Especialidad Médica, e implementando ventana deslizante.
    """
    chunks = []
    chunk_counter = 1
    med_meta = get_medical_metadata_for_guide(guia_id)

    for page in pages:
        paragraphs = [p.strip() for p in page["texto"].split("\n\n") if p.strip()]
        current_chunk = ""
        current_section = "General / Recomendaciones Clave"
        ano_publicacion = page.get("ano_publicacion", 2019)

        for para in paragraphs:
            if (re.match(r'^\d+(\.\d+)*\s+[A-ZÁÉÍÓÚÑ]', para) or 
                para.isupper() or 
                re.match(r'^(RECOMENDACIÓN|TRATAMIENTO|DIAGNÓSTICO|MANEJO|CRITERIOS|ANEXO|TABLA|ESQUEMA)', para, re.IGNORECASE)) and len(para) < 120:
                current_section = para.strip()

            if len(current_chunk) + len(para) > max_chunk_size and current_chunk:
                chunks.append({
                    "chunk_id": f"{guia_id}_chunk_{chunk_counter:03d}",
                    "texto": current_chunk.strip(),
                    "guia_fuente": guia_id,
                    "pagina": page["pagina"],
                    "seccion": current_section,
                    "ano_publicacion": ano_publicacion,
                    "cie10_codigo": med_meta["cie10_codigo"],
                    "cie10_descripcion": med_meta["cie10_descripcion"],
                    "especialidad": med_meta["especialidad"],
                    "grupo_etario": med_meta["grupo_etario"],
                    "char_count": len(current_chunk.strip())
                })
                chunk_counter += 1
                
                overlap_text = current_chunk[-overlap_size:] if len(current_chunk) > overlap_size else current_chunk
                current_chunk = overlap_text + "\n\n" + para
            else:
                if current_chunk:
                    current_chunk += "\n\n" + para
                else:
                    current_chunk = para

        if current_chunk.strip():
            chunks.append({
                "chunk_id": f"{guia_id}_chunk_{chunk_counter:03d}",
                "texto": current_chunk.strip(),
                "guia_fuente": guia_id,
                "pagina": page["pagina"],
                "seccion": current_section,
                "ano_publicacion": ano_publicacion,
                "cie10_codigo": med_meta["cie10_codigo"],
                "cie10_descripcion": med_meta["cie10_descripcion"],
                "especialidad": med_meta["especialidad"],
                "grupo_etario": med_meta["grupo_etario"],
                "char_count": len(current_chunk.strip())
            })
            chunk_counter += 1

    return chunks
