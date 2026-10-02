import { useQuery } from '@tanstack/react-query';
import analyticsApi from '../api/analyticsApi';
import type { CoordinatorAnalyticsData, IbfCohortData, ScientificBenchmarkPayload } from '../../../types';

/**
 * useAnalytics — Hook controlador para analítica institucional, IBF y tendencias formativas
 * Refactorizado con TanStack Query para agregaciones paralelas y persistencia en memoria.
 */
export function useAnalytics(selectedCohort: string = 'Cohorte Medicina 2026-A (Internado Rotativo)') {
  const {
    data: coordinatorData = null,
    isLoading: loadingCoord,
    error: errorCoord,
    refetch: reloadCoordinatorOnly,
  } = useQuery<CoordinatorAnalyticsData | null, Error>({
    queryKey: ['coordinator-analytics', selectedCohort],
    queryFn: async () => {
      try {
        return await analyticsApi.getCoordinatorAnalytics();
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: ibfData = null,
    isLoading: loadingIbf,
    error: errorIbf,
    refetch: reloadIbfOnly,
  } = useQuery<IbfCohortData | null, Error>({
    queryKey: ['ibf-cohort', selectedCohort],
    queryFn: async () => {
      try {
        return await analyticsApi.getIbfCohort();
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: trendsData = null,
    refetch: loadTrends,
  } = useQuery<unknown | null, Error>({
    queryKey: ['analytics-trends', selectedCohort],
    queryFn: async () => {
      try {
        return await analyticsApi.getTrends();
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: benchmarkData = null,
    refetch: loadBenchmark,
  } = useQuery<ScientificBenchmarkPayload | null, Error>({
    queryKey: ['scientific-benchmark'],
    queryFn: async () => {
      try {
        return await analyticsApi.getScientificBenchmark();
      } catch {
        return null;
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  const loading = loadingCoord || loadingIbf;
  const error = (errorCoord || errorIbf)?.message || null;

  const reloadCoordinator = async () => {
    await Promise.all([reloadCoordinatorOnly(), reloadIbfOnly()]);
  };

  return {
    coordinatorData,
    ibfData,
    trendsData,
    benchmarkData,
    loading,
    error,
    reloadCoordinator,
    loadTrends,
    loadBenchmark,
  };
}

export default useAnalytics;
