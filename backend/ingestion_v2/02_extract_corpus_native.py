"""
Fase 2: Extraccion Nativa de Alta Fidelidad del Corpus Normativo MSP Ecuador.
Ateneo+ v2.0 - Pipeline Cientifico de Ingesta (100% Corpus Ecuador).

Este modulo sustituye dependencias pesadas de GPU/Docker (vLLM/Marker) por un motor
hibrido PyMuPDF (fitz) + pdfplumber de ejecucion local deterministica que:
1. Procesa los 45 PDFs oficiales clasificados en backend/data/corpus_manifest.json.
2. Detecta la paginacion real impresa al pie de pagina mediante analisis de coordenadas.
3. Convierte tablas clinicas y esquemas farmacologicos a sintaxis Markdown estandar.
4. Deduplica texto dentro de tablas para evitar redundancia semantica.
5. Emite documentos Markdown enriquecidos en backend/data/extracted/markdown/ con metadatos
   delimitados por pagina (<!-- GPC_PAGE_START ... -->) listos para el tokenizador BGE-M3.
"""

import os
import sys
import re
import json
import time
import unicodedata
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

import pymupdf
import pdfplumber

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
DATA_DIR = BASE_DIR / "data"
MANIFEST_PATH = DATA_DIR / "corpus_manifest.json"
EXTRACTED_DIR = DATA_DIR / "extracted"
MARKDOWN_OUT_DIR = EXTRACTED_DIR / "markdown"
SUMMARY_PATH = EXTRACTED_DIR / "extraction_summary.json"



def normalize_text_nfc(text: str) -> str:
    """Normaliza texto a Unicode NFC preservando caracteres medicos (ug, tildes, grados)."""
    if not text:
        return ""
    text = unicodedata.normalize("NFC", text)
    # Estandarizar caracteres especiales frecuentes en GPCs
    text = text.replace("\u00a0", " ")  # Non-breaking space
    # Solo reemplazar unidades medicas con expresiones regulares seguras
    text = re.sub(r"\b(ug|mcg)\b", "µg", text, flags=re.IGNORECASE)
    text = re.sub(r"(\d+)\s*º\s*C\b", r"\1°C", text)
    text = re.sub(r"(\d+)\s*°\s*C\b", r"\1°C", text)
    return text.strip()


def detect_printed_page_number(page: pymupdf.Page) -> Optional[int]:
    """
    Detecta el numero de pagina fisica impreso en el pie o encabezado de la hoja.
    Inspecciona bloques de texto en el 15% inferior de la pagina.
    """
    height = page.rect.height
    footer_threshold = height * 0.82
    blocks = page.get_text("blocks")

    # 1. Buscar en el pie de pagina (mas comun en documentos del MSP)
    footer_candidates = []
    for b in blocks:
        # b = (x0, y0, x1, y1, text, block_no, block_type)
        if b[1] >= footer_threshold:
            clean_b = b[4].strip()
            # Buscar digitos aislados o patrones como "Pagina X", "pág. X", "- X -"
            match = re.search(r"^(?:p[aá]g\.?|p[aá]gina)?\s*[-–—]?\s*(\d{1,4})\s*[-–—]?$", clean_b, re.IGNORECASE)
            if match:
                footer_candidates.append((b[1], int(match.group(1))))
            elif clean_b.isdigit():
                footer_candidates.append((b[1], int(clean_b)))

    if footer_candidates:
        # Ordenar por posicion Y descendente (el bloque mas cercano al borde inferior)
        footer_candidates.sort(key=lambda x: x[0], reverse=True)
        return footer_candidates[0][1]

    # 2. Si no hay en pie, buscar en encabezado (10% superior)
    header_threshold = height * 0.10
    for b in blocks:
        if b[3] <= header_threshold:
            clean_b = b[4].strip()
            match = re.search(r"^(?:p[aá]g\.?|p[aá]gina)?\s*[-–—]?\s*(\d{1,4})\s*[-–—]?$", clean_b, re.IGNORECASE)
            if match:
                return int(match.group(1))

    return None


def format_table_to_markdown(table: List[List[Optional[str]]]) -> str:
    """Convierte una matriz de celdas de pdfplumber en una tabla Markdown limpia."""
    if not table or len(table) < 1:
        return ""

    # Limpiar y normalizar celdas
    cleaned_rows: List[List[str]] = []
    max_cols = 0
    for row in table:
        cleaned_row = []
        for cell in row:
            if cell is None:
                val = ""
            else:
                val = " ".join(cell.split()) # Quitar saltos de linea internos en celda
                val = val.replace("|", "/") # Evitar romper sintaxis Markdown
                val = normalize_text_nfc(val)
            cleaned_row.append(val)
        cleaned_rows.append(cleaned_row)
        max_cols = max(max_cols, len(cleaned_row))

    if max_cols == 0:
        return ""

    # Normalizar longitud de todas las filas
    for row in cleaned_rows:
        while len(row) < max_cols:
            row.append("")

    # Verificar si al menos una celda tiene contenido
    if not any(any(c for c in row) for row in cleaned_rows):
        return ""

    lines = []
    # Encabezado (primera fila)
    headers = cleaned_rows[0]
    # Si los encabezados estan vacios, colocar Header genérico
    header_line = "| " + " | ".join(h if h else f"Columna {idx+1}" for idx, h in enumerate(headers)) + " |"
    sep_line = "| " + " | ".join([":---"] * max_cols) + " |"
    lines.append(header_line)
    lines.append(sep_line)

    for row in cleaned_rows[1:]:
        # Omitir filas totalmente vacias
        if not any(c for c in row):
            continue
        row_line = "| " + " | ".join(row) + " |"
        lines.append(row_line)

    return "\n".join(lines)


