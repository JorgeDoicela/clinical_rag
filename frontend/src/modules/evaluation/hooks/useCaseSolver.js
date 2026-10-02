import { useState, useEffect, useCallback } from 'react';
import casesApi from '../../cases/api/casesApi';
import evaluationApi from '../api/evaluationApi';

/**
 * useCaseSolver — Hook controlador de la simulación clínica y evaluación
 * Desacopla la máquina de estados de fases, validaciones, envíos y RAG del componente visual.
 */
export function useCaseSolver(caseId) {
  const [caso, setCaso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de entrada del estudiante
  const [respuesta, setRespuesta] = useState('');
  const [imagenes, setImagenes] = useState([]);
  const [evaluating, setEvaluating] = useState(false);

  // Resultado directo (single-turn)
  const [resultado, setResultado] = useState(null);

  // Estados del Modo Multi-Fase
  const [currentPhase, setCurrentPhase] = useState(1);
  const [phaseAnswers, setPhaseAnswers] = useState({});
  const [phaseResults, setPhaseResults] = useState({});
  const [phaseScores, setPhaseScores] = useState({});
  const [completedPhases, setCompletedPhases] = useState([]);
  const [currentPhaseResult, setCurrentPhaseResult] = useState(null);
  const [showingPhaseFeedback, setShowingPhaseFeedback] = useState(false);

  // Cargar caso clínico
  useEffect(() => {
    if (!caseId) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    casesApi
      .getCaseById(caseId)
      .then((data) => {
        if (isMounted) {
          setCaso(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Error al cargar el caso clínico');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [caseId]);

  const isPhaseMode = Boolean(caso?.fases && caso.fases.length > 0);
  const totalPhases = isPhaseMode ? caso.fases.length : 1;
  const activePhaseData = isPhaseMode
    ? caso.fases.find((f) => f.fase_numero === currentPhase) || caso.fases[0]
    : null;

  // Envío en Modo Directo (Single-Turn)
  const submitSingleTurn = useCallback(
    async (e) => {
      if (e) e.preventDefault();
      if (!respuesta.trim() || evaluating) return;

      setEvaluating(true);
      setError(null);

      try {
        const res = await evaluationApi.evaluateDirect(
          caseId,
          respuesta,
          imagenes.length > 0 ? imagenes : null
        );
        setResultado(res);
      } catch (err) {
        setError(err.message || 'Error al evaluar el caso clínico');
      } finally {
        setEvaluating(false);
      }
    },
    [caseId, respuesta, imagenes, evaluating]
  );

  // Envío en Modo Multi-Fase
  const submitPhase = useCallback(
    async (e) => {
      if (e) e.preventDefault();
      if (!respuesta.trim() || evaluating) return;

      setEvaluating(true);
      setError(null);

      const historialText = Object.entries(phaseAnswers)
        .map(([num, ans]) => `Fase ${num}: ${ans}`)
        .join('\n');

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
      } catch (err) {
        setError(err.message || 'Error al evaluar la fase clínica');
      } finally {
        setEvaluating(false);
      }
    },
    [caseId, currentPhase, respuesta, phaseAnswers, evaluating]
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

      const finalOutcome = {
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
    setResultado(null);
    setRespuesta('');
    setImagenes([]);
    setError(null);
    setCurrentPhase(1);
    setPhaseAnswers({});
    setPhaseResults({});
    setPhaseScores({});
    setCompletedPhases([]);
    setCurrentPhaseResult(null);
    setShowingPhaseFeedback(false);
  }, []);

  return {
    caso,
    loading,
    error,
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
