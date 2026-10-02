import httpClient from '../../../core/http/httpClient';

/**
 * Servicio de Red del Currículo Adaptativo (KST & BKT)
 */
export const adaptiveApi = {
  async getNextCase(studentId = 'usr_alumno_001') {
    const res = await httpClient.get(`/api/adaptive/next-case?student_id=${encodeURIComponent(studentId)}`);
    return res.data;
  },

  async getKnowledgeState(studentId = 'usr_alumno_001') {
    const res = await httpClient.get(`/api/adaptive/knowledge-state?student_id=${encodeURIComponent(studentId)}`);
    return res.data;
  },

  async getLearningPath(studentId = 'usr_alumno_001') {
    const res = await httpClient.get(`/api/adaptive/learning-path?student_id=${encodeURIComponent(studentId)}`);
    return res.data;
  },

  async getTopology() {
    const res = await httpClient.get('/api/adaptive/topology');
    return res.data;
  }
};

export default adaptiveApi;
