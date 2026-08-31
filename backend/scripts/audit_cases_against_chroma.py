import json
import os
import sys

# Agregar ruta backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag.retriever import retrieve_relevant_chunk, get_chroma_client
from models.clinical_case import load_all_cases

def main():
    print("=== AUDITORÍA REAL DE CASOS CLÍNICOS VS CHROMADB ===")
    cases = load_all_cases()
    print(f"Total de casos a auditar: {len(cases)}\n")

    client = get_chroma_client()
    collection = client.get_collection("gpc_msp")
    print(f"Colección gpc_msp cargada con {collection.count()} fragmentos vectoriales.\n")

    results = []

    for c in cases:
        print(f"--- Caso: {c.id} ({c.titulo}) ---")
        print(f"Guía solicitada: {c.guia_asociada}")
        
        # Consultar ChromaDB con la pregunta y el enunciado
        query_text = f"{c.enunciado} {c.pregunta}"
        try:
            chunk = retrieve_relevant_chunk(query=query_text, guia_filtro=c.guia_asociada)
            print(f"-> Chunk recuperado ID: {chunk.get('chunk_id')}")
            print(f"-> Guía real en chunk: {chunk.get('guia')}")
            print(f"-> Sección: {chunk.get('seccion')}")
            print(f"-> Página: {chunk.get('pagina')}")
            texto = chunk.get('texto', '')
            print(f"-> Extracto (primeros 250 car.):\n   {texto[:250]}...\n")
            
            results.append({
                "case_id": c.id,
                "case_title": c.titulo,
                "guia_configurada": c.guia_asociada,
                "guia_recuperada": chunk.get('guia'),
                "chunk_id": chunk.get('chunk_id'),
                "pagina": chunk.get('pagina'),
                "seccion": chunk.get('seccion'),
                "match_success": True
            })
        except Exception as e:
            print(f"ERROR recuperando chunk: {e}\n")
            results.append({
                "case_id": c.id,
                "case_title": c.titulo,
                "error": str(e),
                "match_success": False
            })

    print("\n=== RESUMEN DE AUDITORÍA ===")
    success_count = sum(1 for r in results if r.get('match_success'))
    print(f"Recuperación exitosa: {success_count}/{len(cases)} casos.")

if __name__ == "__main__":
    main()
