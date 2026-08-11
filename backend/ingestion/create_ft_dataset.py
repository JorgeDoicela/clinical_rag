import json
import random
import re
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parent.parent))
from rag.retriever import get_chroma_client

def is_meaningful_text(text: str) -> bool:
    """Filtra fragmentos que son portadas, índices o metadatos vacíos."""
    if len(text.strip()) < 120:
        return False
    noise_patterns = [
        r'^\s*segunda edición\s*\d*$',
        r'^\s*ministerio de salud pública\s*$',
        r'^\s*guía de práctica clínica\s*$',
    ]
    for pattern in noise_patterns:
        if re.search(pattern, text, re.IGNORECASE) and len(text) < 200:
            return False
    return True

def generate_fine_tuning_triplets(output_path: str = "./data/ft_dataset.json"):
    """
    Genera un dataset profesional y limpio de entrenamiento (Triplets: Query, Positivo, Negativo)
    a partir de los Casos Clínicos Sembrados y las Guías MSP de ChromaDB.
    """
    client = get_chroma_client()
    collection = client.get_collection("gpc_msp")

    data = collection.get(include=["documents", "metadatas"])
    documents = data.get("documents", [])
    metadatas = data.get("metadatas", [])
    ids = data.get("ids", [])

    if not documents:
        print("[ERROR] La colección ChromaDB está vacía. Ejecute primero run_ingestion.py")
        return

    print(f"[DATASET] Analizando {len(documents)} fragmentos en ChromaDB...")

    doc_by_id = {ids[i]: documents[i] for i in range(len(ids))}
    meta_by_id = {ids[i]: metadatas[i] for i in range(len(ids))}

    triplets = []
    seen_queries = set()

    # 1. Incorporar Casos Clínicos Sembrados de referencia (Alta calidad clinical seed)
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
                    cand = [doc for i, doc in enumerate(documents) if metadatas[i].get("guia_fuente") == guia_fuente and is_meaningful_text(doc)]
                    if cand:
                        pos_text = cand[0]

                if pos_text:
                    neg_candidates = [doc for i, doc in enumerate(documents) if metadatas[i].get("guia_fuente") != guia_fuente and is_meaningful_text(doc)]
                    neg_text = random.choice(neg_candidates) if neg_candidates else "Información no relacionada."

                    triplets.append({
                        "id": f"seed_{c.get('id')}",
                        "query": query_text,
                        "pos": pos_text,
                        "neg": neg_text,
                        "guia_fuente": guia_fuente,
                        "seccion": "Caso Clínico Real"
                    })
                    seen_queries.add(query_text)

    # 2. Generar tripletas sintéticas solo para fragmentos normativos relevantes
    for idx, doc in enumerate(documents):
        if not is_meaningful_text(doc):
            continue

        meta = metadatas[idx]
        guia_fuente = meta.get("guia_fuente", "")
        seccion = meta.get("seccion", "General")

        if seccion and seccion != "General / Recomendaciones Clave":
            query_text = f"¿Cuál es el protocolo de manejo y tratamiento para {seccion.strip()} según la norma MSP ({guia_fuente})?"
        else:
            first_line = [line.strip() for line in doc.split("\n") if len(line.strip()) > 20][:1]
            topic = first_line[0][:80] if first_line else "la recomendación clínica"
            query_text = f"¿Qué establece la norma MSP ({guia_fuente}) respecto a: {topic}?"

        if query_text in seen_queries:
            continue
        seen_queries.add(query_text)

        neg_candidates = [d for i, d in enumerate(documents) if metadatas[i].get("guia_fuente") != guia_fuente and is_meaningful_text(d)]
        if not neg_candidates:
            neg_candidates = [d for i, d in enumerate(documents) if i != idx and is_meaningful_text(d)]

        neg_text = random.choice(neg_candidates) if neg_candidates else "Información clínica no relacionada."

        triplets.append({
            "id": f"triplet_{len(triplets):04d}",
            "query": query_text,
            "pos": doc,
            "neg": neg_text,
            "guia_fuente": guia_fuente,
            "seccion": seccion
        })

    output_file = Path(__file__).resolve().parent.parent / output_path
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(triplets, f, indent=2, ensure_ascii=False)

    print(f"[OK] Dataset de Fine-Tuning depurado con {len(triplets)} tripletas únicas y relevantes en: {output_file}")

if __name__ == "__main__":
    generate_fine_tuning_triplets()

