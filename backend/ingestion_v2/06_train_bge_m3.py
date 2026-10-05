"""Pipeline Científico de Ingesta v2 - Fase 6: Re-entrenamiento Contrastivo de BGE-M3 con MNRL.

Este script implementa el fine-tuning del modelo de embeddings denso 'BAAI/bge-m3'
utilizando la función de pérdida MultipleNegativesRankingLoss (MNRL) calibrada a tau=0.02.
Optimizado para hardware de alto rendimiento NVIDIA A100 (40 GB VRAM) con aceleración bfloat16.

Uso estándar en servidor con GPU:
    python backend/ingestion_v2/06_train_bge_m3.py --batch-size 32 --epochs 5 --bf16

Uso en modo verificación rápida (dry-run):
    python backend/ingestion_v2/06_train_bge_m3.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import torch
from datasets import Dataset
from sentence_transformers import (
    SentenceTransformer,
    SentenceTransformerTrainer,
    SentenceTransformerTrainingArguments,
)
from sentence_transformers.evaluation import InformationRetrievalEvaluator
from sentence_transformers.losses import MultipleNegativesRankingLoss
from sentence_transformers.training_args import BatchSamplers

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("TrainBGEM3")

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DATASETS_DIR = ROOT_DIR / "backend" / "data" / "datasets"
MODELS_DIR = ROOT_DIR / "backend" / "data" / "models"
OUTPUT_MODEL_DIR = MODELS_DIR / "ateneo-bge-m3-ecuador-v2"

TRAIN_DATASET_PATH = DATASETS_DIR / "retrieval_train.json"
VAL_DATASET_PATH = DATASETS_DIR / "retrieval_val.json"

BASE_MODEL_NAME = "BAAI/bge-m3"
DEFAULT_BATCH_SIZE = 32
DEFAULT_EPOCHS = 5
DEFAULT_LR = 2e-5
DEFAULT_TEMPERATURE = 0.02  # tau = 0.02 -> scale = 1/0.02 = 50.0
DEFAULT_MAX_SEQ_LENGTH = 512


def load_triplets_dataset(json_path: Path, max_samples: Optional[int] = None) -> List[Dict[str, str]]:
    """Carga tripletas clínicas en formato canónico para SentenceTransformers."""
    if not json_path.exists():
        raise FileNotFoundError(f"Archivo de dataset no encontrado: {json_path}")

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if max_samples and max_samples > 0:
        data = data[:max_samples]

    triplets = []
    for item in data:
        q = item["query"].strip()
        pos = item["pos"].strip()
        neg = item["neg"].strip()
        if q and pos and neg:
            triplets.append({"anchor": q, "positive": pos, "negative": neg})

    logger.info("Cargadas %d tripletas válidas desde %s", len(triplets), json_path.name)
    return triplets


def build_ir_evaluator(val_triplets: List[Dict[str, str]]) -> InformationRetrievalEvaluator:
    """Construye un InformationRetrievalEvaluator estricto para monitorear MRR@5 y Hit@1 en validación."""
    corpus: Dict[str, str] = {}
    queries: Dict[str, str] = {}
    relevant_docs: Dict[str, set] = {}

    doc_id_counter = 1
    query_id_counter = 1

    # Mapeo de texto a ID único para evitar duplicar pasajes idénticos
    text_to_doc_id: Dict[str, str] = {}

    def get_or_create_doc_id(text: str) -> str:
        nonlocal doc_id_counter
        if text not in text_to_doc_id:
            d_id = f"doc_{doc_id_counter:05d}"
            text_to_doc_id[text] = d_id
            corpus[d_id] = text
            doc_id_counter += 1
        return text_to_doc_id[text]

    for t in val_triplets:
        q_id = f"q_{query_id_counter:04d}"
        queries[q_id] = t["anchor"]

        pos_id = get_or_create_doc_id(t["positive"])
        _ = get_or_create_doc_id(t["negative"])  # Se indexa el hard negative en el corpus de búsqueda

        if q_id not in relevant_docs:
            relevant_docs[q_id] = set()
        relevant_docs[q_id].add(pos_id)

        query_id_counter += 1

    evaluator = InformationRetrievalEvaluator(
        queries=queries,
        corpus=corpus,
        relevant_docs=relevant_docs,
        name="ateneo_val_ir_evaluator",
        mrr_at_k=[1, 5, 10],
        ndcg_at_k=[1, 5, 10],
        accuracy_at_k=[1, 3, 5],
        precision_recall_at_k=[1, 5],
        show_progress_bar=False,
    )
    logger.info(
        "Evaluador de Validación IR configurado: %d consultas contra corpus de %d documentos.",
        len(queries),
        len(corpus),
    )
    return evaluator


def train_bge_m3(
    base_model_name: str = BASE_MODEL_NAME,
    output_dir: Path = OUTPUT_MODEL_DIR,
    batch_size: int = DEFAULT_BATCH_SIZE,
    epochs: int = DEFAULT_EPOCHS,
    learning_rate: float = DEFAULT_LR,
    temperature: float = DEFAULT_TEMPERATURE,
    max_seq_length: int = DEFAULT_MAX_SEQ_LENGTH,
    use_bf16: bool = True,
    dry_run: bool = False,
) -> None:
    start_time = time.time()
    logger.info("=" * 80)
    logger.info("INICIO DE ENTRENAMIENTO BGE-M3 CON MNRL (FASE 6)")
    logger.info("=" * 80)
    logger.info("Modelo Base        : %s", base_model_name)
    logger.info("Directorio Salida  : %s", output_dir)
    logger.info("Batch Size         : %d", batch_size if not dry_run else 2)
    logger.info("Épocas             : %d", epochs if not dry_run else 1)
    logger.info("Learning Rate      : %e", learning_rate)
    logger.info("Temperatura tau    : %.4f (Scale = %.1f)", temperature, 1.0 / temperature)
    logger.info("Max Seq Length     : %d tokens", max_seq_length)

    # 1. Diagnóstico de aceleración por hardware
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info("Dispositivo activo : %s", device)
    if device == "cuda":
        gpu_name = torch.cuda.get_device_name(0)
        vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        supports_bf16 = torch.cuda.is_bf16_supported()
        logger.info("GPU detectada      : %s (%.1f GB VRAM)", gpu_name, vram_gb)
        logger.info("Soporte bfloat16   : %s", supports_bf16)
        if use_bf16 and not supports_bf16:
            logger.warning("bfloat16 no soportado por la GPU actual. Conmutando a fp16.")
            use_bf16 = False
            use_fp16 = True
        elif use_bf16:
            use_fp16 = False
        else:
            use_fp16 = True
    else:
        logger.warning("CUDA no disponible. Ejecutando en CPU.")
        use_bf16 = False
        use_fp16 = False
        if not dry_run:
            logger.warning(
                "ADVERTENCIA: Entrenar en CPU puede tomar horas. Para pruebas use la bandera --dry-run."
            )

    # 2. Carga de datasets
    max_train = 4 if dry_run else None
    max_val = 4 if dry_run else None

    train_triplets = load_triplets_dataset(TRAIN_DATASET_PATH, max_samples=max_train)
    val_triplets = load_triplets_dataset(VAL_DATASET_PATH, max_samples=max_val)

    train_dataset = Dataset.from_list(train_triplets)

    # 3. Inicialización del modelo
    logger.info("Descargando / cargando modelo base: %s...", base_model_name)
    model = SentenceTransformer(base_model_name, device=device)
    model.max_seq_length = max_seq_length

    # 4. Función de pérdida contrastiva MNRL
    scale = 1.0 / temperature
    loss_fn = MultipleNegativesRankingLoss(model, scale=scale)
    logger.info("Función de pérdida: MultipleNegativesRankingLoss con escala=%.1f (tau=%.4f)", scale, temperature)

    # 5. Evaluador de Validación
    evaluator = build_ir_evaluator(val_triplets)

    # 6. Configuración de hiperparámetros con SentenceTransformerTrainingArguments
    output_dir.mkdir(parents=True, exist_ok=True)
    checkpoint_dir = output_dir / "checkpoints"

    effective_batch_size = 2 if dry_run else batch_size
    effective_epochs = 1 if dry_run else epochs
    eval_steps = 1 if dry_run else None

    training_args = SentenceTransformerTrainingArguments(
        output_dir=str(checkpoint_dir),
        num_train_epochs=effective_epochs,
        per_device_train_batch_size=effective_batch_size,
        per_device_eval_batch_size=effective_batch_size,
        learning_rate=learning_rate,
        warmup_ratio=0.10 if not dry_run else 0.0,
        lr_scheduler_type="cosine",
        optim="adamw_torch",
        weight_decay=0.01,
        fp16=use_fp16,
        bf16=use_bf16,
        eval_strategy="epoch" if not dry_run else "steps",
        eval_steps=eval_steps,
        save_strategy="epoch" if not dry_run else "no",
        save_total_limit=2,
        load_best_model_at_end=True if not dry_run else False,
        metric_for_best_model="ateneo_val_ir_evaluator_cosine_mrr@5" if not dry_run else None,
        greater_is_better=True,
        logging_dir=str(output_dir / "logs"),
        logging_steps=5 if not dry_run else 1,
        report_to="none",
        seed=42,
    )

    # 7. Inicialización del Trainer
    trainer = SentenceTransformerTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        loss=loss_fn,
        evaluator=evaluator,
    )

    # 8. Ejecución del entrenamiento
    logger.info("Iniciando optimización con SentenceTransformerTrainer...")
    train_result = trainer.train()

    # 9. Guardar el mejor modelo en el directorio de salida definitivo
    logger.info("Guardando modelo final re-entrenado en: %s", output_dir)
    model.save_pretrained(str(output_dir))

    elapsed_time = time.time() - start_time
    logger.info("Entrenamiento finalizado exitosamente en %.2f segundos (%.2f minutos).", elapsed_time, elapsed_time / 60.0)

    # 10. Guardar métricas de entrenamiento
    summary = {
        "base_model": base_model_name,
        "device": device,
        "gpu_name": torch.cuda.get_device_name(0) if device == "cuda" else "CPU",
        "precision": "bfloat16" if use_bf16 else "fp16" if use_fp16 else "fp32",
        "batch_size": effective_batch_size,
        "epochs": effective_epochs,
        "learning_rate": learning_rate,
        "temperature": temperature,
        "train_samples": len(train_triplets),
        "val_samples": len(val_triplets),
        "training_time_seconds": round(elapsed_time, 2),
        "training_loss": round(float(train_result.training_loss), 5) if hasattr(train_result, "training_loss") else None,
    }

    metrics_file = output_dir / "training_summary.json"
    with open(metrics_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    logger.info("Resumen de métricas guardado en: %s", metrics_file)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fase 6: Re-entrenamiento Contrastivo de BGE-M3 con MNRL para Ateneo+",
    )
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE, help="Batch size efectivo")
    parser.add_argument("--epochs", type=int, default=DEFAULT_EPOCHS, help="Número de épocas de entrenamiento")
    parser.add_argument("--lr", type=float, default=DEFAULT_LR, help="Tasa de aprendizaje (default: 2e-5)")
    parser.add_argument("--temperature", type=float, default=DEFAULT_TEMPERATURE, help="Temperatura tau para MNRL (default: 0.02)")
    parser.add_argument("--max-seq-length", type=int, default=DEFAULT_MAX_SEQ_LENGTH, help="Longitud máxima de contexto")
    parser.add_argument("--bf16", action="store_true", default=True, help="Activar bfloat16 nativo (recomendado en A100)")
    parser.add_argument("--no-bf16", dest="bf16", action="store_false", help="Desactivar bfloat16")
    parser.add_argument("--dry-run", action="store_true", help="Modo verificación rápida con 4 muestras y 1 época")

    args = parser.parse_args()

    train_bge_m3(
        batch_size=args.batch_size,
        epochs=args.epochs,
        learning_rate=args.lr,
        temperature=args.temperature,
        max_seq_length=args.max_seq_length,
        use_bf16=args.bf16,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    main()
