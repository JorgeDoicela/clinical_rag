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
    epochs: int = 3,
    batch_size: int = 2,
    max_seq_length: int = 512
):
    """
    Ejecuta el entrenamiento profesional (Fine-Tuning de Grado Científico) del modelo BAAI/bge-m3
    sobre el dataset de tripletas clínicas depuradas de las GPC del MSP Ecuador.
    Configuración de publicación: 3 épocas, max_seq_length=1024, MultipleNegativesRankingLoss.
    """
    from sentence_transformers import SentenceTransformer, InputExample, losses
    from torch.utils.data import DataLoader

    # Hilos asignados equilibrados para procesamiento multihilo eficiente
    total_cores = os.cpu_count() or 4
    safe_threads = max(2, min(6, total_cores - 2))
    torch.set_num_threads(safe_threads)
    try:
        torch.set_num_interop_threads(safe_threads)
    except Exception:
        pass

    print(f"[CONFIG] Hilos CPU dedicados: {safe_threads} de {total_cores} núcleos disponibles.")

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
    # Longitud de secuencia profesional de 1024 tokens para preservar tablas de dosificación y algoritmos normativos
    model.max_seq_length = max_seq_length
    if device == "cuda":
        torch.cuda.empty_cache()

    train_loss = losses.MultipleNegativesRankingLoss(model)

    output_path = Path(__file__).resolve().parent.parent / output_dir
    output_path.mkdir(parents=True, exist_ok=True)

    print(f"[TRAIN] Iniciando Fine-Tuning Profesional ({epochs} época(s), batch_size={batch_size}, max_seq_len={max_seq_length})...")
    use_amp = (device == "cuda")
    model.fit(
        train_objectives=[(train_dataloader, train_loss)],
        epochs=epochs,
        warmup_steps=int(len(train_dataloader) * 0.1),
        output_path=str(output_path),
        checkpoint_path=str(output_path / "checkpoints"),
        checkpoint_save_steps=len(train_dataloader),
        use_amp=use_amp,
        show_progress_bar=True
    )

    print(f"[OK] Fine-Tuning Profesional completado exitosamente. Pesos optimizados guardados en: {output_path}")

if __name__ == "__main__":
    train_bge_m3_fine_tuning()