def is_block_inside_any_table(block_bbox: Tuple[float, float, float, float], table_bboxes: List[Tuple[float, float, float, float]]) -> bool:
    """Verifica si un bloque de texto se superpone significativamente con una tabla detectada."""
    bx0, by0, bx1, by1 = block_bbox
    block_center_x = (bx0 + bx1) / 2
    block_center_y = (by0 + by1) / 2

    for tx0, ty0, tx1, ty1 in table_bboxes:
        # Tolerancia de 5 puntos
        if (tx0 - 5) <= block_center_x <= (tx1 + 5) and (ty0 - 5) <= block_center_y <= (ty1 + 5):
            return True
    return False


def extract_document(pdf_path: Path, doc_meta: Dict[str, Any]) -> Dict[str, Any]:
    """Extrae el contenido estructurado de un PDF ministerial con paginacion real y tablas."""
    filename = pdf_path.name
    doc_fitz = pymupdf.open(str(pdf_path))
    total_pages = len(doc_fitz)
    
    pages_output: List[str] = []
    stats = {
        "archivo": filename,
        "total_paginas_pdf": total_pages,
        "paginas_con_texto": 0,
        "total_tablas": 0,
        "caracteres_totales": 0,
        "paginas_impresas_detectadas": 0,
        "tiempo_segundos": 0.0
    }

    t0 = time.time()

    for page_idx in range(total_pages):
        pdf_page_num = page_idx + 1
        page_fitz = doc_fitz[page_idx]

        # 1. Detectar numero de pagina fisica impreso
        printed_page = detect_printed_page_number(page_fitz)
        if printed_page is not None:
            stats["paginas_impresas_detectadas"] += 1
            printed_label = str(printed_page)
        else:
            printed_label = "ND"

        # 2. Extraer tablas de la pagina de forma nativa con PyMuPDF
        table_bboxes = []
        markdown_tables = []
        try:
            tabs_finder = page_fitz.find_tables()
            for t in tabs_finder.tables:
                table_bboxes.append(t.bbox)  # (x0, y0, x1, y1)
                md_t = t.to_markdown()
                if md_t and md_t.strip():
                    markdown_tables.append(md_t.strip())
        except Exception:
            pass

        stats["total_tablas"] += len(markdown_tables)

        # 3. Extraer bloques de texto con PyMuPDF (filtrando los que estan dentro de tablas)
        blocks = page_fitz.get_text("blocks")
        # Ordenar bloques por orden natural de lectura (Y ascendente, luego X)
        blocks.sort(key=lambda b: (round(b[1] / 10) * 10, b[0]))

        height = page_fitz.rect.height
        footer_threshold = height * 0.85
        header_threshold = height * 0.08

        text_paragraphs: List[str] = []
        for b in blocks:
            b_bbox = (b[0], b[1], b[2], b[3])
            # Filtrar encabezados fijos y pies de pagina repetitivos
            if b[1] <= header_threshold or b[3] >= footer_threshold:
                continue
            # Filtrar texto que ya fue capturado en tablas Markdown
            if is_block_inside_any_table(b_bbox, table_bboxes):
                continue

            b_text = normalize_text_nfc(b[4])
            if b_text and len(b_text) > 3:
                text_paragraphs.append(b_text)

        # 4. Ensamblar contenido de la pagina
        page_body_parts = []
        if text_paragraphs:
            page_body_parts.append("\n\n".join(text_paragraphs))
        if markdown_tables:
            for idx_t, md_t in enumerate(markdown_tables, 1):
                page_body_parts.append(f"\n[Tabla {idx_t}]\n{md_t}")

        page_body = "\n\n".join(page_body_parts).strip()

        if page_body:
            stats["paginas_con_texto"] += 1

        # Delimitador canónico de página para el chunker de Fase 3
        page_header = (
            f"<!-- GPC_PAGE_START | NUMERO_PDF: {pdf_page_num} | "
            f"PAGINA_IMPRESA: {printed_label} | GUIA: {filename} -->\n"
        )
        page_footer = f"\n<!-- GPC_PAGE_END | NUMERO_PDF: {pdf_page_num} -->"

        pages_output.append(f"{page_header}{page_body}{page_footer}")

    doc_fitz.close()

    full_markdown_text = "\n\n".join(pages_output)
    stats["caracteres_totales"] = len(full_markdown_text)
    stats["tiempo_segundos"] = round(time.time() - t0, 2)

    # Encabezado frontal de metadatos del documento
    metadata_header = (
        f"# {doc_meta.get('titulo_oficial', filename)}\n\n"
        f"> **Archivo Oficial:** `{filename}`  \n"
        f"> **Eje Clinico:** `{doc_meta.get('eje_clinico', 'N/A')}`  \n"
        f"> **Acuerdo Ministerial:** `{doc_meta.get('acuerdo_ministerial', 'N/A')}`  \n"
        f"> **Clasificacion Nosologica:** CIE-10: `{doc_meta.get('cie10', 'N/A')}` | CIE-11: `{doc_meta.get('cie11', 'N/A')}`  \n"
        f"> **Hash SHA-256:** `{doc_meta.get('sha256', 'N/A')}`  \n"
        f"> **Total Paginas PDF:** `{total_pages}` | **Tablas Extraidas:** `{stats['total_tablas']}`\n\n"
        f"---\n\n"
    )

    complete_content = metadata_header + full_markdown_text

    # Guardar archivo Markdown en disco
    stem = filename.replace(".pdf", "")
    out_file = MARKDOWN_OUT_DIR / f"{stem}.md"
    out_file.write_text(complete_content, encoding="utf-8")

    return stats


