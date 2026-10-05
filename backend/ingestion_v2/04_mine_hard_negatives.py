#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Ateneo+ Pipeline Científico de Ingesta v2 — Fase 4: Minería Semántica de Hard Negatives
========================================================================================

Este módulo implementa el protocolo de recuperación densa en dos etapas para la extracción
de tripletas de entrenamiento (Anchor / Query, Positive, Hard Negative) a partir del corpus
oficial de 42 Guías de Práctica Clínica del MSP Ecuador (Fase 3: 7,052 chunks).

Arquitectura del Pipeline:
  1. Construcción del Banco de Consultas Clínicas (Casos canónicos, Seed chunks y Chunks normativos).
  2. Etapa 1: Filtrado de candidatos léxico-terminológicos con BM25Okapi (Top-40).
  3. Etapa 2: Re-ranking denso con embeddings BGE-M3 (Top-2 a Top-8 con similitud de coseno).
  4. Filtrado Defensivo Estricto Anti-Falsos Negativos (Misma sección, solapamiento > 65%, ruido).
  5. Partición Científica Estratificada (Train 70%, Val 15%, Blind Test 15%) con semilla fija 42.
  6. Congelamiento Criptográfico con sumas SHA-256 en checksums.sha256.

Autor: Equipo de Investigación Ateneo+
Estándar: Publicación Científica Q1 (Lancet Digital Health / IEEE JBHI)
Fecha: 2026-10-05
"""

import os
import sys
import json
import re
import math
import random
import hashlib
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional, Set
from dataclasses import dataclass, asdict

import numpy as np

# Configurar logging estructurado y sobrio
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("fase4_hard_negatives")

# Rutas canónicas del proyecto
WORKSPACE_DIR = Path(__file__).resolve().parent.parent.parent
CHUNKS_FILE = WORKSPACE_DIR / "backend" / "data" / "extracted" / "chunks_corpus_v2.json"
CASES_FILE = WORKSPACE_DIR / "backend" / "cases_data" / "cases.json"
SEED_CHUNKS_FILE = WORKSPACE_DIR / "backend" / "data" / "seed_chunks.json"
MODEL_LOCAL_DIR = WORKSPACE_DIR / "backend" / "data" / "ateneo-bge-m3-ecuador"

DATASETS_DIR = WORKSPACE_DIR / "backend" / "data" / "datasets"
TRAIN_FILE = DATASETS_DIR / "retrieval_train.json"
VAL_FILE = DATASETS_DIR / "retrieval_val.json"
TEST_BLIND_FILE = DATASETS_DIR / "retrieval_test_blind.json"
CHECKSUMS_FILE = DATASETS_DIR / "checksums.sha256"

# Palabras clave de exclusión para páginas de créditos, portadas e índices
RUIDO_EDITORIAL_PATTERNS = [
    r"edición\s+general",
    r"todos\s+los\s+derechos\s+reservados",
    r"isbn[:\s\-0-9]+",
    r"cdu\s+[0-9]+",
    r"hecho\s+en\s+ecuador",
    r"impreso\s+por",
    r"dirección\s+nacional\s+de\s+normatización\s*–\s*msp",
    r"tabla\s+de\s+contenido",
    r"índice\s+general",
]


@dataclass
class Triplet:
    id: str
    query: str
    pos: str
    neg: str
    guia_fuente: str
    seccion: str
    cie10: str
    cie11: str
    eje_clinico: str
    tipo_negativo: str
    similitud_negativo: float


def set_seed(seed: int = 42) -> None:
    """Fija la semilla en todos los generadores pseudo-aleatorios para reproducibilidad total."""
    random.seed(seed)
    np.random.seed(seed)
    try:
        import torch
        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)
    except ImportError:
        pass


TERMINOS_RUIDO = [
    "portada", "cubierta", "autoridades", "créditos", "creditos", "agradecimiento",
    "índice", "indice", "bibliografía", "bibliografia", "referencias bibliográficas",
    "conflictos de interés", "conflicto de interés", "conflictos de interes",
    "fuente de financiamiento", "tabla de contenido", "isbn", "cdu",
    "edición general", "edicion general", "derechos reservados", "impreso por",
    "revisión de estilo", "hecho en ecuador", "equipo de redacción", "comité editorial",
    "contenido\n", "índice de tablas", "índice de figuras"
]

TERMINOS_MEDICOS_MINIMOS = [
    "paciente", "tratamiento", "diagnostico", "diagnóstico", "dosis", "mg", "criterios",
    "clínica", "clinica", "farmacologico", "farmacológico", "signos", "síntomas", "sintomas",
    "recomendacion", "recomendación", "prevencion", "prevención", "riesgo", "intervencion",
    "intervención", "esquema", "hospital", "terapéutic", "terapeutic", "embaraz", "neonat", "infusión"
]


def es_ruido_editorial(texto: str, seccion: str, tipo_contenido: str = "texto") -> bool:
    """Detecta rigurosamente si un fragmento corresponde a páginas editoriales, legales, índices o carece de sustancia médica."""
    sec_lower = seccion.lower()
    
    # 1. Filtro por nombre de sección
    if any(k in sec_lower for k in TERMINOS_RUIDO):
        return True
    
    # Índices con puntos suspensivos (ej. "Duelo ................. 197")
    if re.search(r"\.{3,}|\_{3,}", seccion):
        return True
    
    # Secciones que son meros listados de abreviaturas o anexos sin sustancia clínica
    if sec_lower.strip().startswith(("anexo", "glosario", "abreviaturas", "siglas")):
        if not any(k in texto.lower() for k in ["dosis", "mg/kg", "tratamiento", "esquema", "fármaco"]):
            return True
            
    # 2. Filtro por contenido inicial del texto
    inicio_texto = texto[:500].lower()
    if any(k in inicio_texto for k in [
        "edición general", "edicion general", "isbn", "cdu ", "todos los derechos reservados",
        "impreso por", "conflictos de interés", "conflicto de interés", "fuente de financiamiento",
        "comité editorial", "dirección nacional de normatización", "contenido\n", "cómo citar esta obra"
    ]):
        return True
    
    # 3. Detección de índices de contenidos (múltiples líneas terminando en números de página)
    lineas_con_num_pagina = len(re.findall(r"\b\d{1,3}\s*$", texto, flags=re.MULTILINE))
    if lineas_con_num_pagina >= 5 and tipo_contenido != "tabla":
        return True
    
    # 4. Exigencia de sustancia médica mínima
    if not any(tm in texto.lower() for tm in TERMINOS_MEDICOS_MINIMOS):
        return True
    
    # 5. Detección de listas de autores, comités de validación y participantes
    cargos_personas = len(re.findall(r"\b(médic[oa]s?|doctor[a]?s?|licenciad[oa]s?|residentes?|especialistas?)\b", texto.lower()))
    if cargos_personas >= 4:
        return True
        
    return False


def calcular_jaccard_bigramas(texto_a: str, texto_b: str) -> float:
    """Calcula la similitud de Jaccard sobre bigramas de palabras para detección de solapamiento."""
    palabras_a = re.findall(r"\b\w{3,}\b", texto_a.lower())
    palabras_b = re.findall(r"\b\w{3,}\b", texto_b.lower())
    
    if len(palabras_a) < 2 or len(palabras_b) < 2:
        return 0.0
    
    bigramas_a = set(zip(palabras_a[:-1], palabras_a[1:]))
    bigramas_b = set(zip(palabras_b[:-1], palabras_b[1:]))
    
    interseccion = len(bigramas_a.intersection(bigramas_b))
    union = len(bigramas_a.union(bigramas_b))
    
    return interseccion / union if union > 0 else 0.0


def normalizar_consulta_clinica(texto: str) -> str:
    """Limpia caracteres de escape y normaliza espacios en consultas clínicas."""
    t = re.sub(r"\s+", " ", texto).strip()
    return t


class BM25Retriever:
    """Recuperador léxico BM25Okapi para filtrado rápido de candidatos en Etapa 1."""
    
    def __init__(self, corpus_chunks: List[Dict[str, Any]]) -> None:
        from rank_bm25 import BM25Okapi
        self.corpus_chunks = corpus_chunks
        self.tokenized_corpus = [
            self._tokenize(f"{c.get('seccion', '')} {c.get('texto', '')}")
            for c in corpus_chunks
        ]
        self.bm25 = BM25Okapi(self.tokenized_corpus)
        logger.info(f"Índice BM25 inicializado con {len(corpus_chunks)} fragmentos.")

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r"\b\w{3,}\b", text.lower())

    def get_top_k(self, query: str, top_k: int = 40) -> List[Tuple[int, float]]:
        tokenized_query = self._tokenize(query)
        scores = self.bm25.get_scores(tokenized_query)
        top_indices = np.argsort(scores)[::-1][:top_k]
        return [(int(idx), float(scores[idx])) for idx in top_indices if scores[idx] > 0]


class DenseSemanticMiner:
    """Minero semántico en dos etapas con BGE-M3 base y filtrado defensivo anti-falsos negativos."""

    def __init__(self, corpus_chunks: List[Dict[str, Any]], model_dir: Path) -> None:
        self.corpus_chunks = corpus_chunks
        self.chunk_id_to_idx = {c["chunk_id"]: i for i, c in enumerate(corpus_chunks)}
        self.bm25 = BM25Retriever(corpus_chunks)
        
        logger.info("Cargando modelo BGE-M3 para re-ranking semántico...")
        from sentence_transformers import SentenceTransformer
        
        # Preferir modelo local fine-tuned si existe, o BAAI/bge-m3 base
        if model_dir.exists() and (model_dir / "model.safetensors").exists():
            logger.info(f"Utilizando pesos locales de BGE-M3 desde: {model_dir}")
            self.model = SentenceTransformer(str(model_dir), device="cpu")
        else:
            logger.info("Utilizando modelo base oficial 'BAAI/bge-m3'...")
            self.model = SentenceTransformer("BAAI/bge-m3", device="cpu")
        
        logger.info("Modelo de embeddings denso inicializado con éxito.")

    def minar_tripletas_batch(
        self,
        banco_consultas: List[Tuple[str, Dict[str, Any], str]],
        top_candidates_bm25: int = 40,
        similitud_max_overlap: float = 0.65,
        max_cands_por_query: int = 8,
        batch_size: int = 32
    ) -> List[Triplet]:
        """
        Ejecuta la minería en dos etapas de forma matricial vectorizada:
          1. Pre-filtrado léxico BM25 y filtrado defensivo anti-falsos negativos para todas las consultas.
          2. Codificación por lotes (batching) con BGE-M3 de queries y candidatos únicos en paralelo.
          3. Re-ranking semántico instantáneo con producto punto de vectores normalizados (similitud coseno).
        """
        logger.info(f"Iniciando Etapa 1: Filtrado léxico BM25 y defensivo para {len(banco_consultas)} consultas...")
        
        # Estructura temporal para almacenar candidatos viables por consulta
        # query_idx -> list of (corpus_chunk_idx, cand_chunk)
        candidatos_por_query: List[List[Tuple[int, Dict[str, Any]]]] = []
        chunks_unicos_necesarios: Set[int] = set()
        consultas_sin_candidatos = 0
        
        for q_idx, (query, pos_chunk, _) in enumerate(banco_consultas):
            pos_chunk_id = pos_chunk["chunk_id"]
            pos_guia = pos_chunk.get("guia_archivo", "")
            pos_seccion = pos_chunk.get("seccion", "")
            pos_texto = pos_chunk.get("texto", "")
            
            top_bm25 = self.bm25.get_top_k(query, top_k=top_candidates_bm25)
            cands_validos: List[Tuple[int, Dict[str, Any]]] = []
            
            for c_idx, _ in top_bm25:
                cand = self.corpus_chunks[c_idx]
                cand_id = cand["chunk_id"]
                
                # Regla 1: No idéntico
                if cand_id == pos_chunk_id:
                    continue
                
                # Regla 2: No misma guía Y misma sección
                cand_guia = cand.get("guia_archivo", "")
                cand_seccion = cand.get("seccion", "")
                if cand_guia == pos_guia and cand_seccion.lower() == pos_seccion.lower():
                    continue
                
                # Regla 3: No ruido editorial ni carencia de sustancia médica
                cand_texto = cand.get("texto", "")
                if es_ruido_editorial(cand_texto, cand_seccion, cand.get("tipo_contenido", "texto")):
                    continue
                
                # Regla 4: Filtro defensivo de solapamiento de n-gramas
                overlap = calcular_jaccard_bigramas(pos_texto, cand_texto)
                if overlap > similitud_max_overlap:
                    continue
                
                cands_validos.append((c_idx, cand))
                chunks_unicos_necesarios.add(c_idx)
                
                if len(cands_validos) >= max_cands_por_query:
                    break
            
            candidatos_por_query.append(cands_validos)
            if not cands_validos:
                consultas_sin_candidatos += 1
        
        logger.info(
            f"Etapa 1 completada. Chunks únicos requeridos para re-ranking: {len(chunks_unicos_necesarios):,} "
            f"(Consultas sin candidatos válidos: {consultas_sin_candidatos})"
        )
        
        # Etapa 2: Codificación densa vectorizada por lotes con BGE-M3
        logger.info(f"Codificando {len(banco_consultas)} consultas con BGE-M3 (batch_size={batch_size})...")
        queries_texto = [q for q, _, _ in banco_consultas]
        query_embeddings = self.model.encode(
            queries_texto,
            batch_size=batch_size,
            show_progress_bar=True,
            normalize_embeddings=True
        )
        
        logger.info(f"Codificando {len(chunks_unicos_necesarios)} fragmentos normativos únicos (batch_size={batch_size})...")
        lista_c_indices = sorted(list(chunks_unicos_necesarios))
        textos_candidatos = [
            f"{self.corpus_chunks[idx].get('seccion', '')}\n{self.corpus_chunks[idx].get('texto', '')[:500]}"
            for idx in lista_c_indices
        ]
        cand_embeddings_array = self.model.encode(
            textos_candidatos,
            batch_size=batch_size,
            show_progress_bar=True,
            normalize_embeddings=True
        )
        
        # Mapa en memoria c_idx -> vector latente
        cand_emb_map: Dict[int, np.ndarray] = {
            c_idx: cand_embeddings_array[pos]
            for pos, c_idx in enumerate(lista_c_indices)
        }
        
        # Etapa 3: Scoring matricial y extracción de tripletas
        logger.info("Etapa 3: Calculando similitud semántica y seleccionando Hard Negatives óptimos...")
        tripletas: List[Triplet] = []
        
        for q_idx, (query, pos_chunk, _) in enumerate(banco_consultas):
            cands = candidatos_por_query[q_idx]
            if not cands:
                continue
            
            q_emb = query_embeddings[q_idx]
            pos_eje = pos_chunk.get("eje_clinico", "")
            
            # Matriz de embeddings de los candidatos viables
            c_vecs = np.array([cand_emb_map[c_idx] for c_idx, _ in cands])
            scores = np.dot(c_vecs, q_emb)
            
            mejor_pos = int(np.argmax(scores))
            mejor_cand = cands[mejor_pos][1]
            mejor_score = float(scores[mejor_pos])
            
            # Clasificar tipo de negativo
            cand_eje = mejor_cand.get("eje_clinico", "")
            if cand_eje == pos_eje:
                tipo_negativo = "Hard Negative Intra-Eje"
            else:
                tipo_negativo = "Hard Negative Inter-Eje"
            
            triplet_id = f"triplet_v2_{len(tripletas) + 1:05d}"
            triplet = Triplet(
                id=triplet_id,
                query=query,
                pos=pos_chunk.get("texto", "").strip(),
                neg=mejor_cand.get("texto", "").strip(),
                guia_fuente=pos_chunk.get("guia_archivo", ""),
                seccion=pos_chunk.get("seccion", "General"),
                cie10=pos_chunk.get("cie10", "ND"),
                cie11=pos_chunk.get("cie11", "ND"),
                eje_clinico=pos_chunk.get("eje_clinico", "general"),
                tipo_negativo=tipo_negativo,
                similitud_negativo=round(mejor_score, 4)
            )
            tripletas.append(triplet)
        
        return tripletas


def generar_consultas_canónicas(
    cases_file: Path,
    seed_chunks_file: Path,
    corpus_chunks: List[Dict[str, Any]]
) -> List[Tuple[str, Dict[str, Any], str]]:
    """Extrae consultas clínicas canónicas de alta fidelidad desde cases.json y seed_chunks.json."""
    consultas: List[Tuple[str, Dict[str, Any], str]] = []
    
    # Mapear chunks por guía o fragmento_id
    chunks_por_guia: Dict[str, List[Dict[str, Any]]] = {}
    for c in corpus_chunks:
        g = c.get("guia_archivo", "").lower()
        chunks_por_guia.setdefault(g, []).append(c)
    
    # 1. Casos Canónicos de Simulación Médica
    if cases_file.exists():
        with open(cases_file, "r", encoding="utf-8") as f:
            cases_data = json.load(f).get("cases", [])
            
        for case in cases_data:
            titulo = case.get("titulo", "")
            pregunta = case.get("pregunta", "")
            guia_asociada = case.get("guia_asociada", "").lower()
            
            # Buscar el chunk más representativo de la guía asociada
            candidatos = []
            for g_name, g_chunks in chunks_por_guia.items():
                if any(term in g_name for term in [guia_asociada, guia_asociada.replace("_", "-")]):
                    candidatos.extend(g_chunks)
            
            if candidatos:
                # Filtrar solo candidatos con sustancia clínica real
                candidatos_clinicos = [
                    c for c in candidatos 
                    if not es_ruido_editorial(c.get("texto", ""), c.get("seccion", ""), c.get("tipo_contenido", "texto"))
                    and len(c.get("texto", "").strip()) >= 150
                ]
                if not candidatos_clinicos:
                    candidatos_clinicos = candidatos
                
                # Seleccionar el chunk con mayor coincidencia de términos clínicos del caso
                terminos_caso = set(re.findall(r"\b\w{4,}\b", f"{titulo} {pregunta}".lower()))
                # Excluir palabras vacías comunes
                terminos_caso -= {"caso", "paciente", "segun", "guia", "practica", "clinica", "ecuador", "describe", "describa", "establezca"}
                
                mejor_chunk = None
                mejor_score = -1
                for c in candidatos_clinicos:
                    texto_cand = f"{c.get('seccion', '')} {c.get('texto', '')}".lower()
                    score = sum(1 for t in terminos_caso if t in texto_cand)
                    if c.get("tipo_contenido") == "tabla":
                        score += 2  # Preferir tablas con esquemas/dosis
                    if score > mejor_score:
                        mejor_score = score
                        mejor_chunk = c
                
                chunk_pos = mejor_chunk or candidatos_clinicos[0]
                query_full = f"{titulo}: {pregunta}"
                consultas.append((normalizar_consulta_clinica(query_full), chunk_pos, "caso_canonico"))
                
                # Fases de simulación si existen
                for fase in case.get("fases", []):
                    fase_q = f"{case.get('titulo')}: {fase.get('pregunta_evaluativa')}"
                    consultas.append((normalizar_consulta_clinica(fase_q), chunk_pos, "caso_fase_evaluativa"))
    
    # 2. Seed Chunks de Ground Truth
    if seed_chunks_file.exists():
        with open(seed_chunks_file, "r", encoding="utf-8") as f:
            seed_data = json.load(f)
            
        for seed in seed_data:
            cie10 = seed.get("cie10_descripcion", "")
            seccion = seed.get("seccion", "")
            texto = seed.get("texto", "")
            
            # Buscar correspondencia en corpus v2
            mejor_match = None
            for c in corpus_chunks:
                if c.get("cie10") == seed.get("cie10_codigo") and not es_ruido_editorial(c.get("texto", ""), c.get("seccion", ""), c.get("tipo_contenido", "texto")):
                    mejor_match = c
                    break
            
            if mejor_match:
                q1 = f"¿Cuál es el protocolo normativo y esquema terapéutico para {seccion} ({cie10}) según la GPC oficial del MSP Ecuador?"
                consultas.append((normalizar_consulta_clinica(q1), mejor_match, "seed_chunk_clinico"))
    
    logger.info(f"Extraídas {len(consultas)} consultas clínicas canónicas de alta prioridad.")
    return consultas


def construir_banco_consultas_corpus(
    corpus_chunks: List[Dict[str, Any]],
    consultas_canonicas: List[Tuple[str, Dict[str, Any], str]],
    max_tripletas_por_eje: int = 800
) -> List[Tuple[str, Dict[str, Any], str]]:
    """
    Construye un banco balanceado de consultas clínicas profesionales para cada eje normativo.
    Descarta de forma absoluta el 100% de páginas de créditos, portadas o índices.
    """
    banco: List[Tuple[str, Dict[str, Any], str]] = list(consultas_canonicas)
    
    # Agrupar chunks clínicos válidos por eje
    chunks_validos_por_eje: Dict[str, List[Dict[str, Any]]] = {}
    for c in corpus_chunks:
        texto = c.get("texto", "")
        seccion = c.get("seccion", "")
        if es_ruido_editorial(texto, seccion, c.get("tipo_contenido", "texto")):
            continue
        if len(texto.strip()) < 100:
            continue
        
        eje = c.get("eje_clinico", "desconocido")
        chunks_validos_por_eje.setdefault(eje, []).append(c)
    
    # Formatos de preguntas clínicas profesionales y contextualmente específicas
    plantillas_clinicas = [
        "¿Cuáles son los criterios clínicos, diagnóstico y conducta médica recomendada para {seccion} según la GPC de {guia} del MSP Ecuador?",
        "¿Qué esquema terapéutico de primera línea, dosificación y monitoreo normado establece el MSP para {seccion} ({cie10})?",
        "¿Cuáles son los signos de alarma, criterios de severidad y algoritmo de derivación en {seccion} según la normativa nacional?",
        "¿Qué intervenciones farmacológicas y no farmacológicas de grado A/B están normadas por el MSP en {seccion} para {guia}?",
        "Describa el protocolo de manejo clínico inmediato y contraindicaciones normadas en {seccion} según la GPC oficial del Ecuador."
    ]
    
    for eje, chunks_eje in chunks_validos_por_eje.items():
        consultas_existentes_eje = sum(1 for _, c, _ in banco if c.get("eje_clinico") == eje)
        cupo_restante = max(0, max_tripletas_por_eje - consultas_existentes_eje)
        
        if cupo_restante <= 0:
            continue
        
        # Priorizar chunks de tablas clínicas de dosificación y secciones clínicas sustantivas
        chunks_tablas = [c for c in chunks_eje if c.get("tipo_contenido") == "tabla"]
        chunks_texto = [c for c in chunks_eje if c.get("tipo_contenido") != "tabla"]
        
        # Muestreo representativo
        random.shuffle(chunks_tablas)
        random.shuffle(chunks_texto)
        
        seleccionados = []
        # Tomar 60% tablas (alta fidelidad posológica) y 40% texto
        n_tablas = min(len(chunks_tablas), int(cupo_restante * 0.60))
        n_texto = min(len(chunks_texto), cupo_restante - n_tablas)
        
        seleccionados.extend(chunks_tablas[:n_tablas])
        seleccionados.extend(chunks_texto[:n_texto])
        
        for i, chunk in enumerate(seleccionados):
            seccion = chunk.get("seccion", "Recomendaciones Clínicas")
            guia = chunk.get("guia_titulo", "Guía de Práctica Clínica")
            cie10 = chunk.get("cie10", "Normativa General")
            
            # Limpiar nombre de sección para generar una pregunta fluida
            seccion_limpia = re.sub(r"^[0-9]+[\.\-\s]+", "", seccion).strip()
            seccion_limpia = re.sub(r"^(Capítulo\s+[0-9]+|Sección\s+[0-9]+)[:\-\s]*", "", seccion_limpia, flags=re.IGNORECASE).strip()
            guia_limpia = re.sub(r"^Guía\s+de\s+Práctica\s+Clínica[:\s\-]*", "", guia, flags=re.IGNORECASE).strip()
            
            # Omitir secciones meramente metodológicas o preliminares
            if any(seccion_limpia.lower().startswith(p) for p in [
                "preguntas que", "descripción de", "justificación", "propósito", "introducción",
                "metodología", "objetivo", "población diana", "declaración de", "aspectos generales"
            ]):
                continue
            
            # Enriquecer la especificidad temática si el chunk describe una tabla o subtema concreto
            subtema_especifico = ""
            texto_chunk = chunk.get("texto", "")
            m_tabla = re.search(r"Tabla\s+\d+[\.\:\s]+([^\n\|]{5,60})", texto_chunk)
            if m_tabla:
                subtema_limpio = re.sub(r"[\*#_\|]", "", m_tabla.group(1)).strip()
                subtema_especifico = f" - {subtema_limpio}"
            elif chunk.get("tipo_contenido") == "tabla":
                subtema_especifico = " - Esquema y Criterios Normados"
            
            seccion_contextual = f"{seccion_limpia}{subtema_especifico}".strip()
            
            plantilla = plantillas_clinicas[i % len(plantillas_clinicas)]
            pregunta = plantilla.format(
                seccion=seccion_contextual,
                guia=guia_limpia,
                cie10=cie10
            )
            
            banco.append((normalizar_consulta_clinica(pregunta), chunk, "corpus_normativo_msp"))
    
    logger.info(f"Banco consolidado de consultas clínicas: {len(banco)} consultas listas para minería.")
    return banco


def generar_datasets_particionados(
    tripletas: List[Triplet],
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Realiza una partición estratificada por eje clínico a nivel de GRUPO DE CONSULTA (GroupSplit).
    Garantiza Cero Fugas de Datos (Zero Data Leakage):
      Queries(Train) ∩ Queries(Test) = ∅
      Queries(Val) ∩ Queries(Test) = ∅
      Queries(Train) ∩ Queries(Val) = ∅
    """
    set_seed(seed)
    triplets_dict = [asdict(t) for t in tripletas]
    
    # 1. Agrupar tripletas por texto normalizado de la consulta Q
    grupos_por_query: Dict[str, List[Dict[str, Any]]] = {}
    for item in triplets_dict:
        q_norm = item.get("query", "").strip().lower()
        grupos_por_query.setdefault(q_norm, []).append(item)
    
    # 2. Agrupar las queries por eje clínico
    queries_por_eje: Dict[str, List[str]] = {}
    for q_norm, items in grupos_por_query.items():
        eje = items[0].get("eje_clinico", "general")
        queries_por_eje.setdefault(eje, []).append(q_norm)
    
    train_set: List[Dict[str, Any]] = []
    val_set: List[Dict[str, Any]] = []
    test_set: List[Dict[str, Any]] = []
    
    # 3. Particionar los grupos de queries de forma estratificada por eje
    for eje, q_list in queries_por_eje.items():
        random.shuffle(q_list)
        n = len(q_list)
        n_train = max(1, int(round(n * train_ratio)))
        n_val = max(1, int(round(n * val_ratio)))
        
        train_q = set(q_list[:n_train])
        val_q = set(q_list[n_train:n_train + n_val])
        test_q = set(q_list[n_train + n_val:])
        
        # Si test_q quedó vacío por redondeo, transferir una de train
        if not test_q and len(train_q) > 1:
            elem = train_q.pop()
            test_q.add(elem)
        
        # Asignar todas las tripletas correspondientes a sus conjuntos
        for q in train_q:
            train_set.extend(grupos_por_query[q])
        for q in val_q:
            val_set.extend(grupos_por_query[q])
        for q in test_q:
            test_set.extend(grupos_por_query[q])
        
        total_eje = len(train_q) + len(val_q) + len(test_q)
        logger.info(
            f"Eje '{eje}': Queries únicas={total_eje} -> "
            f"Train={len(train_q)} ({len(train_q)/total_eje*100:.1f}%), "
            f"Val={len(val_q)} ({len(val_q)/total_eje*100:.1f}%), "
            f"Test={len(test_q)} ({len(test_q)/total_eje*100:.1f}%)"
        )
    
    # 4. Verificación matemática estricta de Cero Fugas (Zero Data Leakage)
    set_train_q = {t["query"].strip().lower() for t in train_set}
    set_val_q = {t["query"].strip().lower() for t in val_set}
    set_test_q = {t["query"].strip().lower() for t in test_set}
    
    leak_train_test = set_train_q.intersection(set_test_q)
    leak_val_test = set_val_q.intersection(set_test_q)
    leak_train_val = set_train_q.intersection(set_val_q)
    
    if leak_train_test or leak_val_test or leak_train_val:
        raise ValueError(
            f"Violación de integridad: Data Leakage detectado! "
            f"Train-Test: {len(leak_train_test)}, Val-Test: {len(leak_val_test)}, Train-Val: {len(leak_train_val)}"
        )
    
    logger.info(
        f"Verificación de Cero Fugas (Zero Data Leakage): PASS "
        f"(Train ∩ Test = ∅, Val ∩ Test = ∅, Train ∩ Val = ∅)"
    )
    
    # Mezclar cada conjunto de forma determinística
    random.shuffle(train_set)
    random.shuffle(val_set)
    random.shuffle(test_set)
    
    return train_set, val_set, test_set


