import { useState, useCallback, useEffect, FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import casesApi from '../../cases/api/casesApi';
import evaluationApi from '../api/evaluationApi';
import offlineDb from '../../../core/storage/offlineDb';
import { useClinicalCaseSessionStore } from '../../../core/stores/useClinicalCaseSessionStore';
import type { ClinicalCase, CasePhase, EvaluationResult, PhaseEvaluationResult } from '../../../types';

/**
 * useCaseSolver — Hook controlador de la simulación clínica y evaluación
 * Optimizado con TanStack Query para resolución de caso, Zustand para autoguardado de borradores
 * e IndexedDB para resiliencia hospitalaria offline-first.
 */
export function useCaseSolver(caseId?: string) {
  // Cargar caso clínico con caché reactiva de TanStack Query y fallback offline
  const {
    data: caso = null,
    isLoading: loading,
    error: queryError,
  } = useQuery<ClinicalCase | null, Error>({
    queryKey: ['clinical-case', caseId],
    queryFn: async () => {
      if (!caseId) return null;
      try {
        const remoteCase = await casesApi.getCaseById(caseId);
        if (remoteCase) {
          await offlineDb.saveCases([remoteCase]);
        }
        return remoteCase;
      } catch (netErr) {
        const localCase = await offlineDb.getCase(caseId);
        if (localCase) return localCase;
        throw netErr;
      }
    },
    enabled: Boolean(caseId),
    staleTime: 5 * 60 * 1000,
  });

  const [error, setError] = useState<string | null>(null);

  // Sesión de borradores en memoria
  const saveDraft = useClinicalCaseSessionStore((state) => state.saveDraft);
  const getDraft = useClinicalCaseSessionStore((state) => state.getDraft);
  const clearDraft = useClinicalCaseSessionStore((state) => state.clearDraft);

  // Estados de entrada del estudiante inicializados con borrador si existiera
  const [respuesta, setRespuestaState] = useState<string>(() => (caseId ? getDraft(caseId) : ''));
  const [imagenes, setImagenes] = useState<File[]>([]);
  const [evaluating, setEvaluating] = useState<boolean>(false);

  const setRespuesta = useCallback(
    (valueOrUpdater: string | ((prev: string) => string)) => {
      setRespuestaState((prev) => {
        const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
        if (caseId) {
          saveDraft(caseId, next);
        }
        return next;
      });
    },
    [caseId, saveDraft]
  );

  useEffect(() => {
    if (caseId) {
      const draft = getDraft(caseId);
      if (draft && !respuesta) {
        setRespuestaState(draft);
      }
    }
  }, [caseId, getDraft, respuesta]);

  // Resultado directo (single-turn)
  const [resultado, setResultado] = useState<EvaluationResult | null>(null);

  // Estados del Modo Multi-Fase
  const [currentPhase, setCurrentPhase] = useState<number>(1);
  const [phaseAnswers, setPhaseAnswers] = useState<Record<number, string>>({});
  const [phaseResults, setPhaseResults] = useState<Record<number, PhaseEvaluationResult>>({});
  const [phaseScores, setPhaseScores] = useState<Record<number, number>>({});
  const [completedPhases, setCompletedPhases] = useState<number[]>([]);
  const [currentPhaseResult, setCurrentPhaseResult] = useState<PhaseEvaluationResult | null>(null);
  const [showingPhaseFeedback, setShowingPhaseFeedback] = useState<boolean>(false);

  const isPhaseMode = Boolean(caso?.fases && caso.fases.length > 0);
  const totalPhases = isPhaseMode && caso?.fases ? caso.fases.length : 1;
  const activePhaseData: CasePhase | null = isPhaseMode && caso?.fases
    ? caso.fases.find((f) => f.fase_numero === currentPhase) || caso.fases[0]
    : null;

  // Envío en Modo Directo (Single-Turn)
  const submitSingleTurn = useCallback(
    async (e?: FormEvent) => {
      if (e) e.preventDefault();
      if (!caseId || !respuesta.trim() || evaluating) return;

      setEvaluating(true);
      setError(null);

      // Si el navegador está desconectado, encolar directamente en Outbox
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await offlineDb.queueEvaluation({
          case_id: caseId,
          case_title: caso?.titulo || 'Caso Clínico',
          respuesta_estudiante: respuesta,
          user_email: 'estudiante@ateneo.local',
          tipo: 'single_turn',
        });

        const provisionalOutcome: EvaluationResult = {
          score: 0,
          score_max: 10,
          aciertos: ['Respuesta resguardada exitosamente en el buffer local del dispositivo.'],
          omisiones: [],
          competencias_deficientes: [],
          retroalimentacion_general: 'Modo Local Activo: Se detectó pérdida de red hospitalaria. Su respuesta ha sido resguardada en el dispositivo y se sincronizará automáticamente con el clúster clínico al restablecerse la conectividad.',
        };

        setResultado(provisionalOutcome);
        setEvaluating(false);
        return;
      }

      try {
        const res = await evaluationApi.evaluateDirect(
          caseId,
          respuesta,
          imagenes.length > 0 ? imagenes : null
        );
        setResultado(res);
        await offlineDb.cacheEvaluationResult(caseId, res);
      } catch (err: unknown) {
        // Encolar si es fallo de red
        await offlineDb.queueEvaluation({
          case_id: caseId,
          case_title: caso?.titulo || 'Caso Clínico',
          respuesta_estudiante: respuesta,
          user_email: 'estudiante@ateneo.local',
          tipo: 'single_turn',
        });

        const provisionalOutcome: EvaluationResult = {
          score: 0,
          score_max: 10,
          aciertos: ['Respuesta resguardada en buffer local tras interrupción de red.'],
          omisiones: [],
          competencias_deficientes: [],
          retroalimentacion_general: 'Modo Local Activo: No fue posible contactar al servidor central en este momento. Su respuesta clínica fue almacenada localmente y se enviará de forma automática en segundo plano.',
        };
        setResultado(provisionalOutcome);
      } finally {
        setEvaluating(false);
      }
    },
    [caseId, respuesta, imagenes, evaluating, caso?.titulo]
  );

  // Envío en Modo Multi-Fase
  const submitPhase = useCallback(
    async (e?: FormEvent) => {
      if (e) e.preventDefault();
      if (!caseId || !respuesta.trim() || evaluating) return;

      setEvaluating(true);
      setError(null);

      const historialText = Object.entries(phaseAnswers)
        .map(([num, ans]) => `Fase ${num}: ${ans}`)
        .join('\n');

      // Si el navegador está desconectado, encolar en Outbox
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await offlineDb.queueEvaluation({
          case_id: caseId,
          case_title: caso?.titulo || 'Caso Clínico',
          respuesta_estudiante: respuesta,
          fase_numero: currentPhase,
          user_email: 'estudiante@ateneo.local',
          tipo: 'phase',
        });

        const provisionalPhaseResult: PhaseEvaluationResult = {
          score_fase: 0,
          aciertos: ['Respuesta de fase resguardada en buffer local.'],
          omisiones: [],
          retroalimentacion_fase: 'Modo Local Activo: Su respuesta de fase quedó registrada en el dispositivo. La evaluación analítica se completará automáticamente al reconectarse a la red.',
          desbloquea_siguiente: true,
        };

        setPhaseAnswers((prev) => ({ ...prev, [currentPhase]: respuesta }));
        setPhaseResults((prev) => ({ ...prev, [currentPhase]: provisionalPhaseResult }));
        setPhaseScores((prev) => ({ ...prev, [currentPhase]: 0 }));
        setCompletedPhases((prev) =>
          prev.includes(currentPhase) ? prev : [...prev, currentPhase]
        );

        setCurrentPhaseResult(provisionalPhaseResult);
        setShowingPhaseFeedback(true);
        setEvaluating(false);
        return;
      }

      try {
        const res = await evaluationApi.evaluatePhase(
          caseId,
          currentPhase,
          respuesta,
          historialText
        );

        setPhaseAnswers((prev) => ({ ...prev, [currentPhase]: respuesta }));
        setPhaseResults((prev) => ({ ...prev, [currentPhase]: res }));
        setPhaseScores((prev) => ({ ...prev, [currentPhase]: res.score_fase }));
        setCompletedPhases((prev) =>
          prev.includes(currentPhase) ? prev : [...prev, currentPhase]
        );

        setCurrentPhaseResult(res);
        setShowingPhaseFeedback(true);
      } catch (err: unknown) {
        // Encolar si es fallo de red
        await offlineDb.queueEvaluation({
          case_id: caseId,
          case_title: caso?.titulo || 'Caso Clínico',
          respuesta_estudiante: respuesta,
          fase_numero: currentPhase,
          user_email: 'estudiante@ateneo.local',
          tipo: 'phase',
        });

        const provisionalPhaseResult: PhaseEvaluationResult = {
          score_fase: 0,
          aciertos: ['Respuesta guardada localmente tras corte de red.'],
          omisiones: [],
          retroalimentacion_fase: 'Modo Local Activo: Se guardó su avance de fase. Se sincronizará automáticamente al restablecerse la conectividad.',
          desbloquea_siguiente: true,
        };

        setPhaseAnswers((prev) => ({ ...prev, [currentPhase]: respuesta }));
        setPhaseResults((prev) => ({ ...prev, [currentPhase]: provisionalPhaseResult }));
        setPhaseScores((prev) => ({ ...prev, [currentPhase]: 0 }));
        setCompletedPhases((prev) =>
          prev.includes(currentPhase) ? prev : [...prev, currentPhase]
        );

        setCurrentPhaseResult(provisionalPhaseResult);
        setShowingPhaseFeedback(true);
      } finally {
        setEvaluating(false);
      }
    },
    [caseId, currentPhase, respuesta, phaseAnswers, evaluating, caso?.titulo]
  );

  // Avanzar a la siguiente fase
  const proceedToNextPhase = useCallback(() => {
    setShowingPhaseFeedback(false);
    setCurrentPhaseResult(null);
    setRespuesta('');
    setImagenes([]);

    if (currentPhase < totalPhases) {
      setCurrentPhase((prev) => prev + 1);
    } else {
      // Consolidar resultado global de todas las fases
      const scores = Object.values(phaseScores);
      const avgScore =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 8.0;

      const allAciertos = Object.values(phaseResults).flatMap(
        (r) => r.aciertos || []
      );
      const allOmisiones = Object.values(phaseResults).flatMap(
        (r) => r.omisiones || []
      );

      const finalOutcome: EvaluationResult = {
        score: Math.round(avgScore * 10) / 10,
        score_max: 10,
        aciertos: allAciertos,
        omisiones: allOmisiones,
        competencias_deficientes: [],
        retroalimentacion_general: `Simulación clínica multicomponente completada exitosamente a través de las ${totalPhases} fases normativas de la GPC del MSP.`,
      };

      setResultado(finalOutcome);
    }
  }, [currentPhase, totalPhases, phaseScores, phaseResults]);

  // Reiniciar caso para reintentar
  const resetCase = useCallback(() => {
    if (caseId) clearDraft(caseId);
    setResultado(null);
    setRespuestaState('');
    setImagenes([]);
    setError(null);
    setCurrentPhase(1);
    setPhaseAnswers({});
    setPhaseResults({});
    setPhaseScores({});
    setCompletedPhases([]);
    setCurrentPhaseResult(null);
    setShowingPhaseFeedback(false);
  }, [caseId, clearDraft]);

  const effectiveError = error || (queryError ? queryError.message : null);

  return {
    caso,
    loading,
    error: effectiveError,
    respuesta,
    setRespuesta,
    imagenes,
    setImagenes,
    evaluating,
    resultado,
    isPhaseMode,
    currentPhase,
    setCurrentPhase,
    totalPhases,
    activePhaseData,
    phaseScores,
    completedPhases,
    currentPhaseResult,
    showingPhaseFeedback,
    submitSingleTurn,
    submitPhase,
    proceedToNextPhase,
    resetCase,
  };
}

export default useCaseSolver;
