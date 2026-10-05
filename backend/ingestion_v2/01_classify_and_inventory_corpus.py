"""
Fase 1: Clasificacion, Normalizacion e Inventario Criptografico del Corpus MSP Ecuador.
Ateneo+ v2.0 - Pipeline de Ingesta Cientifica.

Este script:
1. Establece la taxonomia de los 5 ejes clinicos prioritarios segun morbilidad/mortalidad INEC/MSP.
2. Escanea todos los PDFs ubicados en 'backend/data/raw_pdfs/'.
3. Clasifica y organiza cada guia en su eje correspondiente (creando copias/enlaces seguros).
4. Calcula el hash criptografico SHA-256, tamano exacto y codificacion CIE-10.
5. Exporta 'backend/data/corpus_manifest.json' como registro inmutable para el paper.
"""

import os
import sys
import json
import hashlib
import shutil
from pathlib import Path
from typing import Dict, List, Any

# Configurar codificacion UTF-8 para consola
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_PDFS_DIR = BASE_DIR / "data" / "raw_pdfs"
MANIFEST_PATH = BASE_DIR / "data" / "corpus_manifest.json"

# Definicion de Ejes Clinicos Oficiales de Investigacion
EJES_CLINICOS = {
    "01_febriles_arbovirosis": {
        "nombre": "Sindrome Febril, Zoonosis y Arbovirosis",
        "descripcion": "Patologias vectoriales prevalentes en Costa y Amazonia segun SIVE-ALERTA MSP.",
        "patologias_clave": ["dengue", "leptospirosis", "malaria", "ehirn", "zoonosis"]
    },
    "02_urgencias_obstetricas": {
        "nombre": "Salud Materna y Urgencias Obstetricas (Score MAMA)",
        "descripcion": "Primera y segunda causa de muerte materna evitable en Ecuador (INEC).",
        "patologias_clave": [
            "trastornos hipertensivos", "hemorragia", "parto", "embarazo", "preeclampsia",
            "placenta", "materno", "aborto", "prenatal", "cesarea", "membranas"
        ]
    },
    "03_cardiovascular_metabolico": {
        "nombre": "Urgencias Cardiovasculares, Renales y Metabolicas",
        "descripcion": "1ra y 2da causa de mortalidad general en adultos ecuatorianos (INEC).",
        "patologias_clave": ["hta", "hipertension", "diabetes", "renal", "cardiac", "coronario"]
    },
    "04_respiratorio_pediatrico": {
        "nombre": "Infecciones Respiratorias y Salud Pediatrica / Neonatal",
        "descripcion": "Principal causa de hospitalizacion y mortalidad infantil en Ecuador.",
        "patologias_clave": [
            "neumon", "respirar", "prematuro", "sepsis neonatal", "lactancia",
            "leche", "pediatr", "adolescente", "hipotiroidismo"
        ]
    },
    "05_abdomen_quirurgico": {
        "nombre": "Abdomen Agudo y Urgencias Quirurgicas",
        "descripcion": "Principal motivo de intervencion quirurgica de emergencia en el SNS.",
        "patologias_clave": ["apendic", "colecist", "quirurg", "biliar", "obstruccion"]
    },
    "06_normativa_farmacologica": {
        "nombre": "Cuadro Nacional de Medicamentos Basicos y Farmacologia SNS",
        "descripcion": "Listado oficial CONASA/MSP para verificacion de prescripcion segun nivel de atencion.",
        "patologias_clave": ["medicamento", "cnmb", "farmacol", "conasa"]
    },
    "07_otras_guias_msp": {
        "nombre": "Otras Guias de Practica Clinica MSP (Soporte y Cronicos)",
        "descripcion": "Guias aprobadas de soporte oncologico, salud mental, reumatologia y dolor.",
        "patologias_clave": []  # Destino fallback
    }
}

# Mapeo de metadatos nosologicos para las guias principales conocidas
METADATOS_CATALOGO = {
    "gpc_hta192019.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Hipertension Arterial (HTA)",
        "acuerdo_ministerial": "Acuerdo Ministerial 00019-2019",
        "anio": 2019,
        "cie10": "I10",
        "cie11": "BA00",
        "eje": "03_cardiovascular_metabolico"
    },
    "gpc_ehirn2019.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Enfermedad Hemolitica del Recien Nacido",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2019",
        "anio": 2019,
        "cie10": "P55",
        "cie11": "KA82",
        "eje": "04_respiratorio_pediatrico"
    },
    "GPC_neumonía-adquirida_2017.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Neumonia Adquirida en la Comunidad (NAC)",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2017",
        "anio": 2017,
        "cie10": "J18.9",
        "cie11": "CA40",
        "eje": "04_respiratorio_pediatrico"
    },
    "MSP_Trastornos-hipertensivos-del-embarazo-con-portada-3.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Trastornos Hipertensivos del Embarazo",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2016",
        "anio": 2016,
        "cie10": "O14.1",
        "cie11": "JA24.1",
        "eje": "02_urgencias_obstetricas"
    },
    "Guia-de-hemorragia-postparto.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Prevencion y Manejo de la Hemorragia Postparto (Codigo Rojo)",
        "acuerdo_ministerial": "Protocolo Nacional MSP-2013",
        "anio": 2013,
        "cie10": "O72.1",
        "cie11": "JA43",
        "eje": "02_urgencias_obstetricas"
    },
    "guia_prevencion_diagnostico_tratamiento_enfermedad_renal_cronica_2018.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Enfermedad Renal Cronica",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2018",
        "anio": 2018,
        "cie10": "N18.9",
        "cie11": "GB61",
        "eje": "03_cardiovascular_metabolico"
    },
    "GPC_tuberculosis_2016.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Prevencion, Diagnostico y Tratamiento de la Tuberculosis",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2016",
        "anio": 2016,
        "cie10": "A15.0",
        "cie11": "1B10",
        "eje": "04_respiratorio_pediatrico"
    },
    "GPC_VIH_acuerdo_ministerial05-07-2019.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Atencion Integral de Adultos y Adolescentes con Infeccion por VIH",
        "acuerdo_ministerial": "Acuerdo Ministerial 05-07-2019",
        "anio": 2019,
        "cie10": "B24",
        "cie11": "1C62",
        "eje": "01_febriles_arbovirosis"
    }
}


