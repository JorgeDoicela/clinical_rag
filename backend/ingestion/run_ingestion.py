import sys
import os
import unicodedata
from pathlib import Path

# Configurar encoding UTF-8 en consola para Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

sys.path.append(str(Path(__file__).resolve().parent.parent))

from config import RAW_PDFS_PATH
from ingestion.pdf_advanced_parser import extract_advanced_text_by_page
from ingestion.chunker import chunk_by_section
from ingestion.vectorize import build_vector_db

SEED_CHUNKS = [
    {
        "chunk_id": "dengue_chunk_004",
        "guia_fuente": "dengue",
        "pagina": 18,
        "seccion": "Clasificación de Dengue con Signos de Alarma y Tratamiento",
        "ano_publicacion": 2017,
        "texto": "Dengue con signos de alarma incluye: dolor abdominal intenso y continuo, vómitos persistentes, acumulación de líquidos, sangrado de mucosas, letargo/irritabilidad, hepatomegalia > 2cm y aumento del hematocrito concurrente con rápida disminución de plaquetas. Manejo: Hospitalización inmediata y reposición de líquidos intravenosos con cristaloides (Lactato Ringer o Solución Salina 0.9%) iniciando a 5 a 7 ml/kg/hora durante las primeras 1-2 horas, evaluando signos vitales y diuresis. Reevaluar hematocrito seriado."
    },
    {
        "chunk_id": "preeclampsia_chunk_002",
        "guia_fuente": "preeclampsia",
        "pagina": 24,
        "seccion": "Manejo de Preeclampsia con Criterios de Severidad",
        "ano_publicacion": 2016,
        "texto": "En preeclampsia con criterios de severidad (PA sistólica >= 160 mmHg o diastólica >= 110 mmHg, cefalea persistente, alteraciones visuales, epigastralgia, proteinuria), el tratamiento anticonvulsivante de elección es el Sulfato de Magnesio. Esquema de impregnación: 4 g IV diluidos en 100 ml de Solución Salina al 0.9% en 15 a 20 minutos. Esquema de mantenimiento: 1 g/hora en infusión IV continua por 24 horas. Para la crisis hipertensiva: Labetalol IV (20 mg dosis inicial) o Hidralazina IV (5 mg dosis inicial) o Nifedipino de acción rápida VO (10 mg)."
    },
    {
        "chunk_id": "diabetes_chunk_005",
        "guia_fuente": "diabetes_t2",
        "pagina": 31,
        "seccion": "Tratamiento Farmacológico Inicial en Diabetes Mellitus Tipo 2",
        "ano_publicacion": 2017,
        "texto": "En pacientes con Diabetes Mellitus Tipo 2 con HbA1c entre 7.5% y 9.0% al diagnóstico o tras falla de estilo de vida, se recomienda iniciar terapia farmacológica con Metformina (dosis inicial 500-850 mg/día escalando hasta 2000 mg/día). Si HbA1c > 8.5%, considerar inicio temprano de terapia combinada dual (Metformina + iSGLT2 o aGLP-1 si hay riesgo cardiovascular/renal elevado, o Metformina + Sulfonilurea según disponibilidad)."
    },
    {
        "chunk_id": "hemorragia_chunk_001",
        "guia_fuente": "hemorragia_posparto",
        "pagina": 12,
        "seccion": "Manejo Activo del Código Rojo por Atonía Uterina",
        "ano_publicacion": 2018,
        "texto": "La atonía uterina (Tono de la regla de las 4T) es la causa de hasta el 80% de las hemorragias posparto inmediatas. Manejo inmediato: 1. Masaje uterino bimanual externo e interno continuo. 2. Administración de Uterotónicos de primera línea: Oxitocina 10 UI IM o 5 UI IV en bolo lento, seguido de infusión IV (20 UI en 500 ml de solución cristalode a 125 ml/hora). De segunda línea: Ergometrina 0.2 mg IM (contraindicada en hipertensión/preeclampsia) y/o Misoprostol 800 mcg vía sublingual o rectal. Administración temprana de Ácido Tranexámico 1 g IV en los primeros 10 minutos."
    },
    {
        "chunk_id": "neumonia_chunk_001",
        "guia_fuente": "neumonia",
        "pagina": 15,
        "seccion": "Diagnóstico, Severidad (CURB-65) y Tratamiento de Neumonía Adquirida en la Comunidad",
        "ano_publicacion": 2017,
        "texto": "Neumonía Adquirida en la Comunidad (NAC): Criterios diagnósticos clínicos (fiebre, tos expectorante, estertores crepitantes, soplo tubárico) y consolidación radiológica en imagen de tórax. Escala de severidad CURB-65: C (Confusión), U (Urea > 19 mg/dL), R (FR >= 30 rpm), B (PA sistólica < 90 o diastólica <= 60 mmHg), 65 (Edad >= 65 años). Puntuación 0-1: Manejo ambulatorio (Amoxicilina 1g VO c/8h o Azitromicina 500mg VO c/24h). Puntuación >= 2: Criterio de hospitalización. Tratamiento hospitalario empírico: Ampicilina/Sulbactam 1.5g-3g IV c/6h o Ceftriaxona 1g-2g IV c/24h + Claritromicina 500mg VO/IV c/12h."
    },
    {
        "chunk_id": "ehirn_chunk_001",
        "guia_fuente": "gpc_ehirn2019",
        "pagina": 10,
        "seccion": "Diagnóstico, Clasificación y Tratamiento de la Enfermedad Hemorrágica del Recién Nacido (EHIRN)",
        "ano_publicacion": 2019,
        "texto": "Enfermedad Hemorrágica del Recién Nacido (EHIRN) por deficiencia de Vitamina K. Clasificación por edad: Temprana (0-24 horas, secundaria a fármacos maternos), Clásica (1-7 días, sangrado umbilical, gastrointestinal o cutáneo en RNT sin profilaxis), Tardía (2-12 semanas hasta 6 meses, frecuentemente asociada a lactancia materna exclusiva sin profilaxis, alta incidencia de sangrado intracraneal). Tratamiento de urgencia: Fitomenadiona (Vitamina K1) 1 mg a 2 mg IV lento o SC (evitar IM si hay coagulopatía grave). En sangrado mayor o riesgo vital: administrar Concentrado de Complejo Protrombínico (CCP) 25-50 UI/kg IV o Plasma Fresco Congelado (PFC) 10-15 mL/kg IV."
    }
]

