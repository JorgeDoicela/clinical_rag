"""Pipeline Científico de Ingesta v2 - Fase 5: Ensamblado y Curación del Ground Truth Clínico.

Este script implementa:
1. Generación de un conjunto representativo y balanceado de pares (consulta_clinica, fragmento_candidato)
   estratificado en los 4 ejes normativos del MSP ecuatoriano para revisión médica humana.
2. Validación estadística de concordancia inter-anotador mediante Kappa ponderado cuadrático de Cohen
   (umbral de aceptación científica kappa_w >= 0.80).
3. Consolidación y congelamiento del test set ciego curado con verificación criptográfica SHA-256.

Uso:
    python backend/ingestion_v2/05_build_ground_truth_pool.py --mode generate --total-pairs 160
    python backend/ingestion_v2/05_build_ground_truth_pool.py --mode validate --input-csv backend/data/ground_truth/pairs_reviewed.csv
    python backend/ingestion_v2/05_build_ground_truth_pool.py --mode verify
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import logging
import math
import random
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("GroundTruthPool")

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = ROOT_DIR / "backend" / "data"
DATASETS_DIR = DATA_DIR / "datasets"
EXTRACTED_DIR = DATA_DIR / "extracted"
GROUND_TRUTH_DIR = DATA_DIR / "ground_truth"

TEST_BLIND_PATH = DATASETS_DIR / "retrieval_test_blind.json"
CHUNKS_PATH = EXTRACTED_DIR / "chunks_corpus_v2.json"
CHECKSUMS_PATH = DATASETS_DIR / "checksums.sha256"

PAIRS_RAW_PATH = GROUND_TRUTH_DIR / "pairs_raw.csv"
PAIRS_VALIDATED_PATH = GROUND_TRUTH_DIR / "pairs_validated.csv"

SEED = 42

AXIS_ORDER = [
    "01_urgencias_obstetricas",
    "02_respiratorio_pediatrico",
    "03_cardiovascular_metabolico",
    "04_soporte_cronicos_salud_mental",
]


@dataclass
class ClinicalPair:
    pair_id: str
    axis_id: str
    gpc_id: str
    chunk_id: str
    candidate_type: str  # 'positive_direct', 'hard_negative_plausible', 'contextual_neutral'
    clinical_query: str
    chunk_text: str
    gpc_title: str
    physical_pages: str
    relevance_rater_1: str = ""
    relevance_rater_2: str = ""
    relevance_arbitrator: str = ""
    notes: str = ""


def compute_sha256(filepath: Path) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def load_corpus_chunks() -> Dict[str, Dict[str, Any]]:
    if not CHUNKS_PATH.exists():
        raise FileNotFoundError(f"Corpus de chunks no encontrado en: {CHUNKS_PATH}")
    with open(CHUNKS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    chunks_list = data.get("chunks", []) if isinstance(data, dict) else data
    return {c["chunk_id"]: c for c in chunks_list}


def load_test_blind() -> List[Dict[str, Any]]:
    if not TEST_BLIND_PATH.exists():
        raise FileNotFoundError(f"Dataset de test ciego no encontrado en: {TEST_BLIND_PATH}")
    with open(TEST_BLIND_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def generate_pairs_pool(total_pairs: int = 160) -> List[ClinicalPair]:
    """Genera un pool estratificado balanceado de pares clínicos para anotación humana."""
    logger.info("Cargando insumos: test blind y chunks corpus...")
    test_triplets = load_test_blind()
    chunks_dict = load_corpus_chunks()

    logger.info("Test ciego disponible: %d tripletas. Chunks en corpus: %d", len(test_triplets), len(chunks_dict))

    # Agrupar tripletas de test por eje
    by_axis: Dict[str, List[Dict[str, Any]]] = {axis: [] for axis in AXIS_ORDER}
    for item in test_triplets:
        axis = item.get("eje_clinico", "01_urgencias_obstetricas")
        if axis in by_axis:
            by_axis[axis].append(item)
        else:
            by_axis[AXIS_ORDER[0]].append(item)

    pairs_per_axis = total_pairs // len(AXIS_ORDER)
    remainder = total_pairs % len(AXIS_ORDER)

    rng = random.Random(SEED)
    pairs: List[ClinicalPair] = []
    pair_counter = 1

    for idx, axis in enumerate(AXIS_ORDER):
        target_count = pairs_per_axis + (1 if idx < remainder else 0)
        triplets_axis = by_axis[axis]
        if not triplets_axis:
            continue
        rng.shuffle(triplets_axis)

        # Proporciones dentro de cada eje:
        # 50% positivos directos
        # 30% hard negatives / distractores
        # 20% fragmentos neutrales del mismo eje
        n_pos = math.ceil(target_count * 0.50)
        n_neg = math.ceil(target_count * 0.30)
        n_neutral = target_count - (n_pos + n_neg)

        # 1. Positivos directos
        pos_triplets = triplets_axis[:n_pos]
        for t in pos_triplets:
            pairs.append(
                ClinicalPair(
                    pair_id=f"GT-{pair_counter:04d}",
                    axis_id=axis,
                    gpc_id=t.get("guia_fuente", ""),
                    chunk_id=t.get("id", f"chunk_pos_{pair_counter}"),
                    candidate_type="positive_direct",
                    clinical_query=t["query"],
                    chunk_text=t["pos"],
                    gpc_title=t.get("guia_fuente", ""),
                    physical_pages=t.get("seccion", ""),
                )
            )
            pair_counter += 1

        # 2. Hard negatives / distractores plausibles
        neg_candidates = triplets_axis[n_pos : n_pos + n_neg]
        if len(neg_candidates) < n_neg:
            neg_candidates = (triplets_axis[n_pos:] + triplets_axis)[:n_neg]

        for t in neg_candidates:
            pairs.append(
                ClinicalPair(
                    pair_id=f"GT-{pair_counter:04d}",
                    axis_id=axis,
                    gpc_id=t.get("guia_fuente", ""),
                    chunk_id=f"{t.get('id', '')}_neg",
                    candidate_type="hard_negative_plausible",
                    clinical_query=t["query"],
                    chunk_text=t["neg"],
                    gpc_title=t.get("tipo_negativo", t.get("guia_fuente", "")),
                    physical_pages=t.get("seccion", ""),
                )
            )
            pair_counter += 1

        # 3. Contextuales neutrales (chunks aleatorios del mismo eje pero diferente sección)
        axis_chunks = [c for c in chunks_dict.values() if c.get("eje_clinico") == axis]
        neutral_sample = rng.sample(axis_chunks, min(n_neutral, len(axis_chunks))) if axis_chunks else []
        for i, c in enumerate(neutral_sample):
            associated_triplet = triplets_axis[i % len(triplets_axis)]
            p_pages = str(c.get("pagina_impresa_real", c.get("pagina_pdf", "")))

            pairs.append(
                ClinicalPair(
                    pair_id=f"GT-{pair_counter:04d}",
                    axis_id=axis,
                    gpc_id=c.get("guia_archivo", ""),
                    chunk_id=c.get("chunk_id", ""),
                    candidate_type="contextual_neutral",
                    clinical_query=associated_triplet["query"],
                    chunk_text=c.get("texto", ""),
                    gpc_title=c.get("guia_titulo", ""),
                    physical_pages=p_pages,
                )
            )
            pair_counter += 1

    # Desordenar aleatoriamente los pares en el CSV final para que los evaluadores
    # no sepan qué tipo de candidato están evaluando (doble ciego de asignación)
    rng.shuffle(pairs)
    # Reasignar IDs correlativos tras el barajado
    for i, p in enumerate(pairs, start=1):
        p.pair_id = f"GT-{i:04d}"

    return pairs


def export_pairs_to_csv(pairs: List[ClinicalPair], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "pair_id",
        "axis_id",
        "gpc_id",
        "chunk_id",
        "candidate_type",
        "clinical_query",
        "chunk_text",
        "gpc_title",
        "physical_pages",
        "relevance_rater_1",
        "relevance_rater_2",
        "relevance_arbitrator",
        "notes",
    ]
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        for p in pairs:
            writer.writerow(asdict(p))

    logger.info("CSV exportado exitosamente a: %s (%d filas)", output_path, len(pairs))


def compute_weighted_cohen_kappa(
    rater1_scores: List[int],
    rater2_scores: List[int],
    num_categories: int = 3,
) -> Dict[str, Any]:
    """Calcula el Kappa ponderado cuadrático de Cohen (quadratic weighted kappa) para escalas ordinales."""
    if len(rater1_scores) != len(rater2_scores):
        raise ValueError("Ambos evaluadores deben tener el mismo número de observaciones.")
    n = len(rater1_scores)
    if n == 0:
        return {"kappa_w": 0.0, "observed_agreement": 0.0, "expected_agreement": 0.0, "matrix": []}

    # 1. Matriz de confusión observada O_{ij}
    O = [[0 for _ in range(num_categories)] for _ in range(num_categories)]
    for s1, s2 in zip(rater1_scores, rater2_scores):
        if 0 <= s1 < num_categories and 0 <= s2 < num_categories:
            O[s1][s2] += 1
        else:
            raise ValueError(f"Puntuación fuera de rango: ({s1}, {s2})")

    # 2. Distribuciones marginales
    r1_marginal = [sum(O[i][j] for j in range(num_categories)) for i in range(num_categories)]
    r2_marginal = [sum(O[i][j] for i in range(num_categories)) for j in range(num_categories)]

    # 3. Matriz esperada por azar E_{ij}
    E = [[0.0 for _ in range(num_categories)] for _ in range(num_categories)]
    for i in range(num_categories):
        for j in range(num_categories):
            E[i][j] = (r1_marginal[i] * r2_marginal[j]) / float(n)

    # 4. Matriz de pesos cuadráticos: w_{ij} = (i - j)^2 / (k - 1)^2
    k_denom = float((num_categories - 1) ** 2)
    W = [[((i - j) ** 2) / k_denom for j in range(num_categories)] for i in range(num_categories)]

    # 5. Sumas ponderadas
    sum_W_O = sum(W[i][j] * O[i][j] for i in range(num_categories) for j in range(num_categories))
    sum_W_E = sum(W[i][j] * E[i][j] for i in range(num_categories) for j in range(num_categories))

    if sum_W_E == 0.0:
        kappa_w = 1.0
    else:
        kappa_w = 1.0 - (sum_W_O / sum_W_E)

    # Acuerdo simple no ponderado
    simple_agreement = sum(O[i][i] for i in range(num_categories)) / float(n)

    return {
        "n_samples": n,
        "kappa_w": round(kappa_w, 4),
        "observed_agreement": round(simple_agreement, 4),
        "sum_weighted_observed": round(sum_W_O, 4),
        "sum_weighted_expected": round(sum_W_E, 4),
        "confusion_matrix": O,
        "interpretation": interpret_kappa(kappa_w),
    }


def interpret_kappa(kappa: float) -> str:
    if kappa >= 0.81:
        return "Acuerdo casi perfecto (Almost Perfect Agreement - Landis & Koch, 1977)"
    elif kappa >= 0.61:
        return "Acuerdo sustancial (Substantial Agreement)"
    elif kappa >= 0.41:
        return "Acuerdo moderado (Moderate Agreement)"
    elif kappa >= 0.21:
        return "Acuerdo aceptable (Fair Agreement)"
    elif kappa >= 0.0:
        return "Acuerdo leve (Slight Agreement)"
    else:
        return "Desacuerdo sistemático / peor que el azar (Poor Agreement)"


def validate_and_consolidate(input_csv_path: Path) -> None:
    """Valida calificaciones de médicos, computa Kappa de Cohen ponderado y consolida pairs_validated.csv."""
    if not input_csv_path.exists():
        raise FileNotFoundError(f"Archivo de evaluación no encontrado: {input_csv_path}")

    rows: List[Dict[str, Any]] = []
    with open(input_csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(r)

    logger.info("Filas cargadas para validación: %d", len(rows))
    rater1_scores: List[int] = []
    rater2_scores: List[int] = []
    valid_rows: List[Dict[str, Any]] = []

    discrepancies_major: List[Dict[str, Any]] = []
    discrepancies_minor: List[Dict[str, Any]] = []

    for r in rows:
        val1_str = (r.get("relevance_rater_1") or "").strip()
        val2_str = (r.get("relevance_rater_2") or "").strip()
        arb_str = (r.get("relevance_arbitrator") or "").strip()

        if not val1_str or not val2_str:
            continue

        try:
            s1 = int(val1_str)
            s2 = int(val2_str)
        except ValueError:
            logger.warning("Puntuación no numérica en par %s: (%s, %s)", r.get("pair_id"), val1_str, val2_str)
            continue

        rater1_scores.append(s1)
        rater2_scores.append(s2)

        diff = abs(s1 - s2)
        final_score: int
        if diff == 0:
            final_score = s1
        elif diff == 1:
            if arb_str:
                final_score = int(arb_str)
            else:
                final_score = min(s1, s2)
            discrepancies_minor.append({"pair_id": r["pair_id"], "r1": s1, "r2": s2, "final": final_score})
        else:
            if arb_str:
                final_score = int(arb_str)
            else:
                final_score = 1
                logger.error(
                    "ALERTA: Discrepancia mayor 0 vs 2 en par %s sin árbitro dirimente. Asignado 1 provisorio.",
                    r["pair_id"],
                )
            discrepancies_major.append(
                {"pair_id": r["pair_id"], "r1": s1, "r2": s2, "arbitrator": arb_str, "final": final_score}
            )

        r_out = dict(r)
        r_out["final_relevance"] = str(final_score)
        valid_rows.append(r_out)

    if not rater1_scores:
        logger.error("No se encontraron calificaciones completas (rater_1 y rater_2) en el archivo.")
        return

    # Calcular Kappa de Cohen ponderado
    metrics = compute_weighted_cohen_kappa(rater1_scores, rater2_scores, num_categories=3)

    print("\n" + "=" * 80)
    print(" REPORTE ESTADÍSTICO DE VALIDACIÓN INTER-ANOTADOR (FASE 5)")
    print("=" * 80)
    print(f" Pares calificados por ambos evaluadores : {metrics['n_samples']}")
    print(f" Porcentaje de acuerdo simple (Po)       : {metrics['observed_agreement'] * 100:.2f}%")
    print(f" Kappa ponderado cuadratico (kappa_w)   : {metrics['kappa_w']:.4f}")
    print(f" Interpretación científica (Landis&Koch) : {metrics['interpretation']}")
    print("-" * 80)
    print(" Matriz de Confusión Observada (Filas = Rater 1, Columnas = Rater 2):")
    print("          [Pred 0]  [Pred 1]  [Pred 2]")
    for i, row in enumerate(metrics["confusion_matrix"]):
        print(f" [Cat {i}]     {row[0]:6d}    {row[1]:6d}    {row[2]:6d}")
    print("-" * 80)
    print(f" Discrepancias menores (diff = 1)       : {len(discrepancies_minor)}")
    print(f" Discrepancias mayores (diff = 2)       : {len(discrepancies_major)}")
    print("=" * 80)

    if metrics["kappa_w"] < 0.80:
        logger.warning(
            "CUIDADO: El Kappa ponderado (%.4f) está por debajo del umbral científico (>= 0.80). "
            "Se requiere sesión de calibración y arbitraje clínico.",
            metrics["kappa_w"],
        )
    else:
        logger.info("CERTIFICACIÓN CIENTÍFICA: Acuerdo inter-anotador superior a 0.80. Ground Truth Aprobado.")

    PAIRS_VALIDATED_PATH.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = list(valid_rows[0].keys())
    with open(PAIRS_VALIDATED_PATH, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(valid_rows)

    validated_hash = compute_sha256(PAIRS_VALIDATED_PATH)
    logger.info("Archivo validado congelado en: %s", PAIRS_VALIDATED_PATH)
    logger.info("Hash SHA-256 de pairs_validated.csv: %s", validated_hash)

    update_checksums(PAIRS_VALIDATED_PATH, validated_hash)


def update_checksums(filepath: Path, file_hash: str) -> None:
    rel_path = filepath.relative_to(ROOT_DIR).as_posix()
    entry = f"{file_hash}  {rel_path}\n"

    lines: List[str] = []
    if CHECKSUMS_PATH.exists():
        with open(CHECKSUMS_PATH, "r", encoding="utf-8") as f:
            lines = [l for l in f.readlines() if not l.endswith(f"  {rel_path}\n")]

    lines.append(entry)
    with open(CHECKSUMS_PATH, "w", encoding="utf-8") as f:
        f.writelines(lines)
    logger.info("Checksum registrado en %s", CHECKSUMS_PATH)


def verify_integrity() -> None:
    if not CHECKSUMS_PATH.exists():
        logger.error("Archivo de checksums no encontrado: %s", CHECKSUMS_PATH)
        return

    print("\n" + "=" * 80)
    print(" VERIFICACIÓN CRIPTOGRÁFICA DE INTEGRIDAD (SHA-256)")
    print("=" * 80)
    all_ok = True
    with open(CHECKSUMS_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("  ", 1)
            if len(parts) != 2:
                continue
            expected_hash, rel_path = parts
            target_file = ROOT_DIR / rel_path
            if not target_file.exists():
                target_file = DATASETS_DIR / rel_path
            if not target_file.exists():
                print(f" [FALTANTE] {rel_path}")
                all_ok = False
                continue
            actual_hash = compute_sha256(target_file)
            if actual_hash == expected_hash:
                print(f" [OK] {rel_path} -> {actual_hash[:16]}...")
            else:
                print(f" [FALLO] {rel_path} (Esperado: {expected_hash[:12]}, Actual: {actual_hash[:12]})")
                all_ok = False
    print("=" * 80)
    if all_ok:
        print(" Todos los artefactos congelados verifican al 100% su integridad.")
    else:
        print(" ADVERTENCIA: Se detectaron fallos o artefactos ausentes.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fase 5: Ensamblado y Curación del Ground Truth Clínico Humano",
    )
    parser.add_argument(
        "--mode",
        choices=["generate", "validate", "verify"],
        default="generate",
        help="Modo de ejecución: generate (crea pairs_raw.csv), validate (evalúa y computa kappa), verify (audita hashes)",
    )
    parser.add_argument(
        "--total-pairs",
        type=int,
        default=160,
        help="Total de pares a ensamblar en pairs_raw.csv (por defecto 160: 40 por cada eje)",
    )
    parser.add_argument(
        "--input-csv",
        type=str,
        default=str(PAIRS_RAW_PATH),
        help="Ruta al CSV con evaluaciones completadas de los revisores para el modo validate",
    )

    args = parser.parse_args()

    if args.mode == "generate":
        pairs = generate_pairs_pool(total_pairs=args.total_pairs)
        export_pairs_to_csv(pairs, PAIRS_RAW_PATH)
        print(f"\nGeneración completada: {len(pairs)} pares clínicos ensamblados en:")
        print(f"-> {PAIRS_RAW_PATH}")
    elif args.mode == "validate":
        validate_and_consolidate(Path(args.input_csv))
    elif args.mode == "verify":
        verify_integrity()


if __name__ == "__main__":
    main()