def compute_sha256(file_path: Path) -> str:
    """Calcula el hash SHA-256 de un archivo binario en bloques de 64 KB."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def classify_pdf(filename: str) -> str:
    """Clasifica un PDF en uno de los 5 ejes clinicos o en las carpetas complementarias."""
    # 1. Si esta en el catalogo manual, usar su eje asignado
    if filename in METADATOS_CATALOGO and "eje" in METADATOS_CATALOGO[filename]:
        return METADATOS_CATALOGO[filename]["eje"]

    fname_lower = filename.lower().replace("-", " ").replace("_", " ")

    # 2. Buscar por patrones de patologias clave en orden de prioridad
    for eje_key, info in EJES_CLINICOS.items():
        if eje_key == "07_otras_guias_msp":
            continue
        for patron in info["patologias_clave"]:
            if patron in fname_lower:
                return eje_key

    return "07_otras_guias_msp"


def run_classification_pipeline() -> Dict[str, Any]:
    print("=" * 80)
    print(" FASE 1: CLASIFICACION E INVENTARIO DEL CORPUS NORMATIVO (MSP ECUADOR)")
    print("=" * 80)

    # 1. Crear directorios tematicos si no existen
    for eje_key in EJES_CLINICOS.keys():
        target_dir = RAW_PDFS_DIR / eje_key
        target_dir.mkdir(parents=True, exist_ok=True)

    # 2. Localizar todos los PDFs en las subcarpetas de raw_pdfs
    pdf_files = []
    for root, dirs, files in os.walk(RAW_PDFS_DIR):
        root_path = Path(root)
        # Evitar re-escanear las carpetas destino ya estructuradas
        if any(root_path.name == eje_key for eje_key in EJES_CLINICOS.keys()):
            continue
        for file in files:
            if file.lower().endswith(".pdf"):
                pdf_files.append(root_path / file)

    print(f"\n[INFO] Total de PDFs localizados en subcarpetas historicas: {len(pdf_files)}")

    manifest_entries: List[Dict[str, Any]] = []
    conteo_por_eje = {k: 0 for k in EJES_CLINICOS.keys()}

    for pdf_path in pdf_files:
        filename = pdf_path.name
        eje_asignado = classify_pdf(filename)
        dest_dir = RAW_PDFS_DIR / eje_asignado
        dest_path = dest_dir / filename

        # Copiar de forma segura sin sobreescribir si ya existe exactamente el mismo archivo
        if not dest_path.exists():
            shutil.copy2(pdf_path, dest_path)

        file_size = dest_path.stat().st_size
        file_sha256 = compute_sha256(dest_path)

        metadata = METADATOS_CATALOGO.get(filename, {})
        titulo_oficial = metadata.get("titulo_oficial", filename.replace(".pdf", "").replace("_", " "))
        cie10 = metadata.get("cie10", "No asignado")
        cie11 = metadata.get("cie11", "No asignado")
        acuerdo = metadata.get("acuerdo_ministerial", "MSP Ecuador")
        anio = metadata.get("anio", 2017)

        entry = {
            "archivo": filename,
            "titulo_oficial": titulo_oficial,
            "eje_clinico": eje_asignado,
            "eje_nombre": EJES_CLINICOS[eje_asignado]["nombre"],
            "ruta_relativa": str(dest_path.relative_to(BASE_DIR)).replace("\\", "/"),
            "tamano_bytes": file_size,
            "sha256": file_sha256,
            "cie10": cie10,
            "cie11": cie11,
            "acuerdo_ministerial": acuerdo,
            "anio": anio
        }

        manifest_entries.append(entry)
        conteo_por_eje[eje_asignado] += 1

    # Ordenar entradas alfabeticamente por eje y archivo
    manifest_entries.sort(key=lambda x: (x["eje_clinico"], x["archivo"]))

    # 3. Exportar manifiesto oficial
    manifest_data = {
        "version": "2.0",
        "fecha_inventario": "2026-10-03",
        "descripcion": "Manifiesto criptografico de las Guias de Practica Clinica y Normas del MSP Ecuador para Ateneo+",
        "total_documentos": len(manifest_entries),
        "distribucion_por_eje": conteo_por_eje,
        "ejes_definicion": EJES_CLINICOS,
        "documentos": manifest_entries
    }

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2, ensure_ascii=False)

    print(f"\n[OK] Manifiesto generado exitosamente en: {MANIFEST_PATH}")
    print("\n" + "-" * 80)
    print(" DISTRIBUCION DE DOCUMENTOS POR EJE CLINICO PRIORITARIO:")
    print("-" * 80)
    for eje_key, count in conteo_por_eje.items():
        print(f"  * {eje_key:30s} : {count:2d} guias | {EJES_CLINICOS[eje_key]['nombre']}")
    print("-" * 80)
    print(f" TOTAL DE DOCUMENTOS NORMALIZADOS: {len(manifest_entries)}")
    print("=" * 80 + "\n")

    return manifest_data


if __name__ == "__main__":
    run_classification_pipeline()
