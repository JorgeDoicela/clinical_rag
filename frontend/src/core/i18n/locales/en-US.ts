import { AteneoTranslationResources } from '../../../types/i18n';

export const enUS: AteneoTranslationResources = {
  common: {
    sistema: 'Ateneo+ Clinical Simulator',
    bienvenido: 'Welcome to the clinical simulation environment',
    buscarPlaceholder: 'Search Ateneo: clinical cases, symptoms, diagnoses, or clinical guidelines...',
    modoLocal: 'Local Mode',
    enLinea: 'Online',
    pendientes: 'pending',
    iniciarSesion: 'Sign In',
    cerrarSesion: 'Sign Out',
    benchmark: 'Scientific Benchmark',
    docente: 'Faculty Dashboard',
    admin: 'Administration',
    sedeInstitucional: 'Institutional Campus',
    idioma: 'Language / Region',
    contrasteWcag: 'WCAG Contrast',
    guardar: 'Save',
    cancelar: 'Cancel',
    cargando: 'Loading clinical records...'
  },
  clinical: {
    casoClinico: 'Clinical Case',
    faseActual: 'Simulation Stage',
    motivoConsulta: 'Chief Complaint',
    enfermedadActual: 'History of Present Illness',
    examenFisico: 'Physical Examination',
    signosVitales: 'Vital Signs & Hemodynamic Parameters',
    paraclinicos: 'Paraclinical Tests & Biomarkers',
    diagnosticoDiferencial: 'Differential Diagnoses',
    conductaTerapeutica: 'Therapeutic Plan & Management',
    enviarRespuesta: 'Submit Clinical Reasoning',
    avanzarFase: 'Advance to Next Stage',
    resolucionFinal: 'Final Diagnostic Resolution',
    estudioDicom: 'DICOM Radiologic Viewer',
    estacionOsce: 'OSCE Clinical Station',
    teleDebriefing: 'Clinical Tele-Debriefing'
  },
  evaluation: {
    rubricaEvaluacion: 'Medical Evaluation Rubric',
    puntuacionClinica: 'Diagnostic Score',
    criterioAprobacion: 'Clinical Competency Benchmark',
    evidenciaGpc: 'Evidence-Based Clinical Practice Guidelines (WHO/CDC)',
    recomendacionRAG: 'AI Cognitive Feedback',
    debriefingSocratico: 'Socratic Clinical Debriefing',
    actaVerificadaSha: 'Digitally Verified Evaluation Record (SHA-256)'
  },
  nosology: {
    autoridadSalud: 'World Health Organization (WHO / PAHO)',
    guiaClinica: 'WHO Clinical Practice Guidelines',
    clasificacionNosologica: 'International Classification of Diseases 11th Revision (ICD-11)',
    codigoOficial: 'ICD-11 Official Code'
  }
};
