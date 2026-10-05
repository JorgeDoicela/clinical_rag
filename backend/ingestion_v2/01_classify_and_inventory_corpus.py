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
import unicodedata
from pathlib import Path
from typing import Dict, List, Any

# Configurar codificacion UTF-8 para consola
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent
RAW_PDFS_DIR = BASE_DIR / "data" / "raw_pdfs"
MANIFEST_PATH = BASE_DIR / "data" / "corpus_manifest.json"

# Definicion de Ejes Clinicos Oficiales de Investigacion
# Definicion de los 4 Ejes Normativos Oficiales del MSP Ecuador (100% Corpus Ministerial)
EJES_CLINICOS = {
    "01_urgencias_obstetricas": {
        "nombre": "Salud Materna y Urgencias Obstetricas (Score MAMA)",
        "descripcion": "Primera y segunda causa de muerte materna evitable en Ecuador (INEC/MSP).",
        "patologias_clave": [
            "trastornos hipertensivos", "hemorragia", "parto", "embarazo", "preeclampsia",
            "placenta", "materno", "aborto", "prenatal", "cesarea", "membranas", "obstetr",
            "gestacional"
        ]
    },
    "02_respiratorio_pediatrico": {
        "nombre": "Infecciones Respiratorias y Salud Pediatrica / Neonatal",
        "descripcion": "Principal causa de hospitalizacion y mortalidad infantil en Ecuador.",
        "patologias_clave": [
            "neumon", "respirar", "prematuro", "sepsis neonatal", "lactancia",
            "leche", "pediatr", "adolescente", "hipotiroidismo", "tuberculosis"
        ]
    },
    "03_cardiovascular_metabolico": {
        "nombre": "Urgencias Cardiovasculares, Renales y Metabolicas",
        "descripcion": "1ra y 2da causa de mortalidad general en adultos ecuatorianos (INEC).",
        "patologias_clave": ["hta", "hipertension", "diabetes", "renal", "cardiac", "coronario"]
    },
    "04_soporte_cronicos_salud_mental": {
        "nombre": "Soporte Clinico, Oncologia, Salud Mental y Enfermedades Raras",
        "descripcion": "Guias aprobadas de soporte paliativo, onco-hematologia, salud mental, reumatologia y dolor.",
        "patologias_clave": []  # Destino base / complementario
    }
}

