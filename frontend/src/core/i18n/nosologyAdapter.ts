/**
 * Adaptador de Taxonomía y Localización Nosológica Clínica (Ateneo+)
 * Homologa códigos nosológicos y normativas de salud entre MSP Ecuador, MINSA Perú y OMS Global.
 */

import { NosologyRegion, NosologyAuthority, NosologyTerm } from '../../types/i18n';

export const NOSOLOGY_AUTHORITIES: Record<NosologyRegion, NosologyAuthority> = {
  MSP_EC: {
    codigo: 'MSP_EC',
    nombreAutoridad: 'Ministerio de Salud Pública del Ecuador',
    pais: 'Ecuador',
    sistemaClasificacion: 'CIE-10',
    normativaBase: 'Guías de Práctica Clínica (GPC MSP)',
    portalOficial: 'https://www.salud.gob.ec'
  },
  MINSA_PE: {
    codigo: 'MINSA_PE',
    nombreAutoridad: 'Ministerio de Salud del Perú',
    pais: 'Perú',
    sistemaClasificacion: 'CIE-10',
    normativaBase: 'Normas Técnicas de Salud (NTS MINSA)',
    portalOficial: 'https://www.gob.pe/minsa'
  },
  OMS_GLOBAL: {
    codigo: 'OMS_GLOBAL',
    nombreAutoridad: 'Organización Mundial de la Salud / OPS',
    pais: 'Internacional',
    sistemaClasificacion: 'CIE-11',
    normativaBase: 'WHO Guidelines & Clinical Standards',
    portalOficial: 'https://www.who.int'
  }
};

/**
 * Catálogo Nosológico Homologado por Patologías Prevalentes
 */
