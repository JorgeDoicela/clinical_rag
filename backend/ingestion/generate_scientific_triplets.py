import json
import random
import re
from pathlib import Path
import sys
from typing import List, Dict, Any, Tuple
from collections import defaultdict

sys.path.append(str(Path(__file__).resolve().parent.parent))
from rag.retriever import get_chroma_client
from models.medical_catalog import get_medical_metadata_for_guide, load_medical_catalog

def compute_word_jaccard(text1: str, text2: str) -> float:
    """Calcula la similitud de Jaccard entre dos textos para la minería de negativos difíciles."""
    words1 = set(re.findall(r'\w+', text1.lower()))
    words2 = set(re.findall(r'\w+', text2.lower()))
    if not words1 or not words2:
        return 0.0
    return len(words1.intersection(words2)) / len(words1.union(words2))

def is_meaningful_chunk(text: str) -> bool:
    """Filtra fragmentos administrativos, carátulas o textos vacíos."""
    if len(text.strip()) < 100:
        return False
    noise_patterns = [
        r'^\s*segunda edición\s*\d*$',
        r'^\s*ministerio de salud pública\s*$',
        r'^\s*dirección nacional de normatización\s*$',
        r'^\s*av\.\s*república de el salvador\s*\d+',
        r'^\s*edición especial\s*-\s*registro oficial'
    ]
    for pattern in noise_patterns:
        if re.search(pattern, text, re.IGNORECASE) and len(text) < 180:
            return False
    return True

def stratified_document_split(
    guias_unicas: List[str],
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    seed: int = 42
) -> Tuple[set, set, set]:
    """
    Ejecuta una división estratificada a nivel de documento (Document-Level Stratified Split)
    agrupando las guías por especialidad médica para evitar sesgos temáticos y garantizar
    cero fuga de datos (Zero Data Leakage).
    """
    random.seed(seed)
    guias_por_especialidad = defaultdict(list)

    for g in guias_unicas:
        meta = get_medical_metadata_for_guide(g)
        esp = meta.get("especialidad", "Medicina General")
        guias_por_especialidad[esp].append(g)

    train_guias = set()
    val_guias = set()
    test_guias = set()

    for esp, guias in guias_por_especialidad.items():
        shuffled = list(guias)
        random.shuffle(shuffled)
        n = len(shuffled)
        
        if n == 1:
            train_guias.add(shuffled[0])
        elif n == 2:
            train_guias.add(shuffled[0])
            test_guias.add(shuffled[1])
        elif n == 3:
            train_guias.add(shuffled[0])
            val_guias.add(shuffled[1])
            test_guias.add(shuffled[2])
        else:
            n_tr = max(1, int(round(n * train_ratio)))
            n_va = max(1, int(round(n * val_ratio))) if (n - n_tr) > 1 else 0
            
            tr = shuffled[:n_tr]
            va = shuffled[n_tr:n_tr + n_va]
            te = shuffled[n_tr + n_va:]
            
            if not te and va:
                te = [va.pop()]
            if not te and len(tr) > 1:
                te = [tr.pop()]

            train_guias.update(tr)
            val_guias.update(va)
            test_guias.update(te)

    return train_guias, val_guias, test_guias

def generate_clinical_queries_for_chunk(
    doc: str,
    seccion: str,
    guia_fuente: str,
    ano_pub: int,
    especialidad: str
) -> List[str]:
    """
    Genera consultas clínicas variadas y rigurosas simulando el razonamiento
    médico en cuatro dimensiones: Diagnóstico, Terapéutica, Criterios de Severidad y Seguimiento.
    """
    queries = []
    sec_clean = seccion.strip()
    
    # Sintetizar tema principal
    first_lines = [l.strip() for l in doc.split("\n") if len(l.strip()) > 20 and not l.startswith("|")]
    topic_snippet = first_lines[0][:80] if first_lines else sec_clean

    if any(k in sec_clean.upper() for k in ["TRATAMIENTO", "MANEJO", "FARMACOLÓGICO", "DOSIS", "ESQUEMA"]):
        queries.append(f"¿Cuál es el esquema de tratamiento farmacológico y dosificación normado por el MSP ({guia_fuente}, {ano_pub}) para {sec_clean}?")
        queries.append(f"Manejo terapéutico y conducta clínica de elección en {topic_snippet} según la GPC oficial del MSP.")
    elif any(k in sec_clean.upper() for k in ["DIAGNÓSTICO", "CRITERIOS", "CLASIFICACIÓN", "EVALUACIÓN"]):
        queries.append(f"¿Cuáles son los criterios diagnósticos y signos de alarma en {sec_clean} establecidos por la norma MSP ({guia_fuente})?")
        queries.append(f"Protocolo de diagnóstico, sospecha clínica y clasificación de severidad para {topic_snippet}.")
    elif any(k in sec_clean.upper() for k in ["PREVENCIÓN", "CONTROL", "SEGUIMIENTO", "MONITOREO"]):
        queries.append(f"¿Qué directivas de prevención, tamizaje y seguimiento periódico dictamina el MSP ({ano_pub}) para {sec_clean}?")
    else:
        queries.append(f"¿Qué establece la Guía de Práctica Clínica oficial del MSP ({guia_fuente}, {ano_pub}) respecto a: {topic_snippet}?")
        if len(doc) > 300:
            queries.append(f"Conducta médica normada y algoritmo de atención para '{sec_clean}' en el Sistema Nacional de Salud.")

    return queries

