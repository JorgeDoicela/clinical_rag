import { useState, useEffect, useCallback } from 'react';
import analyticsApi from '../api/analyticsApi';

/**
 * useAnalytics — Hook controlador para analítica institucional, IBF y tendencias formativas
 */
export function useAnalytics(selectedCohort = 'Cohorte Medicina 2026-A (Internado Rotativo)') {
  const [coordinatorData, setCoordinatorData] = useState(null);
  const [ibfData, setIbfData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCoordinatorData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resCoord, resIbf] = await Promise.all([
        analyticsApi.getCoordinatorAnalytics().catch(() => null),
        analyticsApi.getIbfCohort().catch(() => null),
      ]);
      setCoordinatorData(resCoord);
      setIbfData(resIbf);
    } catch (err) {
      setError(err.message || 'Error al cargar analítica institucional');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTrends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getTrends();
      setTrendsData(data);
    } catch (err) {
      setError(err.message || 'Error al cargar tendencias formativas');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBenchmark = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getScientificBenchmark();
      setBenchmarkData(data);
    } catch (err) {
      setError(err.message || 'Error al cargar benchmark científico');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoordinatorData();
  }, [selectedCohort, loadCoordinatorData]);

  return {
    coordinatorData,
    ibfData,
    trendsData,
    benchmarkData,
    loading,
    error,
    reloadCoordinator: loadCoordinatorData,
    loadTrends,
    loadBenchmark,
  };
}

export default useAnalytics;
