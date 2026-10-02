import httpClient from '../../../core/http/httpClient';

/**
 * Servicio de Red para Analítica Institucional, IBF y Benchmarking
 */
export const analyticsApi = {
  async getTrends() {
    const res = await httpClient.get('/api/history/trends');
    return res.data;
  },

  async getCoordinatorAnalytics() {
    const res = await httpClient.get('/api/history/coordinator-analytics');
    return res.data;
  },

  async getIbfCohort() {
    const res = await httpClient.get('/api/history/ibf-cohort');
    return res.data;
  },

  async getScientificBenchmark() {
    const res = await httpClient.get('/api/evaluate/benchmark-scientific');
    return res.data;
  },

  async getFaithfulnessBenchmark() {
    const res = await httpClient.get('/api/history/faithfulness-benchmark');
    return res.data;
  },

  async getHistory() {
    const res = await httpClient.get('/api/history');
    return res.data;
  }
};

export default analyticsApi;