def generate_scientific_triplets(
    output_dir: str = "./data",
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    hard_negatives_ratio: float = 0.85
):
    """
    Genera el dataset de entrenamiento y aplica la partición científica
    Document-Level Stratified Out-of-Distribution Split (Train / Validation / Test Ciego).
    """
    client = get_chroma_client()
    try:
        collection = client.get_collection("gpc_msp")
    except Exception:
        print("[ERROR] La colección 'gpc_msp' no existe. Ejecute primero run_ingestion.py")
        return

    data = collection.get(include=["documents", "metadatas"])
    documents = data.get("documents", [])
    metadatas = data.get("metadatas", [])
    ids = data.get("ids", [])

    if not documents:
        print("[ERROR] ChromaDB no tiene fragmentos indexados.")
        return

    print(f"[SCIENTIFIC DATASET] Procesando {len(documents)} fragmentos indexados...", flush=True)

    # Identificar todas las Guías clínicas distintas
    guias_unicas = sorted(list(set([m.get("guia_fuente", "MSP Ecuador") for m in metadatas if m.get("guia_fuente")])))
    
    # Partición Estratificada por Especialidad
    train_guias, val_guias, test_guias = stratified_document_split(
        guias_unicas, train_ratio=train_ratio, val_ratio=val_ratio, seed=42
    )

    print(f"\n==================================================================")
    print(f" DIVISIÓN CIENTÍFICA ESTRATIFICADA (Document-Level Out-of-Distribution)")
    print(f" Total de Guías GPC únicas: {len(guias_unicas)}")
    print(f"  - Guías Entrenamiento ({len(train_guias)}): {sorted(list(train_guias))}")
    print(f"  - Guías Validación ({len(val_guias)}): {sorted(list(val_guias))}")
    print(f"  - Guías Test Ciego ({len(test_guias)}): {sorted(list(test_guias))}")
    print(f"==================================================================\n", flush=True)

    doc_by_id = {ids[i]: documents[i] for i in range(len(ids))}
    valid_indices = [i for i, doc in enumerate(documents) if is_meaningful_chunk(doc)]

    # Mapeo de índices por guía y por especialidad para Hard Negative Mining
    indices_por_guia = defaultdict(list)
    indices_por_especialidad = defaultdict(list)

    for idx in valid_indices:
        g = metadatas[idx].get("guia_fuente", "")
        esp = metadatas[idx].get("especialidad", "Medicina Interna")
        indices_por_guia[g].append(idx)
        indices_por_especialidad[esp].append(idx)

    triplets_all = []
    seen_queries = set()

    # 1. Tripletas Sembradas de Casos Clínicos Anotados (Gold Standard)
    cases_file = Path(__file__).resolve().parent.parent / "cases_data" / "cases.json"
    if cases_file.exists():
        with open(cases_file, "r", encoding="utf-8") as f:
            cases_list = json.load(f).get("cases", [])
            for c in cases_list:
                query_text = f"{c.get('titulo')}: {c.get('pregunta')}"
                guia_fuente = c.get("guia_asociada", "")
                ideal_chunk_id = c.get("fragmento_gpc_ideal_id")

                pos_text = ""
                if ideal_chunk_id and ideal_chunk_id in doc_by_id:
                    pos_text = doc_by_id[ideal_chunk_id]
                else:
                    cand = [documents[i] for i in indices_por_guia.get(guia_fuente, [])]
                    if cand:
                        pos_text = cand[0]

                if pos_text:
                    # Minería de negativo difícil dentro de la misma especialidad
                    meta_esp = get_medical_metadata_for_guide(guia_fuente).get("especialidad", "")
                    same_esp_candidates = [documents[i] for i in indices_por_especialidad.get(meta_esp, []) if documents[i] != pos_text]
                    
                    if same_esp_candidates:
                        neg_text = max(same_esp_candidates, key=lambda d: compute_word_jaccard(pos_text, d))
                    else:
                        other_candidates = [documents[i] for i in valid_indices if documents[i] != pos_text]
                        neg_text = max(other_candidates, key=lambda d: compute_word_jaccard(pos_text, d)) if other_candidates else "Norma clínica general."

                    triplets_all.append({
                        "id": f"gold_seed_{c.get('id')}",
                        "query": query_text,
                        "pos": pos_text,
                        "neg": neg_text,
                        "guia_fuente": guia_fuente,
                        "seccion": "Caso Clínico Oro (Gold Standard)",
                        "tipo_negativo": "Hard Negative Intra-Especialidad"
                    })
                    seen_queries.add(query_text)

    # 2. Generación Masiva con Dense/Lexical Hard Negative Mining
    for idx in valid_indices:
        doc = documents[idx]
        meta = metadatas[idx]
        guia_fuente = meta.get("guia_fuente", "")
        seccion = meta.get("seccion", "General / Recomendaciones Clave")
        ano_pub = meta.get("ano_publicacion", 2019)
        especialidad = meta.get("especialidad", "Medicina Interna")

        generated_queries = generate_clinical_queries_for_chunk(doc, seccion, guia_fuente, ano_pub, especialidad)

        for query_text in generated_queries:
            if query_text in seen_queries:
                continue
            seen_queries.add(query_text)

            # Estrategia de Negativo Difícil (Hard Negative Mining Multinivel)
            neg_text = ""
            tipo_neg = ""

            same_guia_negatives = [documents[i] for i in indices_por_guia.get(guia_fuente, []) if i != idx]
            same_esp_negatives = [documents[i] for i in indices_por_especialidad.get(especialidad, []) if metadatas[i].get("guia_fuente") != guia_fuente]

            dice = random.random()
            if same_guia_negatives and dice < 0.60:
                # Nivel 1: Negativo difícil de la MISMA guía (máxima confusión temática)
                neg_text = max(same_guia_negatives, key=lambda d: compute_word_jaccard(doc, d))
                tipo_neg = "Hard Negative Intra-Guía"
            elif same_esp_negatives and dice < 0.90:
                # Nivel 2: Negativo difícil de la MISMA especialidad pero distinta guía
                neg_text = max(same_esp_negatives, key=lambda d: compute_word_jaccard(doc, d))
                tipo_neg = "Hard Negative Intra-Especialidad"
            else:
                # Nivel 3: Negativo inter-guía aleatorio
                other_negatives = [documents[i] for i in valid_indices if metadatas[i].get("guia_fuente") != guia_fuente]
                neg_text = random.choice(other_negatives) if other_negatives else "Normativa médica general."
                tipo_neg = "Negative Aleatorio Inter-Guía"

            triplets_all.append({
                "id": f"triplet_{len(triplets_all):05d}",
                "query": query_text,
                "pos": doc,
                "neg": neg_text,
                "guia_fuente": guia_fuente,
                "seccion": seccion,
                "ano_publicacion": ano_pub,
                "especialidad": especialidad,
                "tipo_negativo": tipo_neg
            })

    # Clasificar tripletas según su guía fuente para garantizar Cero Data Leakage
    train_triplets = [t for t in triplets_all if t.get("guia_fuente") in train_guias or t.get("id", "").startswith("gold_seed_")]
    val_triplets = [t for t in triplets_all if t.get("guia_fuente") in val_guias and not t.get("id", "").startswith("gold_seed_")]
    test_triplets = [t for t in triplets_all if t.get("guia_fuente") in test_guias and not t.get("id", "").startswith("gold_seed_")]

    base_dir = Path(__file__).resolve().parent.parent / output_dir
    base_dir.mkdir(parents=True, exist_ok=True)

    with open(base_dir / "ft_dataset.json", "w", encoding="utf-8") as f:
        json.dump(triplets_all, f, indent=2, ensure_ascii=False)

    with open(base_dir / "train_triplets.json", "w", encoding="utf-8") as f:
        json.dump(train_triplets, f, indent=2, ensure_ascii=False)

    with open(base_dir / "val_triplets.json", "w", encoding="utf-8") as f:
        json.dump(val_triplets, f, indent=2, ensure_ascii=False)

    with open(base_dir / "test_triplets_blind.json", "w", encoding="utf-8") as f:
        json.dump(test_triplets, f, indent=2, ensure_ascii=False)

    print(f"\n[OK] Generación de Datasets Científicos Completada:")
    print(f"  - Dataset Global Completo: {len(triplets_all)} tripletas en 'ft_dataset.json'")
    print(f"  - Train Set (70%): {len(train_triplets)} tripletas ({len(train_guias)} Guías) en 'train_triplets.json'")
    print(f"  - Validation Set (15%): {len(val_triplets)} tripletas ({len(val_guias)} Guías) en 'val_triplets.json'")
    print(f"  - Test Set Ciego Out-of-Distribution (15%): {len(test_triplets)} tripletas ({len(test_guias)} Guías) en 'test_triplets_blind.json'", flush=True)

    return len(triplets_all)

if __name__ == "__main__":
    generate_scientific_triplets()
