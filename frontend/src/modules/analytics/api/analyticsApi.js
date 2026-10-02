import httpClient from '../../../core/http/httpClient';

/**
 * Servicio de Red para Analítica Institucional, IBF y Benchmarking
 */
export const analyticsApi = {
  async getTrends() {
    const data = await httpClient.get('/api/history/trends');
    return data;
  },

  async getCoordinatorAnalytics() {
    const data = await httpClient.get('/api/history/coordinator-analytics');
    return data;
  },

  async getIbfCohort() {
    const data = await httpClient.get('/api/history/ibf-cohort');
    return data;
  },

  async getScientificBenchmark() {
    const data = await httpClient.get('/api/evaluate/benchmark-scientific');
    return data;
  },

  async getFaithfulnessBenchmark() {
    const data = await httpClient.get('/api/history/faithfulness-benchmark');
    return data;
  },

  async getHistory() {
    const data = await httpClient.get('/api/history');
    return data;
  }
};

export default analyticsApi;
