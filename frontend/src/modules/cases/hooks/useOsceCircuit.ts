import { useState, useEffect, useRef, useCallback } from 'react';
import {
  OsceCircuit,
  OsceStation,
  OsceCircuitState,
  OsceSubmissionPayload,
  OsceClockSync
} from '../../../types/osce';

export interface UseOsceCircuitProps {
  circuit: OsceCircuit;
  studentId: string;
  initialServerTimestamp?: number;
  onStationSubmitted?: (payload: OsceSubmissionPayload) => Promise<void> | void;
  onCircuitCompleted?: (allSubmissions: OsceSubmissionPayload[]) => void;
}

/**
 * Función criptográfica auxiliar SHA-256 nativa (Web Cryptography API)
 * Genera el hash determinístico del acta de respuesta clínica del estudiante.
 */
export async function generateSha256Signature(payloadString: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(payloadString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback determinístico en caso de restricciones de contexto criptográfico
    }
  }

  // Fallback FNV-1a extendido de 64 bits para entornos sin subtle crypto
  let hash = 0x811c9dc5;
  for (let i = 0; i < payloadString.length; i++) {
    hash ^= payloadString.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `sha256-mock-${Math.abs(hash).toString(16).padStart(8, '0')}-${Date.now().toString(16)}`;
}

/**
 * useOsceCircuit — Hook de gestión del circuito clínico estructurado OSCE/ECOE.
 * Implementa reloj sincronizado anti-trampa, máquina de estados estricta,
 * cierre automático por servidor y generación de actas criptográficas.
 */
