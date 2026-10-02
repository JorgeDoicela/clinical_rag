import { useQuery } from '@tanstack/react-query';
import adaptiveApi from '../api/adaptiveApi';
import type { ZDPRecommendation, KnowledgeStateResponse } from '../../../types';

/**
 * useAdaptiveCurriculum — Hook controlador del motor de currículo adaptativo (KST & BKT)
 * Optimizado con TanStack Query para caché reactiva del estado de conocimiento del estudiante.
 */
export function useAdaptiveCurriculum(studentId: string = 'usr_alumno_001') {
  const {
    data: recommendation = null,
    isLoading: loading,
    error: queryError,
    refetch: reloadRecommendation,
  } = useQuery<ZDPRecommendation, Error>({
    queryKey: ['adaptive-recommendation', studentId],
    queryFn: () => adaptiveApi.getNextCase(studentId),
    staleTime: 2 * 60 * 1000,
  });

  const {
    data: knowledgeState = null,
    refetch: loadKnowledgeState,
  } = useQuery<KnowledgeStateResponse, Error>({
    queryKey: ['knowledge-state', studentId],
    queryFn: () => adaptiveApi.getKnowledgeState(studentId),
    staleTime: 5 * 60 * 1000,
  });

  const error = queryError ? queryError.message : null;

  return {
    recommendation,
    knowledgeState,
    loading,
    error,
    reloadRecommendation,
    loadKnowledgeState,
  };
}

export default useAdaptiveCurriculum;
