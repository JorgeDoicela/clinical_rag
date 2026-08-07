import pypdf
from pathlib import Path
from typing import List, Dict, Any

def extract_text_by_page(pdf_path: Path) -> List[Dict[str, Any]]:
    """
    Extrae el texto de un PDF página por página preservando el número de página.
    """
    if not pdf_path.exists():
        raise FileNotFoundError(f"No se encontró el archivo PDF: {pdf_path}")
        
    reader = pypdf.PdfReader(pdf_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        text_clean = text.strip()
        if text_clean:
            pages.append({
                "pagina": i + 1,
                "texto": text_clean
            })
    return pages
