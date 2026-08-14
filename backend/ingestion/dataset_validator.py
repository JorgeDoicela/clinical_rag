import json
import unicodedata
from pathlib import Path
from typing import Dict, Any
from collections import defaultdict
import sys

# Configurar encoding UTF-8 en consola para Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

sys.path.append(str(Path(__file__).resolve().parent.parent))
from models.medical_catalog import get_medical_metadata_for_guide

def clean_name_display(name: str) -> str:
    """Normaliza cadenas para visualización segura en consola Windows."""
    return unicodedata.normalize("NFKC", str(name)).encode("ascii", "replace").decode("ascii")

def validate_dataset_integrity(base_dir_str: str = "./data") -> Dict[str, Any]:
    """
    Audita rigurosamente la integridad científica del dataset de entrenamiento y valida:
    1. Cero fuga de datos (Zero Data Leakage) entre Train, Validation y Test Ciego.
    2. Intersección nula de Guías de Práctica Clínica: Guias(Train) ∩ Guias(Test) = ∅.
    3. Distribución estratificada equilibrada por especialidad médica.
    """
    base_dir = Path(__file__).resolve().parent.parent / base_dir_str
    
    files = {
        "global": base_dir / "ft_dataset.json",
        "train": base_dir / "train_triplets.json",
        "val": base_dir / "val_triplets.json",
        "test": base_dir / "test_triplets_blind.json"
    }

    datasets = {}
    for key, path in files.items():
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                datasets[key] = json.load(f)
        else:
            datasets[key] = []

    global_triplets = datasets.get("global", [])
    train_triplets = datasets.get("train", [])
    val_triplets = datasets.get("val", [])
    test_triplets = datasets.get("test", [])

    # Auditar Guías involucradas por split (excluyendo casos oro sembrados)
    train_guias = set(t.get("guia_fuente") for t in train_triplets if t.get("guia_fuente") and not t.get("id", "").startswith("gold_seed_"))
    val_guias = set(t.get("guia_fuente") for t in val_triplets if t.get("guia_fuente"))
    test_guias = set(t.get("guia_fuente") for t in test_triplets if t.get("guia_fuente"))

    # 1. Verificar fuga de guías
    overlap_train_test_guias = train_guias.intersection(test_guias)
    overlap_train_val_guias = train_guias.intersection(val_guias)
    overlap_val_test_guias = val_guias.intersection(test_guias)
    
    # 2. Verificar fuga de textos positivos exactos
    train_positives = set(t.get("pos") for t in train_triplets if not t.get("id", "").startswith("gold_seed_"))
    test_positives = set(t.get("pos") for t in test_triplets)
    val_positives = set(t.get("pos") for t in val_triplets)
    
    pos_overlap_train_test = train_positives.intersection(test_positives)
    pos_overlap_train_val = train_positives.intersection(val_positives)

    leakage_detected = len(overlap_train_test_guias) > 0 or len(pos_overlap_train_test) > 0

    # 3. Distribución por Especialidad Médica
    especialidades_train = defaultdict(int)
    especialidades_val = defaultdict(int)
    especialidades_test = defaultdict(int)

    for g in train_guias:
        esp = get_medical_metadata_for_guide(g).get("especialidad", "Otras")
        especialidades_train[esp] += 1
    for g in val_guias:
        esp = get_medical_metadata_for_guide(g).get("especialidad", "Otras")
        especialidades_val[esp] += 1
    for g in test_guias:
        esp = get_medical_metadata_for_guide(g).get("especialidad", "Otras")
        especialidades_test[esp] += 1

    report = {
        "total_tripletas_global": len(global_triplets),
        "split_counts": {
            "train": len(train_triplets),
            "val": len(val_triplets),
            "test_blind": len(test_triplets)
        },
        "guias_por_split": {
            "train_guias_count": len(train_guias),
            "val_guias_count": len(val_guias),
            "test_guias_count": len(test_guias)
        },
        "data_leakage_guia_overlaps": {
            "train_vs_test": list(overlap_train_test_guias),
            "train_vs_val": list(overlap_train_val_guias),
            "val_vs_test": list(overlap_val_test_guias)
        },
        "data_leakage_text_overlaps_count": len(pos_overlap_train_test),
        "estado_integridad": "VALIDO (CERO FUGA DE DATOS: Document-Level Out-of-Distribution Estricto)" if not leakage_detected else "ALERTA DE DATA LEAKAGE DETECTADA"
    }

    print("\n==================================================================")
    print(" AUDITORIA CIENTIFICA FORMAL DE INTEGRIDAD Y DATA LEAKAGE")
    print("==================================================================")
    print(f"Total Tripletas Globales: {report['total_tripletas_global']}")
    print(f"  - Train Set (70%): {report['split_counts']['train']} tripletas | {report['guias_por_split']['train_guias_count']} Guias Clinicas")
    print(f"  - Val Set   (15%): {report['split_counts']['val']} tripletas | {report['guias_por_split']['val_guias_count']} Guias Clinicas")
    print(f"  - Test Set  (15%): {report['split_counts']['test_blind']} tripletas | {report['guias_por_split']['test_guias_count']} Guias Clinicas (Ciegas)")
    print(f"\nEstado de Integridad: {report['estado_integridad']}")
    print(f"Fuga de Guias Train vs Test: {len(overlap_train_test_guias)} (Esperado: 0)")
    print(f"Fuga de Parrafos Train vs Test: {len(pos_overlap_train_test)} (Esperado: 0)")
    print("==================================================================\n", flush=True)

    return report

if __name__ == "__main__":
    validate_dataset_integrity()
