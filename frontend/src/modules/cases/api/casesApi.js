import httpClient from '../../../core/http/httpClient';

/**
 * Servicio de Red de Catálogo y Casos Clínicos
 */
export const casesApi = {
  async getCases() {
    const res = await httpClient.get('/api/cases');
    return res.data;
  },

  async getCaseById(caseId) {
    const res = await httpClient.get(`/api/cases/${caseId}`);
    return res.data;
  }
};

export default casesApi;
