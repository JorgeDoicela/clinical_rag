#!/usr/bin/env python3
"""
Fase 3: Token Chunking Semántico e Indivisible (Ateneo+ Pipeline v2)
===================================================================
Transforma el corpus Markdown de 44 GPCs del MSP en chunks estructurados
con delimitación por tokens del modelo BGE-M3 (512 tokens objetivo),
preservación estricta de tablas clínicas intactas (hasta 768 tokens) y
metadatos normalizados (CIE-10, CIE-11, paginación real, eje clínico y SHA-256).

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
        logger.info("Tokenizador BGE-M3 cargado exitosamente desde %s", tokenizer_file)

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

        # Fallback si no hay etiquetas de página (trata todo el documento como página 1)
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
        Retorna la lista de bloques y la sección clínica activa actualizada.
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
                    # Saltar líneas vacías intermedias
                    while i < n and not lines[i].strip():
                        i += 1

                # Acumular todas las filas contiguas de la tabla
                while i < n:
                    cur_line = lines[i].strip()
                    if cur_line.startswith("|") and cur_line.endswith("|") and cur_line.count("|") >= 2:
                        table_lines.append(cur_line)
                        i += 1
                    elif not cur_line:
                        # Una línea vacía podría ser separación interna o fin de tabla
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

            # 2. Detección de Encabezados Clínicos (#, ##, ###, o números romanos / arábigos con título)
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

            # 3. Párrafo de texto regular (acumula hasta encontrar línea en blanco, tabla o encabezado)
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

    def split_large_table(self, table_text: str, max_tokens: int) -> List[str]:
        """
        Si una tabla clínica sobrepasa el límite máximo (768 tokens), la divide por filas completas,
        asegurando que cada fragmento conserve las filas de encabezado y separador intactas.
        """
        lines = [ln.strip() for ln in table_text.split("\n") if ln.strip()]
        if len(lines) <= 3:
            return [table_text]

        # Extraer posible etiqueta [Tabla X]
        table_tag = ""
        start_idx = 0
        if re.match(r"^\[Tabla\s+\d+\]", lines[0], re.IGNORECASE):
            table_tag = lines[0] + "\n"
            start_idx = 1

        if start_idx >= len(lines) - 2:
            return [table_text]

        header_row = lines[start_idx]
        separator_row = lines[start_idx + 1] if start_idx + 1 < len(lines) else "|---|---|"
        data_rows = lines[start_idx + 2:]

        sub_tables = []
        current_rows = []

        for row in data_rows:
            candidate = f"{table_tag}{header_row}\n{separator_row}\n" + "\n".join(current_rows + [row])
            if self.count_tokens(candidate) > max_tokens and current_rows:
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
        Aplica empaquetado de bloques con solapamiento y preservación indivisible de tablas.
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

        # 2. Empaquetado de bloques en chunks de tokens
        chunks: List[ClinicalChunk] = []
        doc_stem = Path(doc_meta["archivo"]).stem
        chunk_counter = 1

        current_block_list: List[AtomicBlock] = []
        current_token_count = 0

        def emit_chunk(blocks: List[AtomicBlock]) -> Optional[ClinicalChunk]:
            nonlocal chunk_counter
            if not blocks:
                return None

            # Construir texto ensamblado
            assembled_texts = []
            tipos = set()
            for b in blocks:
                assembled_texts.append(b.contenido)
                tipos.add(b.tipo)

            assembled_text = "\n\n".join(assembled_texts).strip()
            num_tokens = self.count_tokens(assembled_text)

            if num_tokens < 10:  # Descartar ruido residual microscópico
                return None

            # Determinar tipo de contenido
            if "table" in tipos and len(tipos) == 1:
                tipo_contenido = "tabla"
            elif "table" in tipos:
                tipo_contenido = "mixto"
            else:
                tipo_contenido = "texto"

            # Metadatos del primer bloque sustancial
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

            # Caso especial: Tabla indivisible
            if block.tipo == "table":
                # Si la tabla por sí sola excede MAX_TABLE_TOKENS (768), subdividir por filas
                if block.num_tokens > MAX_TABLE_TOKENS:
                    sub_tables = self.split_large_table(block.contenido, TARGET_CHUNK_TOKENS)
                    for st in sub_tables:
                        # Si hay contenido previo acumulado, emitirlo primero
                        if current_block_list:
                            ck = emit_chunk(current_block_list)
                            if ck:
                                chunks.append(ck)
                            current_block_list = []
                            current_token_count = 0

                        st_tokens = self.count_tokens(st)
                        st_block = AtomicBlock(
                            tipo="table",
                            contenido=st,
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
                # Si agregarla a la ventana actual excede TARGET_CHUNK_TOKENS:
                if current_token_count + block.num_tokens > TARGET_CHUNK_TOKENS:
                    if current_block_list:
                        ck = emit_chunk(current_block_list)
                        if ck:
                            chunks.append(ck)
                        current_block_list = []
                        current_token_count = 0

                # Agregar la tabla íntegra
                current_block_list.append(block)
                current_token_count += block.num_tokens

                # Si la tabla ya es sustancial (>= 300 tokens), emitirla sola para que quede pura
                if current_token_count >= 300:
                    ck = emit_chunk(current_block_list)
                    if ck:
                        chunks.append(ck)
                    current_block_list = []
                    current_token_count = 0

                i += 1
                continue

            # Bloque regular (párrafo o encabezado)
            if current_token_count + block.num_tokens <= TARGET_CHUNK_TOKENS:
                current_block_list.append(block)
                current_token_count += block.num_tokens
                i += 1
            else:
                # La ventana actual se saturó, emitir el chunk
                if current_block_list:
                    ck = emit_chunk(current_block_list)
                    if ck:
                        chunks.append(ck)

                # Calcular solapamiento (overlap) para la siguiente ventana
                overlap_blocks: List[AtomicBlock] = []
                overlap_tokens = 0
                for prev_block in reversed(current_block_list):
                    if prev_block.tipo == "table":
                        # No solapamos tablas completas para no duplicar datos tabulares pesados
                        break
                    if overlap_tokens + prev_block.num_tokens <= OVERLAP_TOKENS:
                        overlap_blocks.insert(0, prev_block)
                        overlap_tokens += prev_block.num_tokens
                    else:
                        break

                current_block_list = overlap_blocks + [block]
                current_token_count = overlap_tokens + block.num_tokens
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
    logger.info("Iniciando Fase 3: Token Chunking Semántico e Indivisible (BGE-M3)")
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
        },
        "desglose_por_tipo": desglose_por_tipo,
        "desglose_por_eje": desglose_por_eje,
        "tiempo_total_segundos": round(time.time() - t0, 2),
        "detalle_por_documento": stats_por_doc,
    }

    with open(OUTPUT_SUMMARY_FILE, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, ensure_ascii=False, indent=2)

    logger.info("=================================================================")
    logger.info("Fase 3 Completada Exitosamente")
    logger.info("Total Chunks: %d", total_chunks)
    logger.info("Tokens: Media = %.1f, Mediana = %d, P95 = %d, Max = %d",
                summary_data["distribucion_tokens"]["media_tokens"],
                median_tokens,
                p95_tokens,
                summary_data["distribucion_tokens"]["max_tokens"])
    logger.info("Desglose por tipo: %s", json.dumps(desglose_por_tipo))
    logger.info("Tiempo Total: %.2f segundos", summary_data["tiempo_total_segundos"])
    logger.info("Archivos generados:")
    logger.info(" - %s", OUTPUT_CHUNKS_FILE)
    logger.info(" - %s", OUTPUT_SUMMARY_FILE)
    logger.info("=================================================================")


if __name__ == "__main__":
    run_pipeline()
