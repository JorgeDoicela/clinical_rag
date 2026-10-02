import httpClient from '../../../core/http/httpClient';

/**
 * Servicio de Red de Catálogo y Casos Clínicos
 */
export const casesApi = {
  async getCases() {
    const data = await httpClient.get('/api/cases');
    return data;
  },

  async getCaseById(caseId) {
    const data = await httpClient.get(`/api/cases/${caseId}`);
    return data;
  }
};

export default casesApi;
