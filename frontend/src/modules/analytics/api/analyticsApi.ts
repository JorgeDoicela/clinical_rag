import httpClient from '../../../core/http/httpClient';
import type { CoordinatorAnalyticsData, IbfCohortData, ScientificBenchmarkPayload } from '../../../types';

/**
 * Servicio de Red para Analítica Institucional, IBF y Benchmarking
 */
export const analyticsApi = {
  async getTrends(): Promise<unknown> {
    const res = await httpClient.get<unknown>('/api/history/trends');
    return res.data;
  },

  async getCoordinatorAnalytics(): Promise<CoordinatorAnalyticsData> {
    const res = await httpClient.get<CoordinatorAnalyticsData>('/api/history/coordinator-analytics');
    return res.data;
  },

  async getIbfCohort(): Promise<IbfCohortData> {
    const res = await httpClient.get<IbfCohortData>('/api/history/ibf-cohort');
    return res.data;
  },

  async getScientificBenchmark(): Promise<ScientificBenchmarkPayload> {
    const res = await httpClient.get<ScientificBenchmarkPayload>('/api/evaluate/benchmark-scientific');
    return res.data;
  },

  async getFaithfulnessBenchmark(): Promise<unknown> {
    const res = await httpClient.get<unknown>('/api/history/faithfulness-benchmark');
    return res.data;
  },

  async getHistory(): Promise<unknown> {
    const res = await httpClient.get<unknown>('/api/history');
    return res.data;
  }
};

export default analyticsApi;