# Mapeo de metadatos nosologicos para las guias oficiales del MSP Ecuador
METADATOS_CATALOGO = {
    # --- EJE 01: URGENCIAS OBSTETRICAS ---
    "MSP_Trastornos-hipertensivos-del-embarazo-con-portada-3.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Trastornos Hipertensivos del Embarazo",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2016",
        "anio": 2016,
        "cie10": "O14.1",
        "cie11": "JA24.1",
        "eje": "01_urgencias_obstetricas"
    },
    "Guia-de-hemorragia-postparto.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Prevencion y Manejo de la Hemorragia Postparto (Codigo Rojo)",
        "acuerdo_ministerial": "Protocolo Nacional MSP-2013",
        "anio": 2013,
        "cie10": "O72.1",
        "cie11": "JA43",
        "eje": "01_urgencias_obstetricas"
    },
    "Guía-de-hemorragia-postparto.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Prevencion y Manejo de la Hemorragia Postparto (Codigo Rojo)",
        "acuerdo_ministerial": "Protocolo Nacional MSP-2013",
        "anio": 2013,
        "cie10": "O72.1",
        "cie11": "JA43",
        "eje": "01_urgencias_obstetricas"
    },
    "gpc_diabetes_gestacional_guia_embarazada_2017.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Diabetes Gestacional - Guia para la Embarazada",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2017",
        "anio": 2017,
        "cie10": "O24.4",
        "cie11": "JA21",
        "eje": "01_urgencias_obstetricas"
    },
    "GPC_Infeccion_vaginal_obstetrica_2014.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Diagnostico y Tratamiento de la Infeccion Vaginal en Obstetricia",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2014",
        "anio": 2014,
        "cie10": "O23.5",
        "cie11": "JA63.1",
        "eje": "01_urgencias_obstetricas"
    },
    "GPC_anomalias_de_insercion_placentaria_2017.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Diagnostico y Tratamiento de las Anomalias de Insercion Placentaria y Vasos Previos",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2017",
        "anio": 2017,
        "cie10": "O44",
        "cie11": "JA41",
        "eje": "01_urgencias_obstetricas"
    },
    "GPC_atencion_parto_por_cesarea_2015.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Atencion del Parto por Cesarea",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2015",
        "anio": 2015,
        "cie10": "O82",
        "cie11": "JB02",
        "eje": "01_urgencias_obstetricas"
    },
    "GPC_Atencion_del_trabajo_parto_posparto_y_parto_inmediato.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Atencion del Trabajo de Parto, Posparto y Parto Inmediato",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2015",
        "anio": 2015,
        "cie10": "O80",
        "cie11": "JB00",
        "eje": "01_urgencias_obstetricas"
    },
    "GPC_ruptura_prematura_de_membranas_2015.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Ruptura Prematura de Membranas Pretermino",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2015",
        "anio": 2015,
        "cie10": "O42",
        "cie11": "JA42",
        "eje": "01_urgencias_obstetricas"
    },
    "Diagnostico_y_tratamiento_de_la_anemia_en_el_embarazo.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Diagnostico y Tratamiento de la Anemia en el Embarazo",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2014",
        "anio": 2014,
        "cie10": "O99.0",
        "cie11": "JA65.0",
        "eje": "01_urgencias_obstetricas"
    },
    "Aborto-terapéutico.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Atencion del Aborto Terapeutico",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2015",
        "anio": 2015,
        "cie10": "O04",
        "cie11": "JA01",
        "eje": "01_urgencias_obstetricas"
    },
    "gpc_guia_aborto_espontaneo_incompleto_19_feb_2014.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Manejo del Aborto Espontaneo e Incompleto",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2014",
        "anio": 2014,
        "cie10": "O03",
        "cie11": "JA00",
        "eje": "01_urgencias_obstetricas"
    },
    "Guia Control Prenatal.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Control Prenatal",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2016",
        "anio": 2016,
        "cie10": "Z34",
        "cie11": "QA42",
        "eje": "01_urgencias_obstetricas"
    },
    "Guia de ciudadan trastornos hipertensivos del embarazo.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Trastornos Hipertensivos del Embarazo - Guia para el Ciudadano",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2016",
        "anio": 2016,
        "cie10": "O14",
        "cie11": "JA24",
        "eje": "01_urgencias_obstetricas"
    },
    "GPC_de_bolsillo_componente_materno_2015.pdf": {
        "titulo_oficial": "Manual de Emergencias Obstetricas y Score MAMA (GPC Bolsillo)",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2015",
        "anio": 2015,
        "cie10": "O90",
        "cie11": "JA60",
        "eje": "01_urgencias_obstetricas"
    },

    # --- EJE 02: RESPIRATORIO Y PEDIATRICO ---
    "GPC_neumonía-adquirida_2017.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Neumonia Adquirida en la Comunidad (NAC)",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2017",
        "anio": 2017,
        "cie10": "J18.9",
        "cie11": "CA40",
        "eje": "02_respiratorio_pediatrico"
    },
    "GPC_tuberculosis_2016.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Prevencion, Diagnostico y Tratamiento de la Tuberculosis",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2016",
        "anio": 2016,
        "cie10": "A15.0",
        "cie11": "1B10",
        "eje": "02_respiratorio_pediatrico"
    },
    "GP_Tuberculosis-1.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Prevencion, Diagnostico, Tratamiento y Control de la Tuberculosis (2da Edicion)",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2018",
        "anio": 2018,
        "cie10": "A15.0",
        "cie11": "1B10",
        "eje": "02_respiratorio_pediatrico"
    },
    "gpc_ehirn2019.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Enfermedad Hemolitica del Recien Nacido",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2019",
        "anio": 2019,
        "cie10": "P55",
        "cie11": "KA82",
        "eje": "02_respiratorio_pediatrico"
    },
    "GPC-RECIEN-NACIDO-CON-DIFICULTAD-PARA-RESPIRAR.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Recien Nacido con Dificultad para Respirar (SDR Neonatal)",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2016",
        "anio": 2016,
        "cie10": "P22.0",
        "cie11": "KB23",
        "eje": "02_respiratorio_pediatrico"
    },
    "GPC-Sepsis-neonatal.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Sepsis Bacteriana del Recien Nacido",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2015",
        "anio": 2015,
        "cie10": "P36",
        "cie11": "KA60",
        "eje": "02_respiratorio_pediatrico"
    },
    "GPC-Recén-nacido-prematuro.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Atencion del Recien Nacido Prematuro",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2015",
        "anio": 2015,
        "cie10": "P07.3",
        "cie11": "KA21",
        "eje": "02_respiratorio_pediatrico"
    },
    "Hipotiroidismo-congénito.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Tamizaje, Diagnostico y Manejo del Hipotiroidismo Congenito",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2015",
        "anio": 2015,
        "cie10": "E03.1",
        "cie11": "5A00.0",
        "eje": "02_respiratorio_pediatrico"
    },
    "Alergia-a-la-proteína-d-ela-leche-de-vaca.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Alergia a la Proteina de la Leche de Vaca en Pediatria",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2016",
        "anio": 2016,
        "cie10": "K52.2",
        "cie11": "DA52",
        "eje": "02_respiratorio_pediatrico"
    },
    "gpc_supervision_Salud_de_Adolescentes_2014.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Supervision de la Salud de Ninos y Adolescentes",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2014",
        "anio": 2014,
        "cie10": "Z00.3",
        "cie11": "QA00.2",
        "eje": "02_respiratorio_pediatrico"
    },
    "Alimentacion_y_nutricion_de_la_mujer_gestante_y_la_madre_en_periodo_de_lactancia.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Alimentacion y Nutricion de la Gestante y Lactancia Materna",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2014",
        "anio": 2014,
        "cie10": "Z39.1",
        "cie11": "QA43",
        "eje": "02_respiratorio_pediatrico"
    },

    # --- EJE 03: CARDIOVASCULAR Y METABOLICO ---
    "gpc_hta192019.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Hipertension Arterial (HTA)",
        "acuerdo_ministerial": "Acuerdo Ministerial 00019-2019",
        "anio": 2019,
        "cie10": "I10",
        "cie11": "BA00",
        "eje": "03_cardiovascular_metabolico"
    },
    "guia_prevencion_diagnostico_tratamiento_enfermedad_renal_cronica_2018.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Enfermedad Renal Cronica",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2018",
        "anio": 2018,
        "cie10": "N18.9",
        "cie11": "GB61",
        "eje": "03_cardiovascular_metabolico"
    },

    # --- EJE 04: SOPORTE, CRONICOS Y SALUD MENTAL ---
    "GPC_VIH_acuerdo_ministerial05-07-2019.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Atencion Integral de Adultos y Adolescentes con Infeccion por VIH",
        "acuerdo_ministerial": "Acuerdo Ministerial 05-07-2019",
        "anio": 2019,
        "cie10": "B24",
        "cie11": "1C62",
        "eje": "04_soporte_cronicos_salud_mental"
    },
    "gpc_VIH_acuerdo_ministerial05-07-2019.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Atencion Integral de Adultos y Adolescentes con Infeccion por VIH",
        "acuerdo_ministerial": "Acuerdo Ministerial 05-07-2019",
        "anio": 2019,
        "cie10": "B24",
        "cie11": "1C62",
        "eje": "04_soporte_cronicos_salud_mental"
    },
    "61069_MSP_Guía_DEPRESION_20180228_D.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Trastorno Depresivo Grave en el Adulto",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2018",
        "anio": 2018,
        "cie10": "F32",
        "cie11": "6A70",
        "eje": "04_soporte_cronicos_salud_mental"
    },
    "gpc_episodio_depresivo_adultos.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Episodio Depresivo en Adultos",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2017",
        "anio": 2017,
        "cie10": "F32.9",
        "cie11": "6A70",
        "eje": "04_soporte_cronicos_salud_mental"
    },
    "gpc_cuidados_paliativos_completa_2014.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Cuidados Paliativos",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2014",
        "anio": 2014,
        "cie10": "Z51.5",
        "cie11": "QB95",
        "eje": "04_soporte_cronicos_salud_mental"
    },
    "gpc_dolor_oncológico.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Manejo del Dolor Oncologico",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2017",
        "anio": 2017,
        "cie10": "R52",
        "cie11": "MG30",
        "eje": "04_soporte_cronicos_salud_mental"
    },
    "GPC_Artitis_Reumatoide.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Artritis Reumatoide",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2016",
        "anio": 2016,
        "cie10": "M05",
        "cie11": "FA20",
        "eje": "04_soporte_cronicos_salud_mental"
    },
    "linfoma_hodgkin.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Linfoma de Hodgkin",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2017",
        "anio": 2017,
        "cie10": "C81",
        "cie11": "2B30",
        "eje": "04_soporte_cronicos_salud_mental"
    },
    "Caries.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Prevencion, Diagnostico y Tratamiento de la Caries Dental",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2015",
        "anio": 2015,
        "cie10": "K02",
        "cie11": "DA08.0",
        "eje": "04_soporte_cronicos_salud_mental"
    },
    "DIAGNÓSTICO-Y-TRATAMIENTO-DEL-ACNÉ_16012017.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Diagnostico y Tratamiento del Acne",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2016",
        "anio": 2016,
        "cie10": "L70.0",
        "cie11": "ED80.0",
        "eje": "04_soporte_cronicos_salud_mental"
    },
    "GPC_trastornos_del_espectro_autista_2017-1.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Trastornos del Espectro Autista en Ninos y Adolescentes",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2017",
        "anio": 2017,
        "cie10": "F84.0",
        "cie11": "6A02",
        "eje": "04_soporte_cronicos_salud_mental"
    },
    "GUÍA-DOLOR-LUMBAR_16012017.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Diagnostico y Tratamiento del Dolor Lumbar",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2016",
        "anio": 2016,
        "cie10": "M54.5",
        "cie11": "ME84.2",
        "eje": "04_soporte_cronicos_salud_mental"
    },
    "Guia-de-gaucher.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Diagnostico y Tratamiento de la Enfermedad de Gaucher tipo 1",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2013",
        "anio": 2013,
        "cie10": "E75.2",
        "cie11": "5C56.1",
        "eje": "04_soporte_cronicos_salud_mental"
    },
    "Guía-de-fenilcetonuria.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Diagnostico y Tratamiento Nutricional de la Fenilcetonuria",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2013",
        "anio": 2013,
        "cie10": "E70.0",
        "cie11": "5C50.0",
        "eje": "04_soporte_cronicos_salud_mental"
    },
    "Guía-fibrosis-quística.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Fibrosis Quistica y Manual de Procedimientos",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2013",
        "anio": 2013,
        "cie10": "E84",
        "cie11": "CA25",
        "eje": "04_soporte_cronicos_salud_mental"
    },
    "MSP_Guía_hemofilia-congénita_230117_D-3-1.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Diagnostico y Tratamiento de la Hemofilia Congenita",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2016",
        "anio": 2016,
        "cie10": "D66",
        "cie11": "3B10",
        "eje": "04_soporte_cronicos_salud_mental"
    },
    "TRAUMA-DENTAL.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Prevencion, Diagnostico y Tratamiento del Trauma Dental",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2016",
        "anio": 2016,
        "cie10": "S02.5",
        "cie11": "NA02.5",
        "eje": "04_soporte_cronicos_salud_mental"
    },
    "Tratamiento-odontologico.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Tratamiento Odontologico en Embarazadas",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2016",
        "anio": 2016,
        "cie10": "O99",
        "cie11": "JA65",
        "eje": "04_soporte_cronicos_salud_mental"
    },
    "gpc_de_cuidados_paliativos_para_el_ciudadano_2014.pdf": {
        "titulo_oficial": "Guia de Practica Clinica: Cuidados Paliativos - Guia para el Ciudadano",
        "acuerdo_ministerial": "Acuerdo Ministerial MSP-2014",
        "anio": 2014,
        "cie10": "Z51.5",
        "cie11": "QB95",
        "eje": "04_soporte_cronicos_salud_mental"
    }
}