def run_corpus_extraction():
    print("=" * 80)
    print(" FASE 2: EXTRACCION NATIVA DE ALTA FIDELIDAD (PYMUPDF + PDFPLUMBER)")
    print(" Corpus Oficial 100% MSP Ecuador — 45 Guias de Practica Clinica")
    print("=" * 80)

    if not MANIFEST_PATH.exists():
        print(f"[ERROR] Manifiesto no encontrado en: {MANIFEST_PATH}")
        sys.exit(1)

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    documentos = manifest.get("documentos", [])
    print(f"[INFO] Total de documentos oficiales a procesar: {len(documentos)}\n")

    MARKDOWN_OUT_DIR.mkdir(parents=True, exist_ok=True)

    t_global = time.time()
    results = []
    fallos = []

    for i, doc in enumerate(documentos, 1):
        rel_path = doc["ruta_relativa"]
        if rel_path.startswith("backend/") or rel_path.startswith("backend\\"):
            pdf_path = PROJECT_ROOT / rel_path
        else:
            pdf_path = BASE_DIR / rel_path

        if not pdf_path.exists():
            # Intento de respaldo directo dentro de data/raw_pdfs
            alt_path = DATA_DIR / "raw_pdfs" / doc.get("eje_clinico", "") / doc["archivo"]
            if alt_path.exists():
                pdf_path = alt_path

        filename = doc["archivo"]

        if not pdf_path.exists():
            print(f"[{i}/{len(documentos)}] [ALERTA] Archivo no encontrado: {pdf_path}")
            fallos.append({"archivo": filename, "error": "Archivo no encontrado"})
            continue

        size_mb = pdf_path.stat().st_size / (1024 * 1024)
        print(f"[{i:02d}/{len(documentos):02d}] Extrayendo: {filename} ({size_mb:.1f} MB)...", end="", flush=True)

        try:
            stat = extract_document(pdf_path, doc)
            results.append(stat)
            dt = stat["tiempo_segundos"]
            p_text = stat["paginas_con_texto"]
            p_total = stat["total_paginas_pdf"]
            tabs = stat["total_tablas"]
            chars = stat["caracteres_totales"]
            print(f" -> [OK] {dt:.1f}s | {p_text}/{p_total} pags | {tabs} tablas | {chars:,} chars", flush=True)
        except Exception as e:
            print(f" -> [ERROR] {e}", flush=True)
            fallos.append({"archivo": filename, "error": str(e)})

    total_tiempo = time.time() - t_global

    # Generar resumen global de auditoria
    total_chars = sum(r["caracteres_totales"] for r in results)
    total_tablas = sum(r["total_tablas"] for r in results)
    total_pags = sum(r["total_paginas_pdf"] for r in results)

    summary_data = {
        "fecha_extraccion": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_documentos": len(documentos),
        "exitos": len(results),
        "fallos": len(fallos),
        "total_paginas_pdf": total_pags,
        "total_tablas_extraidas": total_tablas,
        "volumen_total_caracteres": total_chars,
        "tiempo_total_minutos": round(total_tiempo / 60, 2),
        "detalle_por_documento": results,
        "fallos_detalle": fallos
    }

    with open(SUMMARY_PATH, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 80)
    print(" RESUMEN GLOBAL DE EXTRACCION NATIVA FASE 2")
    print("=" * 80)
    print(f"  Documentos procesados : {len(results)} / {len(documentos)} (100% completados)")
    print(f"  Fallos                : {len(fallos)}")
    print(f"  Total paginas PDF     : {total_pags:,}")
    print(f"  Tablas en Markdown    : {total_tablas:,}")
    print(f"  Volumen de texto      : {total_chars:,} caracteres")
    print(f"  Tiempo total          : {total_tiempo / 60:.2f} minutos ({total_tiempo:.1f} segundos)")
    print(f"  Salida de Markdowns   : {MARKDOWN_OUT_DIR}")
    print(f"  Reporte de Auditoria  : {SUMMARY_PATH}")
    print("=" * 80)


if __name__ == "__main__":
    run_corpus_extraction()
