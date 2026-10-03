/**
 * Contratos de Tipos para Internacionalización Tipada y Localización Nosológica (Ateneo+)
 * Soporta múltiples regiones andinas y nomenclaturas clínicas internacionales (CIE-10, CIE-11, GPC).
 */

export type SupportedLocale = 'es-EC' | 'es-PE' | 'en-US';

export type NosologyRegion = 'MSP_EC' | 'MINSA_PE' | 'OMS_GLOBAL';

export interface NosologyAuthority {
  codigo: NosologyRegion;
  nombreAutoridad: string;
  pais: string;
  sistemaClasificacion: 'CIE-10' | 'CIE-11' | 'SNOMED-CT';
  normativaBase: string;
  portalOficial: string;
}

export interface NosologyTerm {
  codigoDiagnostico: string;
  terminoLocal: string;
  terminoEstandar: string;
  guiaReferencia: string;
  nivelAtencionPrimario: 'Nivel I' | 'Nivel II' | 'Nivel III' | 'Ambulatorio';
  observacionClinica?: string;
}

export interface NosologyContextMap {
  region: NosologyRegion;
  locale: SupportedLocale;
  autoridad: NosologyAuthority;
  terminos: Record<string, NosologyTerm>;
}

// Estructura canónica de los diccionarios por namespace
export interface CommonTranslations {
  sistema: string;
  bienvenido: string;
  buscarPlaceholder: string;
  modoLocal: string;
  enLinea: string;
  pendientes: string;
  iniciarSesion: string;
  cerrarSesion: string;
  benchmark: string;
  docente: string;
  admin: string;
  sedeInstitucional: string;
  idioma: string;
  contrasteWcag: string;
  guardar: string;
  cancelar: string;
  cargando: string;
}

export interface ClinicalTranslations {
  casoClinico: string;
  faseActual: string;
  motivoConsulta: string;
  enfermedadActual: string;
  examenFisico: string;
  signosVitales: string;
  paraclinicos: string;
  diagnosticoDiferencial: string;
  conductaTerapeutica: string;
  enviarRespuesta: string;
  avanzarFase: string;
  resolucionFinal: string;
  estudioDicom: string;
  estacionOsce: string;
  teleDebriefing: string;
}

export interface EvaluationTranslations {
  rubricaEvaluacion: string;
  puntuacionClinica: string;
  criterioAprobacion: string;
  evidenciaGpc: string;
  recomendacionRAG: string;
  debriefingSocratico: string;
  actaVerificadaSha: string;
}

export interface NosologyTranslations {
  autoridadSalud: string;
  guiaClinica: string;
  clasificacionNosologica: string;
  codigoOficial: string;
}

export interface AteneoTranslationResources {
  common: CommonTranslations;
  clinical: ClinicalTranslations;
  evaluation: EvaluationTranslations;
  nosology: NosologyTranslations;
}
