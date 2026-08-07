import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from config import RAW_PDFS_PATH
from ingestion.pdf_extractor import extract_text_by_page
from ingestion.chunker import chunk_by_section
from ingestion.vectorize import build_vector_db

SEED_CHUNKS = [
    {
        "chunk_id": "dengue_chunk_004",
        "guia_fuente": "dengue",
        "pagina": 18,
        "seccion": "Clasificación de Dengue con Signos de Alarma y Tratamiento",
        "texto": "Dengue con signos de alarma incluye: dolor abdominal intenso y continuo, vómitos persistentes, acumulación de líquidos, sangrado de mucosas, letargo/irritabilidad, hepatomegalia > 2cm y aumento del hematocrito concurrente con rápida disminución de plaquetas. Manejo: Hospitalización inmediata y reposición de líquidos intravenosos con cristaloides (Lactato Ringer o Solución Salina 0.9%) iniciando a 5 a 7 ml/kg/hora durante las primeras 1-2 horas, evaluando signos vitales y diuresis. Reevaluar hematocrito seriado."
    },
    {
        "chunk_id": "preeclampsia_chunk_002",
        "guia_fuente": "preeclampsia",
        "pagina": 24,
        "seccion": "Manejo de Preeclampsia con Criterios de Severidad",
        "texto": "En preeclampsia con criterios de severidad (PA sistólica >= 160 mmHg o diastólica >= 110 mmHg, cefalea persistente, alteraciones visuales, epigastralgia, proteinuria), el tratamiento anticonvulsivante de elección es el Sulfato de Magnesio. Esquema de impregnación: 4 g IV diluidos en 100 ml de Solución Salina al 0.9% en 15 a 20 minutos. Esquema de mantenimiento: 1 g/hora en infusión IV continua por 24 horas. Para la crisis hipertensiva: Labetalol IV (20 mg dosis inicial) o Hidralazina IV (5 mg dosis inicial) o Nifedipino de acción rápida VO (10 mg)."
    },
    {
        "chunk_id": "diabetes_chunk_005",
        "guia_fuente": "diabetes_t2",
        "pagina": 31,
        "seccion": "Tratamiento Farmacológico Inicial en Diabetes Mellitus Tipo 2",
        "texto": "En pacientes con Diabetes Mellitus Tipo 2 con HbA1c entre 7.5% y 9.0% al diagnóstico o tras falla de estilo de vida, se recomienda iniciar terapia farmacológica con Metformina (dosis inicial 500-850 mg/día escalando hasta 2000 mg/día). Si HbA1c > 8.5%, considerar inicio temprano de terapia combinada dual (Metformina + iSGLT2 o aGLP-1 si hay riesgo cardiovascular/renal elevado, o Metformina + Sulfonilurea según disponibilidad)."
    },
    {
        "chunk_id": "hemorragia_chunk_001",
        "guia_fuente": "hemorragia_posparto",
        "pagina": 12,
        "seccion": "Manejo Activo del Código Rojo por Atonía Uterina",
        "texto": "La atonía uterina (Tono de la regla de las 4T) es la causa de hasta el 80% de las hemorragias posparto inmediatas. Manejo inmediato: 1. Masaje uterino bimanual externo e interno continuo. 2. Administración de Uterotónicos de primera línea: Oxitocina 10 UI IM o 5 UI IV en bolo lento, seguido de infusión IV (20 UI en 500 ml de solución cristalode a 125 ml/hora). De segunda línea: Ergometrina 0.2 mg IM (contraindicada en hipertensión/preeclampsia) y/o Misoprostol 800 mcg vía sublingual o rectal. Administración temprana de Ácido Tranexámico 1 g IV en los primeros 10 minutos."
    }
]

def run_ingestion_pipeline():
    raw_dir = Path(RAW_PDFS_PATH)
    raw_dir.mkdir(parents=True, exist_ok=True)
    pdf_files = list(raw_dir.glob("*.pdf"))

    all_chunks = []
    if pdf_files:
        print(f"Encontrados {len(pdf_files)} PDFs en {raw_dir}. Procesando...")
        for pdf_file in pdf_files:
            guia_id = pdf_file.stem.lower()
            pages = extract_text_by_page(pdf_file)
            chunks = chunk_by_section(pages, guia_id=guia_id)
            all_chunks.extend(chunks)
        print(f"Total de chunks extraídos de PDFs: {len(all_chunks)}")
    else:
        print("No se encontraron PDFs en raw_pdfs/. Indexando chunks sembrados de respaldo para inicialización rápida...")
        all_chunks = SEED_CHUNKS

    collection = build_vector_db(all_chunks)
    print(f"[OK] Ingesta completada con éxito. Colección ChromaDB activa con {collection.count()} fragmentos vectorizados.")

if __name__ == "__main__":
    run_ingestion_pipeline()
