const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE_DIR = path.resolve(__dirname, '..');
const RAW_PDFS_DIR = path.join(BASE_DIR, 'data', 'raw_pdfs');
const MANIFEST_PATH = path.join(BASE_DIR, 'data', 'corpus_manifest.json');

const EJES_CLINICOS = {
  "01_febriles_arbovirosis": {
    nombre: "Sindrome Febril, Zoonosis y Arbovirosis",
    descripcion: "Patologias vectoriales prevalentes en Costa y Amazonia segun SIVE-ALERTA MSP.",
    patologias_clave: ["dengue", "leptospirosis", "malaria", "ehirn", "zoonosis"]
  },
  "02_urgencias_obstetricas": {
    nombre: "Salud Materna y Urgencias Obstetricas (Score MAMA)",
    descripcion: "Primera y segunda causa de muerte materna evitable en Ecuador (INEC).",
    patologias_clave: [
      "trastornos hipertensivos", "hemorragia", "parto", "embarazo", "preeclampsia",
      "placenta", "materno", "aborto", "prenatal", "cesarea", "membranas"
    ]
  },
  "03_cardiovascular_metabolico": {
    nombre: "Urgencias Cardiovasculares, Renales y Metabolicas",
    descripcion: "1ra y 2da causa de mortalidad general en adultos ecuatorianos (INEC).",
    patologias_clave: ["hta", "hipertension", "diabetes", "renal", "cardiac", "coronario"]
  },
  "04_respiratorio_pediatrico": {
    nombre: "Infecciones Respiratorias y Salud Pediatrica / Neonatal",
    descripcion: "Principal causa de hospitalizacion y mortalidad infantil en Ecuador.",
    patologias_clave: [
      "neumon", "respirar", "prematuro", "sepsis neonatal", "lactancia",
      "leche", "pediatr", "adolescente", "hipotiroidismo"
    ]
  },
  "05_abdomen_quirurgico": {
    nombre: "Abdomen Agudo y Urgencias Quirurgicas",
    descripcion: "Principal motivo de intervencion quirurgica de emergencia en el SNS.",
    patologias_clave: ["apendic", "colecist", "quirurg", "biliar", "obstruccion"]
  },
  "06_normativa_farmacologica": {
    nombre: "Cuadro Nacional de Medicamentos Basicos y Farmacologia SNS",
    descripcion: "Listado oficial CONASA/MSP para verificacion de prescripcion segun nivel de atencion.",
    patologias_clave: ["medicamento", "cnmb", "farmacol", "conasa"]
  },
  "07_otras_guias_msp": {
    nombre: "Otras Guias de Practica Clinica MSP (Soporte y Cronicos)",
    descripcion: "Guias aprobadas de soporte oncologico, salud mental, reumatologia y dolor.",
    patologias_clave: []
  }
};

const METADATOS_CATALOGO = {
  "gpc_hta192019.pdf": {
    titulo_oficial: "Guia de Practica Clinica: Hipertension Arterial (HTA)",
    acuerdo_ministerial: "Acuerdo Ministerial 00019-2019",
    anio: 2019,
    cie10: "I10",
    cie11: "BA00",
    eje: "03_cardiovascular_metabolico"
  },
  "gpc_ehirn2019.pdf": {
    titulo_oficial: "Guia de Practica Clinica: Enfermedad Hemolitica del Recien Nacido",
    acuerdo_ministerial: "Acuerdo Ministerial MSP-2019",
    anio: 2019,
    cie10: "P55",
    cie11: "KA82",
    eje: "04_respiratorio_pediatrico"
  },
  "GPC_neumonía-adquirida_2017.pdf": {
    titulo_oficial: "Guia de Practica Clinica: Neumonia Adquirida en la Comunidad (NAC)",
    acuerdo_ministerial: "Acuerdo Ministerial MSP-2017",
    anio: 2017,
    cie10: "J18.9",
    cie11: "CA40",
    eje: "04_respiratorio_pediatrico"
  },
  "MSP_Trastornos-hipertensivos-del-embarazo-con-portada-3.pdf": {
    titulo_oficial: "Guia de Practica Clinica: Trastornos Hipertensivos del Embarazo",
    acuerdo_ministerial: "Acuerdo Ministerial MSP-2016",
    anio: 2016,
    cie10: "O14.1",
    cie11: "JA24.1",
    eje: "02_urgencias_obstetricas"
  },
  "Guia-de-hemorragia-postparto.pdf": {
    titulo_oficial: "Guia de Practica Clinica: Prevencion y Manejo de la Hemorragia Postparto (Codigo Rojo)",
    acuerdo_ministerial: "Protocolo Nacional MSP-2013",
    anio: 2013,
    cie10: "O72.1",
    cie11: "JA43",
    eje: "02_urgencias_obstetricas"
  },
  "guia_prevencion_diagnostico_tratamiento_enfermedad_renal_cronica_2018.pdf": {
    titulo_oficial: "Guia de Practica Clinica: Enfermedad Renal Cronica",
    acuerdo_ministerial: "Acuerdo Ministerial MSP-2018",
    anio: 2018,
    cie10: "N18.9",
    cie11: "GB61",
    eje: "03_cardiovascular_metabolico"
  },
  "GPC_tuberculosis_2016.pdf": {
    titulo_oficial: "Guia de Practica Clinica: Prevencion, Diagnostico y Tratamiento de la Tuberculosis",
    acuerdo_ministerial: "Acuerdo Ministerial MSP-2016",
    anio: 2016,
    cie10: "A15.0",
    cie11: "1B10",
    eje: "04_respiratorio_pediatrico"
  },
  "gpc_VIH_acuerdo_ministerial05-07-2019.pdf": {
    titulo_oficial: "Guia de Practica Clinica: Atencion Integral de Adultos y Adolescentes con Infeccion por VIH",
    acuerdo_ministerial: "Acuerdo Ministerial 05-07-2019",
    anio: 2019,
    cie10: "B24",
    cie11: "1C62",
    eje: "01_febriles_arbovirosis"
  }
};

function computeSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

function classifyPdf(filename) {
  if (METADATOS_CATALOGO[filename] && METADATOS_CATALOGO[filename].eje) {
    return METADATOS_CATALOGO[filename].eje;
  }
  const cleanName = filename.toLowerCase().replace(/[-_]/g, ' ');
  for (const [ejeKey, info] of Object.entries(EJES_CLINICOS)) {
    if (ejeKey === '07_otras_guias_msp') continue;
    for (const patron of info.patologias_clave) {
      if (cleanName.includes(patron)) {
        return ejeKey;
      }
    }
  }
  return '07_otras_guias_msp';
}

function scanPdfs(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (Object.keys(EJES_CLINICOS).includes(item.name)) {
        continue;
      }
      results = results.concat(scanPdfs(fullPath));
    } else if (item.isFile() && item.name.toLowerCase().endsWith('.pdf')) {
      results.push(fullPath);
    }
  }
  return results;
}

function run() {
  console.log('='.repeat(80));
  console.log(' FASE 1: CLASIFICACION E INVENTARIO DEL CORPUS NORMATIVO (MSP ECUADOR)');
  console.log('='.repeat(80));

  for (const ejeKey of Object.keys(EJES_CLINICOS)) {
    const targetDir = path.join(RAW_PDFS_DIR, ejeKey);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  }

  const pdfFiles = scanPdfs(RAW_PDFS_DIR);
  console.log(`\n[INFO] Total de PDFs localizados en subcarpetas historicas: ${pdfFiles.length}`);

  const manifestEntries = [];
  const conteoPorEje = {};
  for (const k of Object.keys(EJES_CLINICOS)) {
    conteoPorEje[k] = 0;
  }

  for (const pdfPath of pdfFiles) {
    const filename = path.basename(pdfPath);
    const ejeAsignado = classifyPdf(filename);
    const destDir = path.join(RAW_PDFS_DIR, ejeAsignado);
    const destPath = path.join(destDir, filename);

    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(pdfPath, destPath);
    }

    const stats = fs.statSync(destPath);
    const sha256 = computeSha256(destPath);

    const meta = METADATOS_CATALOGO[filename] || {};
    const tituloOficial = meta.titulo_oficial || filename.replace('.pdf', '').replace(/_/g, ' ');
    const cie10 = meta.cie10 || 'No asignado';
    const cie11 = meta.cie11 || 'No asignado';
    const acuerdo = meta.acuerdo_ministerial || 'MSP Ecuador';
    const anio = meta.anio || 2017;

    const relPath = path.relative(path.resolve(BASE_DIR, '..'), destPath).replace(/\\/g, '/');

    manifestEntries.push({
      archivo: filename,
      titulo_oficial: tituloOficial,
      eje_clinico: ejeAsignado,
      eje_nombre: EJES_CLINICOS[ejeAsignado].nombre,
      ruta_relativa: relPath,
      tamano_bytes: stats.size,
      sha256: sha256,
      cie10: cie10,
      cie11: cie11,
      acuerdo_ministerial: acuerdo,
      anio: anio
    });

    conteoPorEje[ejeAsignado]++;
  }

  manifestEntries.sort((a, b) => {
    if (a.eje_clinico !== b.eje_clinico) return a.eje_clinico.localeCompare(b.eje_clinico);
    return a.archivo.localeCompare(b.archivo);
  });

  const manifestData = {
    version: '2.0',
    fecha_inventario: '2026-10-03',
    descripcion: 'Manifiesto criptografico de las Guias de Practica Clinica y Normas del MSP Ecuador para Ateneo+',
    total_documentos: manifestEntries.length,
    distribucion_por_eje: conteoPorEje,
    ejes_definicion: EJES_CLINICOS,
    documentos: manifestEntries
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifestData, null, 2), 'utf-8');

  console.log(`\n[OK] Manifiesto generado exitosamente en: ${MANIFEST_PATH}`);
  console.log('\n' + '-'.repeat(80));
  console.log(' DISTRIBUCION DE DOCUMENTOS POR EJE CLINICO PRIORITARIO:');
  console.log('-'.repeat(80));
  for (const [ejeKey, count] of Object.entries(conteoPorEje)) {
    console.log(`  * ${ejeKey.padEnd(30)} : ${count.toString().padStart(2)} guias | ${EJES_CLINICOS[ejeKey].nombre}`);
  }
  console.log('-'.repeat(80));
  console.log(` TOTAL DE DOCUMENTOS NORMALIZADOS: ${manifestEntries.length}`);
  console.log('='.repeat(80) + '\n');
}

run();
