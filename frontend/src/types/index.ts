/**
 * Definiciones de Tipos de Dominio Clínico y Arquitectura del Sistema Ateneo+
 * Contratos estrictos sincronizados con los esquemas Pydantic del Backend.
 */

// ==========================================
// 1. Identidad, Autenticación y RBAC
// ==========================================

export type UserRole = 'alumno' | 'docente' | 'administrador';

export interface User {
  id: string;
  email: string;
  nombre: string;
  rol: UserRole;
  cohorte?: string;
  creado_en?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

// ==========================================
// 2. Casos Clínicos y Fases de Simulación
// ==========================================

export type ParaclinicalStudyType = 'ecg' | 'rx' | 'lab' | 'otro';

export interface ParaclinicalStudy {
  tipo: ParaclinicalStudyType;
  url: string;
  descripcion?: string;
}

export interface CasePhase {
  fase_numero: number;
  titulo?: string;
  titulo_fase?: string;
  enunciado_fase?: string;
  escenario_clinico?: string;
  descripcion?: string;
  datos_revelados?: string;
  pregunta_fase?: string;
  pregunta_orientadora?: string;
  pregunta_evaluativa?: string;
  tiempo_estimado?: string;
  estudios_adjuntos?: string[];
  ejes_evaluados?: string[];
}

export type CaseDifficulty = 'Básico' | 'Intermedio' | 'Avanzado';

export interface ClinicalCase {
  id: string;
  titulo: string;
  enunciado?: string;
  caso_preambulo?: string;
  pregunta: string;
  guia_asociada?: string;
  gpc_referencia?: string;
  especialidad?: string;
  tiempo_estimado?: string;
  dificultad?: CaseDifficulty;
  signos_alarma?: boolean;
  imagen_url?: string;
  nivel_esperado?: string;
  fragmento_gpc_ideal_id?: string;
  modo_simulacion?: 'single_turn' | 'fases';
  estudios_paraclinicos?: ParaclinicalStudy[];
  fases?: CasePhase[];
  competencias_activadas?: string[];
}

// ==========================================
// 3. Evaluación Formativa, RAG y Citas MSP
// ==========================================

export interface NormativeCitation {
  guia: string;
  seccion?: string;
  pagina?: number;
  chunk_id?: string;
  texto_relevante?: string;
}

export type ClinicalAxis = 'diagnóstico' | 'tratamiento' | 'prevención' | 'seguimiento';

export interface DeficientCompetency {
  eje: ClinicalAxis;
  descripcion: string;
  gravedad?: 'leve' | 'moderada' | 'crítica';
}

export interface AxisCompetencyItem {
  key: string;
  label: string;
  score: number;
  items: Array<{ descripcion: string }>;
  estadoLabel: string;
}

export interface EvaluationResult {
  score: number;
  score_max: number;
  aciertos: string[];
  omisiones: string[];
  case_id?: string;
  case_title?: string;
  cita_normativa?: NormativeCitation;
  faithfulness_score?: number;
  competencias_deficientes?: DeficientCompetency[];
  competencias_por_eje?: AxisCompetencyItem[];
  retroalimentacion_general?: string;
  hash_verificacion?: string;
}

export interface PhaseEvaluationResult {
  fase_numero?: number;
  score_fase: number;
  aciertos: string[];
  omisiones: string[];
  cita_normativa?: NormativeCitation;
  retroalimentacion_fase?: string;
  datos_fase_siguiente?: string;
  desbloquea_siguiente?: boolean;
  siguiente_fase_disponible?: boolean;
  es_ultima_fase?: boolean;
}

// ==========================================
// 3.1 Debriefing Socrático Multiturno
// ==========================================

export interface SocraticDialogTurn {
  role: 'estudiante' | 'tutor';
  text: string;
  cita_normativa?: {
    guia: string;
    pagina: number;
  };
}

export interface SocraticDebriefState {
  isOpen: boolean;
  caseId: string;
  caseTitle: string;
  omisionActiva: string;
  historial: SocraticDialogTurn[];
  currentStreamText: string;
  isStreaming: boolean;
  error: string | null;
}

// ==========================================
// 4. Currículo Adaptativo (KST & BKT)
// ==========================================

export interface KSTNode {
  id: string;
  nombre: string;
  descripcion: string;
  orden: number;
  prerrequisitos?: string[];
}

export interface KSTTopology {
  nodes: KSTNode[];
}

export type KnowledgeState = Record<string, number>;

export interface ZDPRecommendation {
  case: ClinicalCase;
  competencia_objetivo: {
    id: string;
    nombre: string;
    p_dominio: number;
  };
  justificacion_pedagogica: string;
  nivel_dominio_general: string;
  promedio_dominio_global: number;
}

export interface KnowledgeStateResponse {
  student_id: string;
  knowledge_state: KnowledgeState;
  topology: KSTTopology;
  fecha_actualizacion?: string;
}

// ==========================================
// 5. Analítica Institucional, IBF y Benchmarking
// ==========================================

export interface IbfAxis {
  key: string;
  nombre: string;
  ibf_porcentaje: number;
  severidad: string;
}

export interface IbfCohortData {
  ibf_global: number;
  ibf_global_porcentaje: number;
  nivel_riesgo_global: string;
  ejes_analiticos: IbfAxis[];
}

export interface CoordinatorModuleRisk {
  modulo: string;
  porcentaje_falla: number;
  riesgo: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
}

export interface InstitutionalDeficiency {
  competencia: string;
  modulo: string;
  porcentaje_afectados: number;
  estudiantes_afectados: number;
  total_estudiantes: number;
}

export interface CoordinatorAnalyticsData {
  cohorte_nombre: string;
  total_estudiantes_activos: number;
  total_evaluaciones_registradas: number;
  insight_principal: string;
  porcentaje_falla_pediatria?: number;
  modulos_analizados: CoordinatorModuleRisk[];
  top_deficiencias_institucionales?: InstitutionalDeficiency[];
}

export interface BenchmarkMetricsIr {
  hit_1_porcentaje?: number;
  hit_3_porcentaje?: number;
  hit_5_porcentaje?: number;
  mrr_at_5?: number;
  ndcg_at_5?: number;
}

export interface BenchmarkLatencies {
  latencia_promedio_segundos?: number;
  latencia_promedio_total_s?: number;
  latencia_p50_segundos?: number;
  latencia_p95_segundos?: number;
}

export interface DatasetSplits {
  train?: number;
  val?: number;
  test?: number;
}

export interface DatasetIntegrity {
  leakage_audit?: {
    estado?: string;
  };
  split_counts?: DatasetSplits;
}

export interface ScientificBenchmarkPayload {
  status?: string;
  benchmark?: {
    total_casos?: number;
    metrics_ir?: BenchmarkMetricsIr;
    metrics_llm?: { tasa_exito_json_porcentaje?: number };
    latencias?: BenchmarkLatencies;
  };
  dataset_integrity?: DatasetIntegrity;
}

export interface ScientificBenchmarkData {
  hake_gain: number;
  p_valor: number;
  tamano_efecto_d_cohen: number;
  total_estudiantes_muestra: number;
  mejora_promedio_puntos: number;
  intervalo_confianza_95: [number, number];
}

// ==========================================
// 6. Colaboración Sincrónica (AteneoRoom)
// ==========================================

export interface RoomParticipant {
  user_id: string;
  nombre: string;
  rol: UserRole;
  online: boolean;
}

export interface AteneoRoom {
  id?: string;
  codigo?: string;
  room_code?: string;
  case_id: string;
  case_title?: string;
  case_enunciado?: string;
  case_pregunta?: string;
  guia_asociada?: string;
  imagen_url?: string;
  docente_id: string;
  docente_nombre?: string;
  estado?: string;
  activa?: boolean;
  participantes?: RoomParticipant[] | Record<string, unknown>;
  creada_en?: string;
  creado_en?: string;
  analitica_consenso?: unknown;
}

// ==========================================
// 7. Capa de Red HTTP
// ==========================================

export interface HttpResponse<T> {
  data: T;
  status: number;
  ok: boolean;
}

export interface RequestOptions extends RequestInit {
  responseType?: 'json' | 'blob';
}
