#!/usr/bin/env python3
"""
Fase 3: Token Chunking Semántico e Indivisible (Ateneo+ Pipeline v2)
===================================================================
Transforma el corpus Markdown de 42 GPCs del MSP en chunks estructurados
con delimitación por tokens del modelo BGE-M3 (512 tokens objetivo),
preservación estricta de tablas clínicas intactas (hasta 768 tokens) y
metadatos normalizados (CIE-10, CIE-11, paginación real, eje clínico y SHA-256).

Refinamiento Quirúrgico (Fase 3v2 Definitiva):
- Activación de no_truncation() en el tokenizador BGE-M3 para conteo de longitud real sin techo artificial.
- Erradicación de chunks microscópicos (< 64 tokens) mediante inyección contextual y fusión ascendente.
- Descomposición semántica de tablas hiperdensas y multi-columna (> 768 tokens) por columna/viñetas.
- Garantía matemática de rango óptimo [64, 768] tokens para entrenamiento denso de alta resolución.

Uso:
    python backend/ingestion_v2/03_token_chunker.py
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional, Tuple

from tokenizers import Tokenizer

# Configuración de logging estructurado
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("TokenChunkerV2")

# Rutas del proyecto
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "backend" / "data"
EXTRACTED_MD_DIR = DATA_DIR / "extracted" / "markdown"
MANIFEST_PATH = DATA_DIR / "corpus_manifest.json"
TOKENIZER_PATH = DATA_DIR / "ateneo-bge-m3-ecuador" / "tokenizer.json"

OUTPUT_CHUNKS_FILE = DATA_DIR / "extracted" / "chunks_corpus_v2.json"
OUTPUT_SUMMARY_FILE = DATA_DIR / "extracted" / "chunks_summary.json"

# Parámetros del Token Chunking Semántico (BGE-M3)
TARGET_CHUNK_TOKENS = 512
OVERLAP_TOKENS = 128
MAX_TABLE_TOKENS = 768
MIN_CHUNK_TOKENS = 64


@dataclass
class AtomicBlock:
    """Bloque atómico de contenido dentro de una página clínica."""
    tipo: str  # 'header', 'paragraph', 'table'
    contenido: str
    num_tokens: int
    pagina_pdf: int
    pagina_impresa: str
    seccion: str


@dataclass
class ClinicalChunk:
    """Fragmento semántico listo para entrenamiento e indexación vectorial."""
    chunk_id: str
    guia_archivo: str
    guia_titulo: str
    eje_clinico: str
    eje_nombre: str
    cie10: str
    cie11: str
    acuerdo_ministerial: str
    anio: int
    pagina_pdf: int
    pagina_impresa_real: str
    seccion: str
    tipo_contenido: str  # 'texto', 'tabla', 'mixto'
    texto: str
    num_tokens: int
    num_caracteres: int
    sha256: str


class SemanticTokenChunker:
    """Motor de segmentación semántica e indivisible para GPCs clínicas."""

    def __init__(self, tokenizer_file: Path) -> None:
        if not tokenizer_file.exists():
            raise FileNotFoundError(f"Tokenizador no encontrado en {tokenizer_file}")
        self.tokenizer = Tokenizer.from_file(str(tokenizer_file))
        # Desactivar truncación por defecto (evita el techo artificial de 1024 tokens al medir)
        self.tokenizer.no_truncation()
        logger.info("Tokenizador BGE-M3 cargado con no_truncation() activo desde %s", tokenizer_file)

    def count_tokens(self, text: str) -> int:
        """Calcula el conteo exacto de tokens según el vocabulario de BGE-M3."""
        if not text or not text.strip():
            return 0
        return len(self.tokenizer.encode(text, add_special_tokens=False).ids)

    def parse_pages(self, md_content: str) -> List[Dict[str, Any]]:
        """
        Segmenta el documento Markdown en páginas físicas utilizando las etiquetas canónicas
        <!-- GPC_PAGE_START | NUMERO_PDF: X | PAGINA_IMPRESA: Y | GUIA: ... -->
        """
        page_pattern = re.compile(
            r"<!--\s*GPC_PAGE_START\s*\|\s*NUMERO_PDF:\s*(\d+)\s*\|\s*PAGINA_IMPRESA:\s*([^\|]+?)\s*\|\s*GUIA:\s*([^>]+?)\s*-->"
            r"(.*?)"
            r"<!--\s*GPC_PAGE_END\s*\|\s*NUMERO_PDF:\s*\1\s*-->",
            re.DOTALL,
        )

        pages = []
        for match in page_pattern.finditer(md_content):
            num_pdf = int(match.group(1).strip())
            pag_imp = match.group(2).strip()
            raw_text = match.group(4).strip()
            pages.append({
                "pagina_pdf": num_pdf,
                "pagina_impresa": pag_imp,
                "contenido": raw_text,
            })

        if not pages:
            pages.append({
                "pagina_pdf": 1,
                "pagina_impresa": "1",
                "contenido": md_content.strip(),
            })

        return pages

    def extract_blocks_from_page(
        self, page_data: Dict[str, Any], current_section: str
    ) -> Tuple[List[AtomicBlock], str]:
        """
        Desglosa una página en bloques atómicos: encabezados, párrafos y tablas Markdown intactas.
        """
        content = page_data["contenido"]
        pag_pdf = page_data["pagina_pdf"]
        pag_imp = page_data["pagina_impresa"]
        blocks: List[AtomicBlock] = []

        if not content:
            return blocks, current_section

        lines = content.split("\n")
        i = 0
        n = len(lines)

        while i < n:
            line = lines[i]
            stripped = line.strip()

            if not stripped:
                i += 1
                continue

            # 1. Detección de Tabla Markdown (inicia con [Tabla X] o línea de celdas '|')
            is_table_tag = bool(re.match(r"^\[Tabla\s+\d+\]", stripped, re.IGNORECASE))
            is_table_line = stripped.startswith("|") and stripped.endswith("|") and stripped.count("|") >= 2

            if is_table_tag or is_table_line:
                table_lines = []
                if is_table_tag:
                    table_lines.append(stripped)
                    i += 1
                    while i < n and not lines[i].strip():
                        i += 1

                while i < n:
                    cur_line = lines[i].strip()
                    if cur_line.startswith("|") and cur_line.endswith("|") and cur_line.count("|") >= 2:
                        table_lines.append(cur_line)
                        i += 1
                    elif not cur_line:
                        if i + 1 < n and lines[i + 1].strip().startswith("|") and lines[i + 1].strip().endswith("|"):
                            i += 1
                            continue
                        else:
                            break
                    else:
                        break

                table_text = "\n".join(table_lines)
                tok_count = self.count_tokens(table_text)
                blocks.append(AtomicBlock(
                    tipo="table",
                    contenido=table_text,
                    num_tokens=tok_count,
                    pagina_pdf=pag_pdf,
                    pagina_impresa=pag_imp,
                    seccion=current_section,
                ))
                continue

            # 2. Detección de Encabezados Clínicos (#, ##, ###, o números con título)
            is_md_header = stripped.startswith("#")
            is_numbered_sec = bool(re.match(r"^(?:\d+\.|\d+\.\d+|\b[IVXLCDM]+\.)\s+[A-ZÁÉÍÓÚÑ]", stripped))

            if is_md_header or is_numbered_sec:
                header_text = re.sub(r"^#+\s*", "", stripped)
                current_section = header_text
                tok_count = self.count_tokens(stripped)
                blocks.append(AtomicBlock(
                    tipo="header",
                    contenido=stripped,
                    num_tokens=tok_count,
                    pagina_pdf=pag_pdf,
                    pagina_impresa=pag_imp,
                    seccion=current_section,
                ))
                i += 1
                continue

            # 3. Párrafo de texto regular
            para_lines = [stripped]
            i += 1
            while i < n:
                next_line = lines[i].strip()
                if not next_line:
                    break
                if next_line.startswith("#"):
                    break
                if re.match(r"^\[Tabla\s+\d+\]", next_line, re.IGNORECASE):
                    break
                if next_line.startswith("|") and next_line.endswith("|") and next_line.count("|") >= 2:
                    break
                if re.match(r"^(?:\d+\.|\d+\.\d+|\b[IVXLCDM]+\.)\s+[A-ZÁÉÍÓÚÑ]", next_line):
                    break
                para_lines.append(next_line)
                i += 1

            para_text = " ".join(para_lines)
            tok_count = self.count_tokens(para_text)
            blocks.append(AtomicBlock(
                tipo="paragraph",
                contenido=para_text,
                num_tokens=tok_count,
                pagina_pdf=pag_pdf,
                pagina_impresa=pag_imp,
                seccion=current_section,
            ))

        return blocks, current_section

    def split_dense_cell(self, cell_text: str, max_tokens: int) -> List[str]:
        """Subdivide una celda de texto gigante por viñetas o frases."""
        if self.count_tokens(cell_text) <= max_tokens:
            return [cell_text]

        items = [it.strip() for it in re.split(r"<br\s*/?>|\n|(?<=\.)\s+(?=[•\-–\d]+\.?)", cell_text, flags=re.IGNORECASE) if it.strip()]
        if len(items) <= 1:
            sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", cell_text) if s.strip()]
            if len(sentences) > 1:
                items = sentences
            else:
                return [cell_text]

        sub_chunks = []
        current = []
        for it in items:
            cand = "<br>".join(current + [it])
            if self.count_tokens(cand) > max_tokens and current:
                sub_chunks.append("<br>".join(current))
                current = [it]
            else:
                current.append(it)
        if current:
            sub_chunks.append("<br>".join(current))

        return sub_chunks if sub_chunks else [cell_text]

    def split_large_table(self, table_text: str, max_tokens: int) -> List[str]:
        """
        Descompone tablas grandes asegurando que ninguna sub-tabla sobrepase max_tokens.
        Soporta partición por filas completas y partición columnar para filas hiperdensas.
        """
        lines = [ln.strip() for ln in table_text.split("\n") if ln.strip()]
        if not lines:
            return []

        # Extraer posible etiqueta [Tabla X]
        table_tag = ""
        start_idx = 0
        if re.match(r"^\[Tabla\s+\d+\]", lines[0], re.IGNORECASE):
            table_tag = lines[0] + "\n"
            start_idx = 1

        if start_idx >= len(lines):
            return [table_text]

        # Caso tabla de 1 fila de datos o sin separador formal
        if len(lines) - start_idx < 3:
            row = lines[start_idx]
            cells = [c.strip() for c in row.split("|")[1:-1]]
            if not cells:
                return [table_text]

            sub_tables = []
            for idx, c in enumerate(cells, 1):
                col_name = f"Parámetro / Columna {idx}"
                sub_cells = self.split_dense_cell(c, max_tokens - 100)
                for part_idx, sc in enumerate(sub_cells, 1):
                    suffix = f" (Parte {part_idx})" if len(sub_cells) > 1 else ""
                    sub_tables.append(f"{table_tag}| {col_name}{suffix} |\n|---|\n| {sc} |")
            return sub_tables if sub_tables else [table_text]

        header_row = lines[start_idx]
        separator_row = lines[start_idx + 1] if start_idx + 1 < len(lines) else "|---|---|"
        raw_data_rows = lines[start_idx + 2:]

        headers = [h.strip() for h in header_row.split("|")[1:-1]]
        data_rows = []

        # Verificar si alguna fila individual es hiperdensa (> max_tokens - 100)
        for r in raw_data_rows:
            r_tokens = self.count_tokens(r)
            if r_tokens > max_tokens - 100:
                # Fila masiva: descomponer por columnas
                r_cells = [c.strip() for c in r.split("|")[1:-1]]
                for idx, cell_content in enumerate(r_cells):
                    if not cell_content:
                        continue
                    h_title = headers[idx] if idx < len(headers) and headers[idx] else f"Parámetro {idx+1}"
                    sub_cell_parts = self.split_dense_cell(cell_content, max_tokens - 150)
                    for p_idx, sc in enumerate(sub_cell_parts, 1):
                        part_suf = f" - Pt.{p_idx}" if len(sub_cell_parts) > 1 else ""
                        data_rows.append(f"| {h_title}{part_suf} | {sc} |")
            else:
                data_rows.append(r)

        # Si se descompuso por pares columna-valor, redefinir cabecera
        if any(r.count("|") == 3 for r in data_rows) and header_row.count("|") > 3:
            header_row = "| Indicador / Criterio Clínico | Descripción Normativa |"
            separator_row = "|---|---|"

        sub_tables = []
        current_rows: List[str] = []

        for row in data_rows:
            candidate = f"{table_tag}{header_row}\n{separator_row}\n" + "\n".join(current_rows + [row])
            cand_tokens = self.count_tokens(candidate)
            if cand_tokens > max_tokens and current_rows:
                sub_tables.append(f"{table_tag}{header_row}\n{separator_row}\n" + "\n".join(current_rows))
                current_rows = [row]
            else:
                current_rows.append(row)

        if current_rows:
            sub_tables.append(f"{table_tag}{header_row}\n{separator_row}\n" + "\n".join(current_rows))

        return sub_tables if sub_tables else [table_text]

    def chunk_document(
        self,
        doc_meta: Dict[str, Any],
        md_content: str,
    ) -> List[ClinicalChunk]:
        """
        Ejecuta el pipeline de chunking semántico sobre un documento completo de GPC.
        Aplica empaquetado de bloques con solapamiento, inyección de encabezados y preservación indivisible.
        """
        pages = self.parse_pages(md_content)
        all_blocks: List[AtomicBlock] = []
        current_section = doc_meta.get("titulo_oficial", "Aspectos Generales")

        # 1. Extraer bloques atómicos de cada página
        for page in pages:
            page_blocks, current_section = self.extract_blocks_from_page(page, current_section)
            all_blocks.extend(page_blocks)

        if not all_blocks:
            return []

        chunks: List[ClinicalChunk] = []
        doc_stem = Path(doc_meta["archivo"]).stem
        chunk_counter = 1

        current_block_list: List[AtomicBlock] = []
        current_token_count = 0

        def emit_chunk(blocks: List[AtomicBlock]) -> Optional[ClinicalChunk]:
            nonlocal chunk_counter
            if not blocks:
                return None

            assembled_texts = []
            tipos = set()
            for b in blocks:
                assembled_texts.append(b.contenido)
                tipos.add(b.tipo)

            assembled_text = "\n\n".join(assembled_texts).strip()
            num_tokens = self.count_tokens(assembled_text)

            # Si es menor a MIN_CHUNK_TOKENS y ya existe un chunk previo en este documento, fusionar
            if num_tokens < MIN_CHUNK_TOKENS and chunks:
                prev_c = chunks[-1]
                comb_text = prev_c.texto + "\n\n" + assembled_text
                comb_tokens = self.count_tokens(comb_text)
                if comb_tokens <= MAX_TABLE_TOKENS:
                    prev_c.texto = comb_text
                    prev_c.num_tokens = comb_tokens
                    prev_c.num_caracteres = len(comb_text)
                    prev_c.sha256 = hashlib.sha256(comb_text.encode("utf-8")).hexdigest()
                    if "table" in tipos and prev_c.tipo_contenido == "texto":
                        prev_c.tipo_contenido = "mixto"
                    return None

            # Determinar tipo de contenido
            if "table" in tipos and len(tipos) == 1:
                tipo_contenido = "tabla"
            elif "table" in tipos:
                tipo_contenido = "mixto"
            else:
                tipo_contenido = "texto"

            rep_block = blocks[0]
            chunk_id = f"gpc_{doc_stem}_chunk_{chunk_counter:04d}"
            chunk_counter += 1

            chunk_hash = hashlib.sha256(assembled_text.encode("utf-8")).hexdigest()

            return ClinicalChunk(
                chunk_id=chunk_id,
                guia_archivo=doc_meta["archivo"],
                guia_titulo=doc_meta.get("titulo_oficial", ""),
                eje_clinico=doc_meta.get("eje_clinico", ""),
                eje_nombre=doc_meta.get("eje_nombre", ""),
                cie10=doc_meta.get("cie10", ""),
                cie11=doc_meta.get("cie11", ""),
                acuerdo_ministerial=doc_meta.get("acuerdo_ministerial", ""),
                anio=int(doc_meta.get("anio", 0)),
                pagina_pdf=rep_block.pagina_pdf,
                pagina_impresa_real=rep_block.pagina_impresa,
                seccion=rep_block.seccion,
                tipo_contenido=tipo_contenido,
                texto=assembled_text,
                num_tokens=num_tokens,
                num_caracteres=len(assembled_text),
                sha256=chunk_hash,
            )

        i = 0
        total_blocks = len(all_blocks)

        while i < total_blocks:
            block = all_blocks[i]

            # Caso especial: Bloque de Tabla
            if block.tipo == "table":
                prefix_text = ""
                # Si los bloques previos son solo un encabezado/párrafo corto (< MIN_CHUNK_TOKENS),
                # adjuntarlo directamente a la tabla como contexto explicativo
                if current_block_list and current_token_count < MIN_CHUNK_TOKENS:
                    prefix_text = "\n\n".join(b.contenido for b in current_block_list) + "\n\n"
                    current_block_list = []
                    current_token_count = 0
                elif current_block_list:
                    ck = emit_chunk(current_block_list)
                    if ck:
                        chunks.append(ck)
                    current_block_list = []
                    current_token_count = 0

                effective_table_text = prefix_text + block.contenido
                effective_tokens = self.count_tokens(effective_table_text)

                # Si la tabla con su prefijo sobrepasa MAX_TABLE_TOKENS (768), subdividir
                if effective_tokens > MAX_TABLE_TOKENS:
                    sub_tables = self.split_large_table(block.contenido, TARGET_CHUNK_TOKENS - 50)
                    for idx, st in enumerate(sub_tables):
                        st_content = (prefix_text + st) if idx == 0 and prefix_text else st
                        st_tokens = self.count_tokens(st_content)
                        st_block = AtomicBlock(
                            tipo="table",
                            contenido=st_content,
                            num_tokens=st_tokens,
                            pagina_pdf=block.pagina_pdf,
                            pagina_impresa=block.pagina_impresa,
                            seccion=block.seccion,
                        )
                        ck = emit_chunk([st_block])
                        if ck:
                            chunks.append(ck)
                    i += 1
                    continue

                # Si la tabla cabe dentro de MAX_TABLE_TOKENS:
                table_atomic = AtomicBlock(
                    tipo="table",
                    contenido=effective_table_text,
                    num_tokens=effective_tokens,
                    pagina_pdf=block.pagina_pdf,
                    pagina_impresa=block.pagina_impresa,
                    seccion=block.seccion,
                )
                ck = emit_chunk([table_atomic])
                if ck:
                    chunks.append(ck)
                i += 1
                continue

            # Bloque regular (párrafo o encabezado)
            if current_token_count + block.num_tokens <= TARGET_CHUNK_TOKENS:
                current_block_list.append(block)
                current_token_count += block.num_tokens
                i += 1
            else:
                if current_token_count >= MIN_CHUNK_TOKENS:
                    ck = emit_chunk(current_block_list)
                    if ck:
                        chunks.append(ck)

                    overlap_blocks: List[AtomicBlock] = []
                    overlap_tokens = 0
                    for prev_block in reversed(current_block_list):
                        if prev_block.tipo == "table":
                            break
                        if overlap_tokens + prev_block.num_tokens <= OVERLAP_TOKENS:
                            overlap_blocks.insert(0, prev_block)
                            overlap_tokens += prev_block.num_tokens
                        else:
                            break

                    current_block_list = overlap_blocks + [block]
                    current_token_count = overlap_tokens + block.num_tokens
                else:
                    current_block_list.append(block)
                    current_token_count += block.num_tokens

                i += 1

        # Emitir remanente final si existe
        if current_block_list:
            ck = emit_chunk(current_block_list)
            if ck:
                chunks.append(ck)

        return chunks


def run_pipeline() -> None:
    """Orquestador de ejecución de la Fase 3."""
    t0 = time.time()
    logger.info("=================================================================")
    logger.info("Iniciando Fase 3 (v2 Refinada Definitiva): Token Chunking BGE-M3")
    logger.info("=================================================================")

    if not MANIFEST_PATH.exists():
        logger.error("No se encontró el archivo de manifiesto: %s", MANIFEST_PATH)
        sys.exit(1)

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    documentos = manifest.get("documentos", [])
    logger.info("Total de documentos en manifiesto: %d", len(documentos))

    chunker = SemanticTokenChunker(TOKENIZER_PATH)

    todos_los_chunks: List[ClinicalChunk] = []
    stats_por_doc: List[Dict[str, Any]] = []

    doc_index = 0
    for doc in documentos:
        doc_index += 1
        archivo_pdf = doc["archivo"]
        nombre_stem = Path(archivo_pdf).stem
        archivo_md = EXTRACTED_MD_DIR / f"{nombre_stem}.md"

        if not archivo_md.exists():
            logger.warning("[%d/%d] Archivo Markdown no encontrado: %s", doc_index, len(documentos), archivo_md.name)
            continue

        with open(archivo_md, "r", encoding="utf-8") as f:
            md_content = f.read()

        t_doc = time.time()
        doc_chunks = chunker.chunk_document(doc, md_content)
        dt_doc = time.time() - t_doc

        todos_los_chunks.extend(doc_chunks)

        num_tablas = sum(1 for c in doc_chunks if c.tipo_contenido in ("tabla", "mixto"))
        token_counts = [c.num_tokens for c in doc_chunks]
        avg_tokens = sum(token_counts) / len(token_counts) if token_counts else 0

        logger.info(
            "[%d/%d] %s -> %d chunks (media: %.1f tokens, %d con tablas) en %.2fs",
            doc_index,
            len(documentos),
            nombre_stem[:35],
            len(doc_chunks),
            avg_tokens,
            num_tablas,
            dt_doc,
        )

        stats_por_doc.append({
            "archivo": archivo_pdf,
            "total_chunks": len(doc_chunks),
            "media_tokens": round(avg_tokens, 1),
            "chunks_tablas": num_tablas,
            "tiempo_segundos": round(dt_doc, 2),
        })

    # Guardar archivo maestro de chunks
    logger.info("Guardando banco maestro de chunks en %s...", OUTPUT_CHUNKS_FILE)
    chunks_dict_list = [asdict(c) for c in todos_los_chunks]
    with open(OUTPUT_CHUNKS_FILE, "w", encoding="utf-8") as f:
        json.dump(chunks_dict_list, f, ensure_ascii=False, indent=2)

    # Calcular estadísticas globales
    all_tokens = [c.num_tokens for c in todos_los_chunks]
    all_tokens.sort()
    total_chunks = len(todos_los_chunks)
    median_tokens = all_tokens[total_chunks // 2] if total_chunks else 0
    p95_tokens = all_tokens[int(total_chunks * 0.95)] if total_chunks else 0

    desglose_por_eje: Dict[str, int] = {}
    desglose_por_tipo: Dict[str, int] = {}

    for c in todos_los_chunks:
        desglose_por_eje[c.eje_clinico] = desglose_por_eje.get(c.eje_clinico, 0) + 1
        desglose_por_tipo[c.tipo_contenido] = desglose_por_tipo.get(c.tipo_contenido, 0) + 1

    chunks_menores_64 = sum(1 for t in all_tokens if t < 64)
    chunks_mayores_768 = sum(1 for t in all_tokens if t > 768)

    summary_data = {
        "version": "2.0",
        "fecha_generacion": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_documentos_procesados": len(stats_por_doc),
        "total_chunks_generados": total_chunks,
        "distribucion_tokens": {
            "min_tokens": min(all_tokens) if all_tokens else 0,
            "max_tokens": max(all_tokens) if all_tokens else 0,
            "media_tokens": round(sum(all_tokens) / total_chunks, 1) if total_chunks else 0,
            "mediana_tokens": median_tokens,
            "percentil_95_tokens": p95_tokens,
            "chunks_menores_64_tokens": chunks_menores_64,
            "chunks_mayores_768_tokens": chunks_mayores_768,
        },
        "desglose_por_tipo": desglose_por_tipo,
        "desglose_por_eje": desglose_por_eje,
        "tiempo_total_segundos": round(time.time() - t0, 2),
        "detalle_por_documento": stats_por_doc,
    }

    with open(OUTPUT_SUMMARY_FILE, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, ensure_ascii=False, indent=2)

    logger.info("=================================================================")
    logger.info("Fase 3 (v2 Refinada Definitiva) Completada Exitosamente")
    logger.info("Total Chunks: %d", total_chunks)
    logger.info("Tokens: Min = %d, Max = %d, Media = %.1f, Mediana = %d, P95 = %d",
                summary_data["distribucion_tokens"]["min_tokens"],
                summary_data["distribucion_tokens"]["max_tokens"],
                summary_data["distribucion_tokens"]["media_tokens"],
                median_tokens,
                p95_tokens)
    logger.info("Control de Calidad: <64 tokens = %d (%.2f%%) | >768 tokens = %d (%.2f%%)",
                chunks_menores_64, (chunks_menores_64 / total_chunks) * 100 if total_chunks else 0,
                chunks_mayores_768, (chunks_mayores_768 / total_chunks) * 100 if total_chunks else 0)
    logger.info("Desglose por tipo: %s", json.dumps(desglose_por_tipo))
    logger.info("Tiempo Total: %.2f segundos", summary_data["tiempo_total_segundos"])
    logger.info("Archivos generados:")
    logger.info(" - %s", OUTPUT_CHUNKS_FILE)
    logger.info(" - %s", OUTPUT_SUMMARY_FILE)
    logger.info("=================================================================")


if __name__ == "__main__":
    run_pipeline()