export const NOSOLOGY_CATALOG: Record<string, Record<NosologyRegion, NosologyTerm>> = {
  apendicitis_aguda: {
    MSP_EC: {
      codigoDiagnostico: 'CIE-10: K35.8',
      terminoLocal: 'Apendicitis Aguda No Especificada',
      terminoEstandar: 'Acute Appendicitis',
      guiaReferencia: 'GPC MSP: Diagnóstico y Tratamiento de Apendicitis Aguda en el Adulto (2020)',
      nivelAtencionPrimario: 'Nivel II',
      observacionClinica: 'Manejo quirúrgico urgente mediante apendicectomía laparoscópica o abierta.'
    },
    MINSA_PE: {
      codigoDiagnostico: 'CIE-10: K35.8',
      terminoLocal: 'Apendicitis Aguda no Especificada',
      terminoEstandar: 'Acute Appendicitis',
      guiaReferencia: 'Guía de Práctica Clínica para Abdomen Agudo Quirúrgico - MINSA',
      nivelAtencionPrimario: 'Nivel II',
      observacionClinica: 'Intervención de emergencia con cobertura antibiótica profiláctica.'
    },
    OMS_GLOBAL: {
      codigoDiagnostico: 'CIE-11: DB10.Z',
      terminoLocal: 'Acute Appendicitis, Unspecified',
      terminoEstandar: 'Acute Appendicitis',
      guiaReferencia: 'WHO Emergency Surgical Care in District Hospitals',
      nivelAtencionPrimario: 'Nivel II',
      observacionClinica: 'Standard prompt surgical intervention to prevent peritonitis and sepsis.'
    }
  },
  neumonia_comunitaria: {
    MSP_EC: {
      codigoDiagnostico: 'CIE-10: J18.9',
      terminoLocal: 'Neumonía Adquirida en la Comunidad (NAC)',
      terminoEstandar: 'Community-Acquired Pneumonia',
      guiaReferencia: 'GPC MSP: Neumonía Adquirida en la Comunidad en Adultos (2019)',
      nivelAtencionPrimario: 'Nivel I',
      observacionClinica: 'Estratificación con escala CRB-65 / CURB-65 para decidir ingreso hospitalario.'
    },
    MINSA_PE: {
      codigoDiagnostico: 'CIE-10: J18.9',
      terminoLocal: 'Neumonía Adquirida en la Comunidad',
      terminoEstandar: 'Community-Acquired Pneumonia',
      guiaReferencia: 'NTS N° 071-MINSA/DGSP: Prevención y Control de Infecciones Respiratorias Agudas',
      nivelAtencionPrimario: 'Nivel I',
      observacionClinica: 'Uso de criterios de gravedad clínica y oxigenoterapia suplementaria.'
    },
    OMS_GLOBAL: {
      codigoDiagnostico: 'CIE-11: CA40.0',
      terminoLocal: 'Bacterial Pneumonia, Unspecified',
      terminoEstandar: 'Community-Acquired Pneumonia',
      guiaReferencia: 'WHO Model Formulary / Antimicrobial Resistance Stewardship',
      nivelAtencionPrimario: 'Nivel I',
      observacionClinica: 'Empiric antibiotic therapy following local antibiograms.'
    }
  },
  cetoacidosis_diabetica: {
    MSP_EC: {
      codigoDiagnostico: 'CIE-10: E10.1',
      terminoLocal: 'Cetoacidosis Diabética (CAD)',
      terminoEstandar: 'Diabetic Ketoacidosis',
      guiaReferencia: 'GPC MSP: Manejo de Complicaciones Agudas de la Diabetes Mellitus',
      nivelAtencionPrimario: 'Nivel III',
      observacionClinica: 'Reanimación volumétrica agresiva con NaCl 0.9%, infusión continua de insulina rápida y monitoreo de potasio.'
    },
    MINSA_PE: {
      codigoDiagnostico: 'CIE-10: E10.1',
      terminoLocal: 'Cetoacidosis Diabética',
      terminoEstandar: 'Diabetic Ketoacidosis',
      guiaReferencia: 'Guía Técnica MINSA: Atención de Emergencias Hiperglicémicas',
      nivelAtencionPrimario: 'Nivel III',
      observacionClinica: 'Monitoreo gasométrico continuo, anión gap y reemplazo hidroelectrolítico.'
    },
    OMS_GLOBAL: {
      codigoDiagnostico: 'CIE-11: 5A10.0',
      terminoLocal: 'Type 1 Diabetes Mellitus with Ketoacidosis',
      terminoEstandar: 'Diabetic Ketoacidosis',
      guiaReferencia: 'WHO Guidelines on Second- and Third-Line Hyperglycemia Management',
      nivelAtencionPrimario: 'Nivel III',
      observacionClinica: 'Critical intensive care management with strict metabolic and potassium protocol.'
    }
  },
  preeclampsia_severa: {
    MSP_EC: {
      codigoDiagnostico: 'CIE-10: O14.1',
      terminoLocal: 'Preeclampsia Severa con Criterios de Severidad',
      terminoEstandar: 'Severe Preeclampsia',
      guiaReferencia: 'GPC MSP: Trastornos Hipertensivos del Embarazo - Clave Azul',
      nivelAtencionPrimario: 'Nivel III',
      observacionClinica: 'Neuroprotección con sulfato de magnesio (Esquema Zuspan) e hipotensores (labetalol/hidralazina).'
    },
    MINSA_PE: {
      codigoDiagnostico: 'CIE-10: O14.1',
      terminoLocal: 'Preeclampsia Severa',
      terminoEstandar: 'Severe Preeclampsia',
      guiaReferencia: 'Guía de Práctica Clínica para la Atención de las Emergencias Obstétricas - MINSA',
      nivelAtencionPrimario: 'Nivel III',
      observacionClinica: 'Activación inmediata de Clave Azul obstétrica y estabilización hemodinámica.'
    },
    OMS_GLOBAL: {
      codigoDiagnostico: 'CIE-11: JA20.1',
      terminoLocal: 'Pre-eclampsia with Severe Features',
      terminoEstandar: 'Severe Preeclampsia',
      guiaReferencia: 'WHO Recommendations for Prevention and Treatment of Pre-eclampsia and Eclampsia',
      nivelAtencionPrimario: 'Nivel III',
      observacionClinica: 'Magnesium sulfate regimen for seizure prevention and blood pressure stabilization.'
    }
  }
};

/**
 * Obtiene la autoridad sanitaria según la región
 */
export function getNosologyAuthority(region: NosologyRegion): NosologyAuthority {
  return NOSOLOGY_AUTHORITIES[region] || NOSOLOGY_AUTHORITIES.MSP_EC;
}

/**
 * Resuelve el término nosológico, código oficial y guía clínica según la patología y la región
 */
export function resolveNosologyTerm(pathologyKey: string, region: NosologyRegion): NosologyTerm {
  const pathology = NOSOLOGY_CATALOG[pathologyKey];
  if (!pathology) {
    const authority = getNosologyAuthority(region);
    return {
      codigoDiagnostico: `${authority.sistemaClasificacion}: R69`,
      terminoLocal: 'Patología Médica No Especificada',
      terminoEstandar: 'Unspecified Medical Condition',
      guiaReferencia: authority.normativaBase,
      nivelAtencionPrimario: 'Nivel I'
    };
  }

  return pathology[region] || pathology.MSP_EC;
}

/**
 * Retorna la lista de autoridades sanitarias disponibles
 */
export function getAvailableAuthorities(): NosologyAuthority[] {
  return Object.values(NOSOLOGY_AUTHORITIES);
}
