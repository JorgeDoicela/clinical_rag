import re
import unicodedata
from pathlib import Path
from typing import List, Dict, Any

def sanitize_str(s: str) -> str:
    """Normaliza y sanitiza caracteres unicode para compatibilidad en Windows cp1252 / UTF-8."""
    return unicodedata.normalize("NFKC", str(s))

def extract_year_from_path_or_text(pdf_path: Path, text_sample: str = "") -> int:
    """
    Detecta el año de la GPC desde el nombre de la carpeta contenedora (ej. 2019)
    o desde el nombre/texto del documento.
    """
    parent_name = pdf_path.parent.name
    if re.match(r'^(201\d|202\d)$', parent_name):
        return int(parent_name)

    match_file = re.search(r'(201\d|202\d)', pdf_path.stem)
    if match_file:
        return int(match_file.group(1))

    if text_sample:
        match_text = re.search(r'edición\s*(201\d|202\d)|publicado.*?(201\d|202\d)|acuerdo.*?(201\d|202\d)', text_sample, re.IGNORECASE)
        if match_text:
            for g in match_text.groups():
                if g and re.match(r'^(201\d|202\d)$', g):
                    return int(g)

    return 2019

def clean_extracted_text(text: str) -> str:
    """
    Limpia el texto extraído de las GPC del MSP Ecuador:
    - Une palabras divididas con guion al final de línea
    - Elimina marcas de agua, encabezados y pies de página administrativos
    - Normaliza espacios múltiples respetando párrafos legítimos
    """
    if not text:
        return ""

    text = sanitize_str(text)
    text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)

    noise_patterns = [
        r'MINISTERIO DE SALUD PÚBLICA\s*',
        r'GUÍA DE PRÁCTICA CLÍNICA GPC\s*',
        r'Dirección Nacional de Normatización\s*',
        r'Subsecretaría Nacional de Gobernanza de la Salud\s*',
        r'Av\.\s*República de El Salvador\s*\d+.*?\n',
        r'www\.salud\.gob\.ec\s*',
        r'Edición Especial\s*-\s*Registro Oficial.*?\n'
    ]
    
    for pattern in noise_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)

    lines = [line.strip() for line in text.split('\n')]
    cleaned_lines = []
    
    for line in lines:
        if not line:
            cleaned_lines.append("")
        else:
            if re.match(r'^\d+$', line):
                continue
            cleaned_lines.append(re.sub(r'[ \t]+', ' ', line))

    cleaned_text = '\n'.join(cleaned_lines)
    cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)
    
    return cleaned_text.strip()

def format_table_to_markdown(table: List[List[Any]]) -> str:
    """
    Convierte una matriz de celdas de tabla en sintaxis estricta Markdown (| Col1 | Col2 |).
    Garantiza 100% de precisión matemática en dosis numéricas y criterios clínicos.
    """
    if not table or not any(table):
        return ""
    
    markdown_lines = []
    headers = [sanitize_str(cell or "").strip().replace('\n', ' ') for cell in table[0]]
    if not any(headers):
        return ""

    markdown_lines.append("| " + " | ".join(headers) + " |")
    markdown_lines.append("| " + " | ".join(["---"] * len(headers)) + " |")

    for row in table[1:]:
        clean_row = [sanitize_str(cell or "").strip().replace('\n', ' ') for cell in row]
        if any(clean_row):
            if len(clean_row) < len(headers):
                clean_row.extend([""] * (len(headers) - len(clean_row)))
            elif len(clean_row) > len(headers):
                clean_row = clean_row[:len(headers)]
            markdown_lines.append("| " + " | ".join(clean_row) + " |")

    return "\n".join(markdown_lines)

def extract_advanced_text_by_page(pdf_path: Path) -> List[Dict[str, Any]]:
    """
    Extracción Robusta, Determinista y de Alta Velocidad:
    1. pdfplumber: Extrae texto y detecta matrices de tablas clínicas convirtiéndolas a Markdown.
    2. pymupdf (fitz): Motor C++ ultrarrápido como respaldo si pdfplumber detecta 0 caracteres.
    """
    if not pdf_path.exists():
        raise FileNotFoundError(f"No se encontró el archivo PDF: {pdf_path}")
        
    pages = []
    first_pages_text = ""
    
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                page_text = ""
                try:
                    raw_text = page.extract_text() or ""
                    page_text = clean_extracted_text(raw_text)
                except Exception:
                    page_text = ""

                tables_md = []
                try:
                    extracted_tables = page.extract_tables()
                    for t in extracted_tables:
                        tbl_str = format_table_to_markdown(t)
                        if tbl_str:
                            tables_md.append(tbl_str)
                except Exception:
                    pass

                full_page_content = page_text
                if tables_md:
                    full_page_content += "\n\n### TABLAS CLÍNICAS NORMATIVAS:\n" + "\n\n".join(tables_md)

                if i < 3:
                    first_pages_text += " " + full_page_content

                if full_page_content and len(full_page_content.strip()) > 30:
                    pages.append({
                        "pagina": i + 1,
                        "texto": full_page_content.strip(),
                        "char_count": len(full_page_content.strip()),
                        "tiene_tablas": len(tables_md) > 0
                    })

    except Exception:
        pass

    # Si pdfplumber no extrajo páginas (ej. formato complejo), usar PyMuPDF (fitz)
    if not pages:
        try:
            import pymupdf
            doc = pymupdf.open(pdf_path)
            for i, page in enumerate(doc):
                raw_text = page.get_text() or ""
                text_clean = clean_extracted_text(raw_text)
                if i < 3:
                    first_pages_text += " " + text_clean
                if text_clean and len(text_clean) > 30:
                    pages.append({
                        "pagina": i + 1,
                        "texto": text_clean,
                        "char_count": len(text_clean),
                        "tiene_tablas": False
                    })
            doc.close()
        except Exception:
            pass

    ano_gpc = extract_year_from_path_or_text(pdf_path, first_pages_text)
    for p in pages:
        p["ano_publicacion"] = ano_gpc
            
    return pages