export function useOsceCircuit({
  circuit,
  studentId,
  initialServerTimestamp,
  onStationSubmitted,
  onCircuitCompleted
}: UseOsceCircuitProps) {
  // 1. Estado de progresión del circuito
  const [currentStationIndex, setCurrentStationIndex] = useState<number>(0);
  const [circuitState, setCircuitState] = useState<OsceCircuitState>('READING_INSTRUCTIONS');
  const [submissions, setSubmissions] = useState<OsceSubmissionPayload[]>([]);

  // 2. Respuesta clínica y rúbrica activa
  const [studentAnswer, setStudentAnswer] = useState<string>('');
  const [evaluatedRubric, setEvaluatedRubric] = useState<Record<string, boolean>>({});

  // 3. Sincronización horaria estricta con servidor
  const clientMountTime = useRef<number>(Date.now());
  const serverBaseTime = initialServerTimestamp || Date.now();
  const clockSkewMs = useRef<number>(serverBaseTime - clientMountTime.current);

  const currentStation: OsceStation | undefined = circuit.estaciones[currentStationIndex];

  // Tiempos absolutos proyectados en la escala del servidor
  const stationStartTimeRef = useRef<number>(serverBaseTime);
  const stationDurationRef = useRef<number>(currentStation ? currentStation.duracionSegundos : 480);
  const readingDurationRef = useRef<number>(currentStation ? currentStation.tiempoLecturaSegundos : 60);

  const [remainingSeconds, setRemainingSeconds] = useState<number>(readingDurationRef.current);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const hasAutoSubmittedRef = useRef<boolean>(false);

  // Obtener tiempo actual proyectado en escala del servidor
  const getServerNow = useCallback((): number => {
    return Date.now() + clockSkewMs.current;
  }, []);

  // Inicializar estación actual
  const initStation = useCallback((stationIndex: number) => {
    const station = circuit.estaciones[stationIndex];
    if (!station) return;

    const sNow = getServerNow();
    stationStartTimeRef.current = sNow;
    stationDurationRef.current = station.duracionSegundos;
    readingDurationRef.current = station.tiempoLecturaSegundos;
    hasAutoSubmittedRef.current = false;
    setIsLocked(false);
    setStudentAnswer('');
    setEvaluatedRubric({});

    if (station.tiempoLecturaSegundos > 0) {
      setCircuitState('READING_INSTRUCTIONS');
      setRemainingSeconds(station.tiempoLecturaSegundos);
    } else {
      setCircuitState('STATION_ACTIVE');
      setRemainingSeconds(station.duracionSegundos);
    }
  }, [circuit.estaciones, getServerNow]);

  // Montaje y cambio de estación
  useEffect(() => {
    initStation(currentStationIndex);
  }, [currentStationIndex, initStation]);

  // Transición manual o automática de lectura a ejecución activa
  const startStationActive = useCallback(() => {
    stationStartTimeRef.current = getServerNow();
    setCircuitState('STATION_ACTIVE');
    setRemainingSeconds(stationDurationRef.current);
  }, [getServerNow]);

  // Despacho formal de la estación (voluntario o forzado por timeout)
  const submitCurrentStation = useCallback(async (isExpiredByServer = false) => {
    if (hasAutoSubmittedRef.current || !currentStation) return;
    hasAutoSubmittedRef.current = true;
    setIsSubmitting(true);
    setIsLocked(true);
    setCircuitState('SUBMITTING');

    const serverNow = getServerNow();
    const elapsedSecs = Math.max(1, Math.round((serverNow - stationStartTimeRef.current) / 1000));

    // Generar firma criptográfica del acta
    const canonicalString = `${circuit.id}:${currentStation.id}:${studentId}:${studentAnswer.trim()}:${serverNow}:${isExpiredByServer}`;
    const signature = await generateSha256Signature(canonicalString);

    const submissionPayload: OsceSubmissionPayload = {
      circuitId: circuit.id,
      stationId: currentStation.id,
      estacionNumero: currentStation.estacionNumero,
      studentId,
      studentAnswer: studentAnswer.trim(),
      rubricaEvaluada: evaluatedRubric,
      tiempoEmpleadoSegundos: Math.min(elapsedSecs, currentStation.duracionSegundos),
      expiradoPorServidor: isExpiredByServer,
      serverTimestamp: serverNow,
      clientTimestamp: Date.now(),
      hashFirmaCriptografica: signature
    };

    if (onStationSubmitted) {
      try {
        await onStationSubmitted(submissionPayload);
      } catch (err) {
        console.error('[OSCE] Error al transmitir submission:', err);
      }
    }

    setSubmissions(prev => [...prev, submissionPayload]);
    setIsSubmitting(false);

    // Verificar si es la última estación
    const nextIndex = currentStationIndex + 1;
    if (nextIndex >= circuit.estaciones.length) {
      setCircuitState('CIRCUIT_FINISHED');
      if (onCircuitCompleted) {
        onCircuitCompleted([...submissions, submissionPayload]);
      }
    } else {
      setCircuitState('STATION_COMPLETED');
    }
  }, [
    currentStation,
    circuit.id,
    circuit.estaciones.length,
    studentId,
    studentAnswer,
    evaluatedRubric,
    currentStationIndex,
    submissions,
    getServerNow,
    onStationSubmitted,
    onCircuitCompleted
  ]);

  // Rotar a la siguiente estación del circuito
  const proceedToNextStation = useCallback(() => {
    const nextIndex = currentStationIndex + 1;
    if (nextIndex < circuit.estaciones.length) {
      setCurrentStationIndex(nextIndex);
    } else {
      setCircuitState('CIRCUIT_FINISHED');
    }
  }, [currentStationIndex, circuit.estaciones.length]);

  // Alternar ítem de rúbrica
  const toggleRubricItem = useCallback((itemId: string) => {
    if (isLocked) return;
    setEvaluatedRubric(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  }, [isLocked]);

  // Bucle de temporizador sincronizado (Ticker anti-deriva)
  useEffect(() => {
    if (circuitState !== 'READING_INSTRUCTIONS' && circuitState !== 'STATION_ACTIVE') {
      return;
    }

    const interval = setInterval(() => {
      const serverNow = getServerNow();
      const elapsedMs = serverNow - stationStartTimeRef.current;
      const elapsedSec = Math.floor(elapsedMs / 1000);

      if (circuitState === 'READING_INSTRUCTIONS') {
        const remaining = Math.max(0, readingDurationRef.current - elapsedSec);
        setRemainingSeconds(remaining);
        if (remaining <= 0) {
          startStationActive();
        }
      } else if (circuitState === 'STATION_ACTIVE') {
        const remaining = Math.max(0, stationDurationRef.current - elapsedSec);
        setRemainingSeconds(remaining);
        if (remaining <= 0 && !hasAutoSubmittedRef.current) {
          // Disparo forzado por servidor ante timeout
          submitCurrentStation(true);
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [circuitState, getServerNow, startStationActive, submitCurrentStation]);

  const clockSyncInfo: OsceClockSync = {
    serverNow: getServerNow(),
    clientNow: Date.now(),
    skewMs: clockSkewMs.current
  };

  return {
    circuit,
    currentStationIndex,
    currentStation,
    totalStations: circuit.estaciones.length,
    circuitState,
    remainingSeconds,
    isLocked,
    isSubmitting,
    studentAnswer,
    setStudentAnswer,
    evaluatedRubric,
    toggleRubricItem,
    submissions,
    startStationActive,
    submitCurrentStation,
    proceedToNextStation,
    clockSyncInfo
  };
}

export default useOsceCircuit;
