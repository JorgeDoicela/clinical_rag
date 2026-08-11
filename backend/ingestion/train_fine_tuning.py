import json
import os
import sys
from pathlib import Path
import torch

sys.path.append(str(Path(__file__).resolve().parent.parent))
from config import EMBEDDING_MODEL_NAME

def train_bge_m3_fine_tuning(
    dataset_path: str = "./data/ft_dataset.json",
    output_dir: str = "./data/ateneo-bge-m3-ecuador",
    epochs: int = 1,
    batch_size: int = 2
):
    """
    Ejecuta el entrenamiento (Fine-Tuning) del modelo BAAI/bge-m3 sobre el dataset
    de tripletas clínicas depuradas de las GPC del MSP Ecuador de forma segura para CPU.
    """
    from sentence_transformers import SentenceTransformer, InputExample, losses
    from torch.utils.data import DataLoader

    # Control estricto de hilos para prevenir que la laptop se bloquee o sobrecaliente en CPU
    total_cores = os.cpu_count() or 4
    safe_threads = max(1, min(4, total_cores - 2))
    torch.set_num_threads(safe_threads)
    try:
        torch.set_num_interop_threads(safe_threads)
    except Exception:
        pass

    print(f"[CONFIG] Hilos CPU asignados de forma segura: {safe_threads} de {total_cores} núcleos del sistema.")

    dataset_file = Path(__file__).resolve().parent.parent / dataset_path
    if not dataset_file.exists():
        print(f"[ERROR] No se encontró el dataset en {dataset_file}. Ejecute primero create_ft_dataset.py")
        return

    with open(dataset_file, "r", encoding="utf-8") as f:
        triplets_data = json.load(f)

    print(f"[TRAIN] Cargando {len(triplets_data)} tripletas clínicas depuradas para Fine-Tuning de {EMBEDDING_MODEL_NAME}...")

    train_examples = []
    for item in triplets_data:
        train_examples.append(InputExample(texts=[item["query"], item["pos"], item["neg"]]))

    train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=batch_size)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[TRAIN] Inicializando modelo en dispositivo: {device.upper()}")

    model = SentenceTransformer(EMBEDDING_MODEL_NAME, device=device)
    train_loss = losses.MultipleNegativesRankingLoss(model)

    output_path = Path(__file__).resolve().parent.parent / output_dir
    output_path.mkdir(parents=True, exist_ok=True)

    print(f"[TRAIN] Iniciando Fine-Tuning de alto rendimiento ({epochs} época(s), batch_size={batch_size})...")
    model.fit(
        train_objectives=[(train_dataloader, train_loss)],
        epochs=epochs,
        warmup_steps=int(len(train_dataloader) * 0.1),
        output_path=str(output_path),
        show_progress_bar=True
    )

    print(f"[OK] Fine-Tuning completado exitosamente. Pesos optimizados guardados en: {output_path}")

if __name__ == "__main__":
    train_bge_m3_fine_tuning()