def calcular_sha256_archivo(ruta: Path) -> str:
    """Calcula el hash criptográfico SHA-256 de un archivo para reproducibilidad estricta."""
    sha = hashlib.sha256()
    with open(ruta, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()


def main() -> None:
    import argparse
    parser = argparse.ArgumentParser(description="Fase 4: Minería Semántica de Hard Negatives (BGE-M3)")
    parser.add_argument("--smoke-test", action="store_true", help="Ejecuta una corrida corta de verificación (20 tripletas)")
    parser.add_argument("--limit-per-axis", type=int, default=750, help="Límite máximo de tripletas por eje clínico (por defecto 750)")
    args = parser.parse_args()

    limite_eje = 10 if args.smoke_test else args.limit_per_axis

    logger.info("=== INICIANDO FASE 4: MINERÍA SEMÁNTICA DE HARD NEGATIVES (BGE-M3) ===")
    if args.smoke_test:
        logger.info("[MODO SMOKE TEST ACTIVO] Limitando a 10 tripletas por eje para validación rápida.")
    set_seed(42)
    
    if not CHUNKS_FILE.exists():
        logger.error(f"Archivo de chunks de Fase 3 no encontrado: {CHUNKS_FILE}")
        sys.exit(1)
    
    # 1. Cargar fragmentos oficiales del corpus v2
    logger.info(f"Cargando fragmentos del corpus v2 desde: {CHUNKS_FILE}")
    with open(CHUNKS_FILE, "r", encoding="utf-8") as f:
        corpus_chunks = json.load(f)
    logger.info(f"Total de fragmentos en corpus: {len(corpus_chunks)}")
    
    # 2. Inicializar motor de minería denso
    miner = DenseSemanticMiner(corpus_chunks, MODEL_LOCAL_DIR)
    
    # 3. Extraer consultas canónicas de casos y seeds
    consultas_canonicas = generar_consultas_canónicas(CASES_FILE, SEED_CHUNKS_FILE, corpus_chunks)
    
    # 4. Construir banco balanceado de consultas normativas clínicas
    # Meta: ~2,800 a 3,200 tripletas científicas distribuidas en los 4 ejes
    banco_consultas = construir_banco_consultas_corpus(
        corpus_chunks=corpus_chunks,
        consultas_canonicas=consultas_canonicas,
        max_tripletas_por_eje=limite_eje
    )
    
    # 5. Ejecutar minería en dos etapas con filtrado defensivo y batching vectorizado
    logger.info("Ejecutando minería semántica densa de Hard Negatives (Batching vectorizado)...")
    tripletas = miner.minar_tripletas_batch(
        banco_consultas=banco_consultas,
        top_candidates_bm25=40,
        similitud_max_overlap=0.65,
        max_cands_por_query=8,
        batch_size=32
    )
    logger.info(f"Minería completada con éxito: {len(tripletas)} tripletas científicas generadas.")
    
    # 6. Partición Estratificada 70% / 15% / 15%
    DATASETS_DIR.mkdir(parents=True, exist_ok=True)
    train_set, val_set, test_blind_set = generar_datasets_particionados(
        tripletas=tripletas,
        train_ratio=0.70,
        val_ratio=0.15,
        test_ratio=0.15,
        seed=42
    )
    
    # 7. Guardar datasets reproducibles en JSON estricto
    logger.info(f"Guardando partición de entrenamiento en: {TRAIN_FILE}")
    with open(TRAIN_FILE, "w", encoding="utf-8") as f:
        json.dump(train_set, f, indent=2, ensure_ascii=False)
        
    logger.info(f"Guardando partición de validación en: {VAL_FILE}")
    with open(VAL_FILE, "w", encoding="utf-8") as f:
        json.dump(val_set, f, indent=2, ensure_ascii=False)
        
    logger.info(f"Guardando partición de test ciego en: {TEST_BLIND_FILE}")
    with open(TEST_BLIND_FILE, "w", encoding="utf-8") as f:
        json.dump(test_blind_set, f, indent=2, ensure_ascii=False)
    
    # 8. Generar sumas SHA-256 de integridad criptográfica
    hash_train = calcular_sha256_archivo(TRAIN_FILE)
    hash_val = calcular_sha256_archivo(VAL_FILE)
    hash_test = calcular_sha256_archivo(TEST_BLIND_FILE)
    
    checksums_content = (
        f"# Checksums criptográficos SHA-256 — Pipeline Ingesta v2 (Fase 4)\n"
        f"# Fecha: 2026-10-05\n"
        f"# Semilla Global: 42 | Partición: 70% Train / 15% Val / 15% Blind Test\n"
        f"{hash_train}  retrieval_train.json\n"
        f"{hash_val}  retrieval_val.json\n"
        f"{hash_test}  retrieval_test_blind.json\n"
    )
    
    with open(CHECKSUMS_FILE, "w", encoding="utf-8") as f:
        f.write(checksums_content)
    logger.info(f"Sumas criptográficas congeladas en: {CHECKSUMS_FILE}")
    
    # 9. Auditoría y Reporte Final
    print("\n" + "="*80)
    print("AUDITORÍA CIENTÍFICA DE LA FASE 4 — MINERÍA DE HARD NEGATIVES (BGE-M3)")
    print("="*80)
    print(f"Total Tripletas Generadas:       {len(tripletas):,}")
    print(f"  - Conjunto Train (70%):        {len(train_set):,} tripletas (SHA-256: {hash_train[:12]}...)")
    print(f"  - Conjunto Val (15%):          {len(val_set):,} tripletas (SHA-256: {hash_val[:12]}...)")
    print(f"  - Conjunto Test Blind (15%):   {len(test_blind_set):,} tripletas (SHA-256: {hash_test[:12]}...)")
    print("-" * 80)
    
    # Distribución por tipo de negativo
    from collections import Counter
    tipos_neg = Counter(t.tipo_negativo for t in tripletas)
    print("Distribución de Hard Negatives:")
    for tipo, count in tipos_neg.items():
        print(f"  - {tipo}: {count:,} ({count/len(tripletas)*100:.1f}%)")
    
    # Similitud coseno media de los negativos
    sims = [t.similitud_negativo for t in tripletas]
    print(f"Similitud Coseno de Negativos: Min={min(sims):.4f}, Media={np.mean(sims):.4f}, Max={max(sims):.4f}")
    print("="*80 + "\n")
    logger.info("=== FASE 4 COMPLETADA CON RIGOR CIENTÍFICO Y CERO PARCHES ===")


if __name__ == "__main__":
    main()
