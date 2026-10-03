import { AteneoTranslationResources } from '../../../types/i18n';

export const esPE: AteneoTranslationResources = {
  common: {
    sistema: 'Ateneo+ Simulador Clínico',
    bienvenido: 'Bienvenido al entorno de simulación clínica',
    buscarPlaceholder: 'Buscar en Ateneo: casos clínicos, síntomas, diagnósticos o NTS MINSA...',
    modoLocal: 'Modo Local',
    enLinea: 'En línea',
    pendientes: 'pendientes',
    iniciarSesion: 'Iniciar Sesión',
    cerrarSesion: 'Cerrar Sesión',
    benchmark: 'Benchmark Científico',
    docente: 'Panel Docente',
    admin: 'Administración',
    sedeInstitucional: 'Sede Institucional',
    idioma: 'Idioma / Región',
    contrasteWcag: 'Contraste WCAG',
    guardar: 'Guardar',
    cancelar: 'Cancelar',
    cargando: 'Cargando datos clínicos...'
  },
  clinical: {
    casoClinico: 'Caso Clínico',
    faseActual: 'Fase de la Simulación',
    motivoConsulta: 'Motivo de Consulta',
    enfermedadActual: 'Relato de la Enfermedad Actual',
    examenFisico: 'Examen Clínico Regional',
    signosVitales: 'Funciones Vitales y Parámetros Hemodinámicos',
    paraclinicos: 'Exámenes Auxiliares y Laboratorio',
    diagnosticoDiferencial: 'Diagnósticos Diferenciales',
    conductaTerapeutica: 'Plan de Trabajo y Terapéutica',
    enviarRespuesta: 'Enviar Juicio Clínico',
    avanzarFase: 'Avanzar a la Siguiente Fase',
    resolucionFinal: 'Resolución Diagnóstica Final',
    estudioDicom: 'Visor de Imágenes Médicas DICOM',
    estacionOsce: 'Estación de Evaluación ECOE',
    teleDebriefing: 'Tele-Debriefing Clínico'
  },
  evaluation: {
    rubricaEvaluacion: 'Rúbrica de Evaluación de Competencias',
    puntuacionClinica: 'Calificación Clínica',
    criterioAprobacion: 'Estándar de Competencia Profesional',
    evidenciaGpc: 'Evidencia Basada en Normas Técnicas de Salud MINSA',
    recomendacionRAG: 'Retroalimentación Cognitiva por IA',
    debriefingSocratico: 'Interrogatorio Socrático Clínico',
    actaVerificadaSha: 'Acta de Evaluación Certificada (SHA-256)'
  },
  nosology: {
    autoridadSalud: 'Ministerio de Salud del Perú (MINSA)',
    guiaClinica: 'Norma Técnica de Salud (NTS MINSA)',
    clasificacionNosologica: 'Clasificación Internacional de Enfermedades (CIE-10 Perú)',
    codigoOficial: 'Código Nosológico MINSA'
  }
};
