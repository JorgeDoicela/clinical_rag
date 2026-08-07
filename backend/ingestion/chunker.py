import re
from typing import List, Dict, Any

def chunk_by_section(pages: List[Dict[str, Any]], guia_id: str, max_chunk_size: int = 1000) -> List[Dict[str, Any]]:
    """
    Segmenta el texto respetando párrafos y detectando secciones de las GPC del MSP.
    Preserva metadatos esenciales para trazabilidad normativa.
    """
    chunks = []
    chunk_counter = 1

    for page in pages:
        paragraphs = [p.strip() for p in page["texto"].split("\n\n") if p.strip()]
        current_chunk = ""
        current_section = "General / Recomendaciones Clave"

        for para in paragraphs:
            # Heurística para detectar títulos de sección (ej. 4.1 Manejo de..., RECOMENDACIÓN, TRATAMIENTO)
            if (re.match(r'^\d+(\.\d+)*\s+[A-ZÁÉÍÓÚÑ]', para) or 
                para.isupper() or 
                re.match(r'^(RECOMENDACIÓN|TRATAMIENTO|DIAGNÓSTICO|MANEJO|CRITERIOS)', para, re.IGNORECASE)) and len(para) < 120:
                current_section = para.strip()

            if len(current_chunk) + len(para) > max_chunk_size and current_chunk:
                chunks.append({
                    "chunk_id": f"{guia_id}_chunk_{chunk_counter:03d}",
                    "texto": current_chunk.strip(),
                    "guia_fuente": guia_id,
                    "pagina": page["pagina"],
                    "seccion": current_section
                })
                chunk_counter += 1
                current_chunk = para
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
                "seccion": current_section
            })
            chunk_counter += 1

    return chunks
