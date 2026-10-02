import httpClient from '../../../core/http/httpClient';
import type { ZDPRecommendation, KnowledgeStateResponse, KSTTopology } from '../../../types';

/**
 * Servicio de Red del Currículo Adaptativo (KST & BKT)
 */
export const adaptiveApi = {
  async getNextCase(studentId: string = 'usr_alumno_001'): Promise<ZDPRecommendation> {
    const res = await httpClient.get<ZDPRecommendation>(`/api/adaptive/next-case?student_id=${encodeURIComponent(studentId)}`);
    return res.data;
  },

  async getKnowledgeState(studentId: string = 'usr_alumno_001'): Promise<KnowledgeStateResponse> {
    const res = await httpClient.get<KnowledgeStateResponse>(`/api/adaptive/knowledge-state?student_id=${encodeURIComponent(studentId)}`);
    return res.data;
  },

  async getLearningPath(studentId: string = 'usr_alumno_001'): Promise<unknown> {
    const res = await httpClient.get<unknown>(`/api/adaptive/learning-path?student_id=${encodeURIComponent(studentId)}`);
    return res.data;
  },

  async getTopology(): Promise<KSTTopology> {
    const res = await httpClient.get<KSTTopology>('/api/adaptive/topology');
    return res.data;
  }
};

export default adaptiveApi;
