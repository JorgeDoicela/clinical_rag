import { z } from 'zod';

/**
 * Esquemas de Validación en los Bordes con Zod (Ateneo+)
 * Blindaje en tiempo de ejecución sincronizado con los contratos Pydantic del backend.
 */

// ==========================================
// 1. Identidad y Autenticación
// ==========================================

export const UserRoleSchema = z.enum(['alumno', 'docente', 'administrador']);

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  nombre: z.string().optional().default('Usuario'),
  rol: UserRoleSchema,
  cohorte: z.string().optional(),
  creado_en: z.string().optional(),
});

export const LoginResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string().default('bearer'),
  user: UserSchema,
});

// ==========================================
// 2. Casos Clínicos y Simulación
// ==========================================

export const CasePhaseSchema = z.object({
  fase_numero: z.number().int(),
  titulo: z.string().optional(),
  titulo_fase: z.string().optional(),
  enunciado_fase: z.string().optional(),
  escenario_clinico: z.string().optional(),
  descripcion: z.string().optional(),
  datos_revelados: z.string().optional(),
  pregunta_fase: z.string().optional(),
  pregunta_orientadora: z.string().optional(),
  pregunta_evaluativa: z.string().optional(),
  tiempo_estimado: z.string().optional(),
  estudios_adjuntos: z.array(z.string()).optional(),
  ejes_evaluados: z.array(z.string()).optional(),
});

export const ParaclinicalStudySchema = z.object({
  tipo: z.enum(['ecg', 'rx', 'lab', 'otro']),
  url: z.string(),
  descripcion: z.string().optional(),
});

export const ClinicalCaseSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  enunciado: z.string().optional(),
  caso_preambulo: z.string().optional(),
  pregunta: z.string().default('Plantee su diagnóstico y manejo clínico.'),
  guia_asociada: z.string().optional(),
  gpc_referencia: z.string().optional(),
  especialidad: z.string().optional(),
  tiempo_estimado: z.string().optional(),
  dificultad: z.enum(['Básico', 'Intermedio', 'Avanzado']).optional(),
  signos_alarma: z.boolean().optional(),
  imagen_url: z.string().nullable().optional(),
  nivel_esperado: z.string().optional(),
  fragmento_gpc_ideal_id: z.string().optional(),
  modo_simulacion: z.enum(['single_turn', 'fases']).optional(),
  estudios_paraclinicos: z.array(ParaclinicalStudySchema).optional(),
  fases: z.array(CasePhaseSchema).nullable().optional(),
  competencias_activadas: z.array(z.string()).optional(),
});

export const ClinicalCasesListSchema = z.union([
  z.array(ClinicalCaseSchema),
  z.object({ cases: z.array(ClinicalCaseSchema) }).transform((obj) => obj.cases),
]);

// ==========================================
// 3. Evaluación Formativa y RAG MSP
// ==========================================

export const NormativeCitationSchema = z.object({
  guia: z.string(),
  seccion: z.string().optional(),
  pagina: z.number().int().optional(),
  chunk_id: z.string().optional(),
  texto_relevante: z.string().optional(),
});

export const DeficientCompetencySchema = z.object({
  eje: z.enum(['diagnóstico', 'tratamiento', 'prevención', 'seguimiento']),
  descripcion: z.string(),
  gravedad: z.enum(['leve', 'moderada', 'crítica']).optional(),
});

export const EvaluationResultSchema = z.object({
  score: z.number(),
  score_max: z.number().default(10),
  aciertos: z.array(z.string()).default([]),
  omisiones: z.array(z.string()).default([]),
  case_id: z.string().optional(),
  case_title: z.string().optional(),
  cita_normativa: NormativeCitationSchema.optional(),
  faithfulness_score: z.number().optional(),
  competencias_deficientes: z.array(DeficientCompetencySchema).default([]),
  retroalimentacion_general: z.string().default('Evaluación completada según norma oficial.'),
  hash_verificacion: z.string().optional(),
});

export const PhaseEvaluationResultSchema = z.object({
  fase_numero: z.number().int().optional(),
  score_fase: z.number(),
  aciertos: z.array(z.string()).default([]),
  omisiones: z.array(z.string()).default([]),
  cita_normativa: NormativeCitationSchema.optional(),
  retroalimentacion_fase: z.string().optional(),
  datos_fase_siguiente: z.string().optional(),
  desbloquea_siguiente: z.boolean().default(true),
  siguiente_fase_disponible: z.boolean().optional(),
  es_ultima_fase: z.boolean().optional(),
});

// ==========================================
// 4. Analítica Institucional e IBF
// ==========================================

export const IbfAxisSchema = z.object({
  key: z.string(),
  nombre: z.string(),
  ibf_porcentaje: z.number(),
  severidad: z.string(),
});

export const IbfCohortDataSchema = z.object({
  ibf_global: z.number(),
  ibf_global_porcentaje: z.number(),
  nivel_riesgo_global: z.string(),
  ejes_analiticos: z.array(IbfAxisSchema),
});

export const CoordinatorModuleRiskSchema = z.object({
  modulo: z.string(),
  porcentaje_falla: z.number(),
  riesgo: z.enum(['Bajo', 'Medio', 'Alto', 'Crítico']),
});

export const CoordinatorAnalyticsDataSchema = z.object({
  cohorte_nombre: z.string(),
  total_estudiantes_activos: z.number(),
  total_evaluaciones_registradas: z.number(),
  insight_principal: z.string(),
  porcentaje_falla_pediatria: z.number().optional(),
  modulos_analizados: z.array(CoordinatorModuleRiskSchema),
});

export const ScientificBenchmarkDataSchema = z.object({
  hake_gain: z.number(),
  p_valor: z.number(),
  tamano_efecto_d_cohen: z.number(),
  total_estudiantes_muestra: z.number(),
  mejora_promedio_puntos: z.number(),
  intervalo_confianza_95: z.tuple([z.number(), z.number()]),
});
