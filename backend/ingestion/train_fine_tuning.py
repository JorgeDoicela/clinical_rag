import json
import os
import sys
import random
from pathlib import Path
import numpy as np
import torch

sys.path.append(str(Path(__file__).resolve().parent.parent))
from config import EMBEDDING_MODEL_NAME

def train_bge_m3_fine_tuning(
    train_dataset_path: str = "./data/train_triplets.json",
    val_dataset_path: str = "./data/val_triplets.json",
    output_dir: str = "./data/ateneo-bge-m3-ecuador",
    epochs: int = 3,
    batch_size: int = 2,
    max_seq_length: int = 512
):
    """
    Ejecuta el entrenamiento profesional (Fine-Tuning de Grado Científico) del modelo BAAI/bge-m3
    utilizando Multiple Negatives Ranking Loss (MNRL) y evaluación por época sobre el Validation Set.
    """
    from sentence_transformers import SentenceTransformer, InputExample, losses
    from sentence_transformers.evaluation import TripletEvaluator
    from torch.utils.data import DataLoader

    random.seed(42)
    np.random.seed(42)
    torch.manual_seed(42)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(42)

    total_cores = os.cpu_count() or 4
    safe_threads = max(2, min(6, total_cores - 2))
    torch.set_num_threads(safe_threads)

    train_file = Path(__file__).resolve().parent.parent / train_dataset_path
    val_file = Path(__file__).resolve().parent.parent / val_dataset_path

    if not train_file.exists():
        # Fallback al dataset global si no se ha dividido
        train_file = Path(__file__).resolve().parent.parent / "./data/ft_dataset.json"

    with open(train_file, "r", encoding="utf-8") as f:
        train_data = json.load(f)

    print(f"[TRAIN] Cargando {len(train_data)} tripletas de entrenamiento desde {train_file.name}...")
    train_examples = [InputExample(texts=[item["query"], item["pos"], item["neg"]]) for item in train_data]
    train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=batch_size)

    evaluator = None
    if val_file.exists():
        with open(val_file, "r", encoding="utf-8") as f:
            val_data = json.load(f)
        print(f"[VAL] Configurando evaluador de validación con {len(val_data)} tripletas...")
        evaluator = TripletEvaluator(
            anchors=[item["query"] for item in val_data],
            positives=[item["pos"] for item in val_data],
            negatives=[item["neg"] for item in val_data],
            name="ateneo_validation_benchmark"
        )

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[TRAIN] Inicializando modelo en dispositivo: {device.upper()}")

    model = SentenceTransformer(EMBEDDING_MODEL_NAME, device=device)
    model.max_seq_length = max_seq_length
    if device == "cuda":
        torch.cuda.empty_cache()

    train_loss = losses.MultipleNegativesRankingLoss(model)

    output_path = Path(__file__).resolve().parent.parent / output_dir
    output_path.mkdir(parents=True, exist_ok=True)

    print(f"[TRAIN] Iniciando Fine-Tuning Científico ({epochs} épocas, batch={batch_size}, max_seq={max_seq_length})...")
    
    model.fit(
        train_objectives=[(train_dataloader, train_loss)],
        evaluator=evaluator,
        epochs=epochs,
        evaluation_steps=len(train_dataloader),
        warmup_steps=int(len(train_dataloader) * epochs * 0.1),
        output_path=str(output_path),
        checkpoint_path=str(output_path / "checkpoints"),
        checkpoint_save_steps=len(train_dataloader),
        use_amp=(device == "cuda"),
        show_progress_bar=True
    )

    print(f"[OK] Fine-Tuning completado exitosamente. Pesos optimizados guardados en: {output_path}")

if __name__ == "__main__":
    train_bge_m3_fine_tuning()
