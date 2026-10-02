import httpClient from '../../../core/http/httpClient';

/**
 * Servicio de Red del Currículo Adaptativo (KST & BKT)
 */
export const adaptiveApi = {
  async getNextCase(studentId = 'usr_alumno_001') {
    const data = await httpClient.get(`/api/adaptive/next-case?student_id=${studentId}`);
    return data;
  },

  async getKnowledgeState(studentId = 'usr_alumno_001') {
    const data = await httpClient.get(`/api/adaptive/knowledge-state?student_id=${studentId}`);
    return data;
  },

  async getLearningPath(studentId = 'usr_alumno_001') {
    const data = await httpClient.get(`/api/adaptive/learning-path?student_id=${studentId}`);
    return data;
  },

  async getTopology() {
    const data = await httpClient.get('/api/adaptive/topology');
    return data;
  }
};

export default adaptiveApi;
