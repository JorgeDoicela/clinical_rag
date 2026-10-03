/**
 * Definiciones de Tipos para el Motor de Exámenes Clínicos Objetivos Estructurados (OSCE / ECOE)
 * Sincronización horaria anti-trampa, estaciones clínicas, rúbricas de cotejo y actas criptográficas.
 * Estándar Ateneo+: rigor diagnóstico, cero dependencias frágiles y tipado estricto.
 */

export type OsceStationType =
  | 'anamnesis'
  | 'examen_fisico'
  | 'comunicacion'
  | 'interpretacion_paraclinicos'
  | 'procedimiento'
  | 'simulacion_ia';

export type OsceStationStatus =
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'expired'
  | 'locked';

export type OsceCircuitState =
  | 'IDLE'
  | 'READING_INSTRUCTIONS'
  | 'STATION_ACTIVE'
  | 'SUBMITTING'
  | 'STATION_COMPLETED'
  | 'CIRCUIT_FINISHED';

export interface OsceRubricItem {
  id: string;
  descripcion: string;
  peso: number; // Ponderación de 0 a 100 o escala clínica
  categoria: 'anamnesis' | 'razonamiento' | 'comunicacion' | 'seguridad_paciente';
  cumplido?: boolean;
  observacionesDocente?: string;
}

export interface OsceStation {
  id: string;
  estacionNumero: number;
  titulo: string;
  tipo: OsceStationType;
  duracionSegundos: number; // Tiempo oficial por estación (ej. 480s = 8 min)
  tiempoLecturaSegundos: number; // Tiempo de lectura previo (ej. 60s = 1 min)
  instruccionesCandidato: string;
  escenarioClinico: string;
  preguntaEvaluativa: string;
  casoClinicoId?: string;
  guiaClinicaId?: string;
  rubrica: OsceRubricItem[];
  paraclinicosAdjuntos?: string[];
}

export interface OsceCircuit {
  id: string;
  titulo: string;
  descripcion: string;
  institucion: string;
  fechaConvocatoria: string;
  tiempoTotalEstimadoMinutos: number;
  estaciones: OsceStation[];
}

export interface OsceSubmissionPayload {
  circuitId: string;
  stationId: string;
  estacionNumero: number;
  studentId: string;
  studentAnswer: string;
  rubricaEvaluada?: Record<string, boolean>;
  tiempoEmpleadoSegundos: number;
  expiradoPorServidor: boolean;
  serverTimestamp: number;
  clientTimestamp: number;
  hashFirmaCriptografica: string;
}

export interface OsceClockSync {
  serverNow: number;
  clientNow: number;
  skewMs: number;
}
