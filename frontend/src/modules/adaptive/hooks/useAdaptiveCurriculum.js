import { useState, useEffect, useCallback } from 'react';
import adaptiveApi from '../api/adaptiveApi';

/**
 * useAdaptiveCurriculum — Hook controlador del motor de currículo adaptativo (KST & BKT)
 */
export function useAdaptiveCurriculum(studentId = 'usr_alumno_001') {
  const [recommendation, setRecommendation] = useState(null);
  const [knowledgeState, setKnowledgeState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRecommendation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adaptiveApi.getNextCase(studentId);
      setRecommendation(data);
    } catch (err) {
      setError(err.message || 'Error al cargar recomendación adaptativa');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const loadKnowledgeState = useCallback(async () => {
    try {
      const data = await adaptiveApi.getKnowledgeState(studentId);
      setKnowledgeState(data);
    } catch (err) {
      console.error('Error al cargar espacio de conocimiento:', err);
    }
  }, [studentId]);

  useEffect(() => {
    loadRecommendation();
  }, [loadRecommendation]);

  return {
    recommendation,
    knowledgeState,
    loading,
    error,
    reloadRecommendation: loadRecommendation,
    loadKnowledgeState,
  };
}

export default useAdaptiveCurriculum;