def get_catalogo_entry(filename: str) -> Dict[str, Any]:
    """Busca los metadatos de un archivo en METADATOS_CATALOGO normalizando Unicode (NFC)."""
    norm_fn = unicodedata.normalize("NFC", filename)
    for k, v in METADATOS_CATALOGO.items():
        if unicodedata.normalize("NFC", k) == norm_fn:
            return v
    return {}


def compute_sha256(file_path: Path) -> str:
    """Calcula el hash SHA-256 de un archivo binario en bloques de 64 KB."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def classify_pdf(filename: str) -> str:
    """Clasifica un PDF en uno de los 4 ejes clinicos oficiales del MSP."""
    # 1. Si esta en el catalogo manual, usar su eje asignado
    entry = get_catalogo_entry(filename)
    if "eje" in entry:
        return entry["eje"]

    fname_lower = filename.lower().replace("-", " ").replace("_", " ")

    # 2. Buscar por patrones de patologias clave en orden de prioridad
    for eje_key, info in EJES_CLINICOS.items():
        if eje_key == "04_soporte_cronicos_salud_mental":
            continue
        for patron in info["patologias_clave"]:
            if patron in fname_lower:
                return eje_key

    return "04_soporte_cronicos_salud_mental"


def run_classification_pipeline() -> Dict[str, Any]:
    print("=" * 80)
    print(" FASE 1: CLASIFICACION E INVENTARIO DEL CORPUS NORMATIVO (MSP ECUADOR)")
    print("=" * 80)

    # 1. Crear directorios tematicos canonicos si no existen
    for eje_key in EJES_CLINICOS.keys():
        target_dir = RAW_PDFS_DIR / eje_key
        target_dir.mkdir(parents=True, exist_ok=True)

    # 2. Migrar archivos sueltos o en carpetas historicas externas si existen
    for root, dirs, files in os.walk(RAW_PDFS_DIR):
        root_path = Path(root)
        # Omitir carpetas canonicas en esta fase previa de migracion
        if any(root_path.name == eje_key for eje_key in EJES_CLINICOS.keys()):
            continue
        for file in files:
            if file.lower().endswith(".pdf"):
                src_file = root_path / file
                eje_destino = classify_pdf(file)
                dest_file = RAW_PDFS_DIR / eje_destino / file
                if not dest_file.exists():
                    shutil.copy2(src_file, dest_file)
                    print(f"  [MIGRADO] {file} -> {eje_destino}")

    # 3. Inventario canónico directo sobre los 4 ejes oficiales
    manifest_entries: List[Dict[str, Any]] = []
    conteo_por_eje = {k: 0 for k in EJES_CLINICOS.keys()}
    archivos_procesados = set()

    for eje_key in sorted(EJES_CLINICOS.keys()):
        eje_dir = RAW_PDFS_DIR / eje_key
        if not eje_dir.exists():
            continue

        for pdf_path in sorted(eje_dir.glob("*.pdf")):
            filename = pdf_path.name
            if filename in archivos_procesados:
                continue

            # Verificar si el archivo pertenece a este eje
            eje_correcto = classify_pdf(filename)
            if eje_correcto != eje_key:
                dest_dir = RAW_PDFS_DIR / eje_correcto
                dest_path = dest_dir / filename
                shutil.move(str(pdf_path), str(dest_path))
                pdf_path = dest_path
                eje_key_actual = eje_correcto
            else:
                eje_key_actual = eje_key

            archivos_procesados.add(filename)
            file_size = pdf_path.stat().st_size
            file_sha256 = compute_sha256(pdf_path)

            metadata = get_catalogo_entry(filename)
            titulo_oficial = metadata.get("titulo_oficial", filename.replace(".pdf", "").replace("_", " "))
            cie10 = metadata.get("cie10", "No asignado")
            cie11 = metadata.get("cie11", "No asignado")
            acuerdo = metadata.get("acuerdo_ministerial", "MSP Ecuador")
            anio = metadata.get("anio", 2017)

            entry = {
                "archivo": filename,
                "titulo_oficial": titulo_oficial,
                "eje_clinico": eje_key_actual,
                "eje_nombre": EJES_CLINICOS[eje_key_actual]["nombre"],
                "ruta_relativa": str(pdf_path.relative_to(REPO_ROOT)).replace("\\", "/"),
                "tamano_bytes": file_size,
                "sha256": file_sha256,
                "cie10": cie10,
                "cie11": cie11,
                "acuerdo_ministerial": acuerdo,
                "anio": anio
            }

            manifest_entries.append(entry)
            conteo_por_eje[eje_key_actual] += 1

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
