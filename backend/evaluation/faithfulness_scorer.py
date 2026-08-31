"""
Módulo de Verificación de Fidelidad Normativa (Faithfulness Score) para Ateneo+
Calcula la proporción de afirmaciones evaluativas respaldadas por el contexto de la GPC del MSP.
Referencia científica: Es et al. (2023), RAGAS: Automated Evaluation of RAG.
"""

import re
import unicodedata
from typing import List, Dict, Any

def normalize_text(text: str) -> str:
    """Normaliza texto eliminando acentos, puntuación y convirtiendo a minúsculas."""
    if not text:
        return ""
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^\w\s]", " ", text)
    return " ".join(text.split())

def calculate_faithfulness_score(
    aciertos: List[str],
    omisiones: List[str],
    chunk_normativo_texto: str,
    threshold: float = 0.50
) -> Dict[str, Any]:
    """
    Verifica que las afirmaciones clínicas emitidas por el evaluador LLM tengan
    sustento empírico en el fragmento normativo recuperado (Anti-Alucinación).
    """
    norm_chunk = normalize_text(chunk_normativo_texto)
    chunk_words = set(norm_chunk.split())
    
    all_claims = []
    for a in aciertos:
        if a and len(a.strip()) > 5:
            all_claims.append({"tipo": "acierto", "texto": a.strip()})
    for o in omisiones:
        if o and len(o.strip()) > 5:
            all_claims.append({"tipo": "omision", "texto": o.strip()})

    if not all_claims:
        return {
            "faithfulness_score": 1.0,
            "total_claims": 0,
            "grounded_claims": 0,
            "grounded_percentage": 100.0,
            "grounding_level": "Alto Grounding Normativo (Anti-Alucinación)",
            "verificaciones": []
        }

    grounded_count = 0
    verificaciones = []

    # Stopwords clínicas en español para filtrar
    stopwords = {
        "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "a", "al",
        "en", "con", "por", "para", "que", "y", "o", "no", "se", "su", "sus", "como",
        "mas", "este", "esta", "estos", "estas", "fue", "era", "son", "es", "ser",
        "paciente", "estudiante", "clinico", "clinica", "adecuadamente", "correctamente"
    }

    for claim in all_claims:
        claim_norm = normalize_text(claim["texto"])
        claim_tokens = [w for w in claim_norm.split() if w not in stopwords and len(w) > 2]
        
        if not claim_tokens:
            grounded_count += 1
            verificaciones.append({
                "texto": claim["texto"],
                "tipo": claim["tipo"],
                "grounded": True,
                "overlap_ratio": 1.0
            })
            continue

        # Medir intersección de conceptos clave con el chunk normativo
        matching_tokens = [t for t in claim_tokens if t in chunk_words or any(t in cw for cw in chunk_words)]
        overlap = len(matching_tokens) / len(claim_tokens)
        
        is_grounded = overlap >= threshold or len(matching_tokens) >= 2
        if is_grounded:
            grounded_count += 1

        verificaciones.append({
            "texto": claim["texto"],
            "tipo": claim["tipo"],
            "grounded": is_grounded,
            "overlap_ratio": round(overlap, 3),
            "tokens_coincidentes": matching_tokens[:5]
        })

    score = round(grounded_count / len(all_claims), 4)
    pct = round(score * 100.0, 1)

    if score >= 0.80:
        level = "Alto Grounding Normativo (Anti-Alucinación)"
    elif score >= 0.60:
        level = "Moderado Grounding Normativo"
    else:
        level = "Bajo Grounding (Riesgo de Deriva)"

    return {
        "faithfulness_score": score,
        "total_claims": len(all_claims),
        "grounded_claims": grounded_count,
        "grounded_percentage": pct,
        "grounding_level": level,
        "verificaciones": verificaciones
    }