def clean_name_display(name: str) -> str:
    """Normaliza cadenas para visualización segura en cualquier terminal."""
    return unicodedata.normalize("NFKC", str(name)).encode("ascii", "replace").decode("ascii")

def run_ingestion_pipeline():
    raw_dir = Path(RAW_PDFS_PATH)
    raw_dir.mkdir(parents=True, exist_ok=True)
    pdf_files = sorted(list(raw_dir.rglob("*.pdf")))

    all_chunks = list(SEED_CHUNKS)
    if pdf_files:
        print(f"[INGESTION] Encontrados {len(pdf_files)} PDFs en subcarpetas de {raw_dir}. Procesando con escaneo estructurado...", flush=True)
        total_pdf_chunks = 0
        for idx, pdf_file in enumerate(pdf_files, start=1):
            # Identificador único incluyendo el año para evitar colisiones
            guia_id = f"{pdf_file.parent.name}_{pdf_file.stem}".lower().replace("-", "_").replace(" ", "_")
            pages = extract_advanced_text_by_page(pdf_file)
            chunks = chunk_by_section(pages, guia_id=guia_id, max_chunk_size=800, overlap_size=150)
            all_chunks.extend(chunks)
            total_pdf_chunks += len(chunks)
            ano_detectado = pages[0].get("ano_publicacion") if pages else 2019
            
            clean_fname = clean_name_display(pdf_file.name)
            clean_parent = clean_name_display(pdf_file.parent.name)
            print(f"  [{idx:02d}/{len(pdf_files)}] [{clean_parent}] '{clean_fname}' (Ano: {ano_detectado}): {len(pages)} pags -> {len(chunks)} chunks.", flush=True)
            
        print(f"\n[INGESTION] Total de chunks estructurados a indexar (PDFs + Sembrados): {len(all_chunks)}", flush=True)
    else:
        print("[INGESTION] No se encontraron PDFs en raw_pdfs/. Indexando chunks sembrados de respaldo...", flush=True)
        all_chunks = SEED_CHUNKS

    collection = build_vector_db(all_chunks)
    print(f"\n[OK] Ingesta completada exitosamente. Coleccion ChromaDB 'gpc_msp' activa con {collection.count()} fragmentos vectorizados.")

if __name__ == "__main__":
    run_ingestion_pipeline()
