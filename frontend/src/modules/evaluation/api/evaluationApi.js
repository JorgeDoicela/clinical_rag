import httpClient from '../../../core/http/httpClient';

/**
 * Servicio de Red de Evaluación Clínica, RAG y Feedback
 */
export const evaluationApi = {
  async evaluateDirect(caseId, studentAnswer, images = null) {
    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('student_answer', studentAnswer);

    if (images && images.length > 0) {
      images.forEach((img) => {
        formData.append('images', img);
      });
    }

    const data = await httpClient.post('/api/evaluate', formData);
    return data;
  },

  async evaluatePhase(caseId, faseNumero, respuestaEstudiante, historialPrevio = '') {
    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('fase_numero', faseNumero);
    formData.append('respuesta_estudiante', respuestaEstudiante);

    if (historialPrevio) {
      formData.append('historial_previo', historialPrevio);
    }

    const data = await httpClient.post('/api/evaluate/phase', formData);
    return data;
  },

  async exportEvaluationPdf(payload) {
    const res = await httpClient.post('/api/evaluate/export-pdf', payload, {
      responseType: 'blob',
    });
    return res.data;
  },

  async exportHistoryPdf(payload) {
    const res = await httpClient.post('/api/history/export-pdf', payload, {
      responseType: 'blob',
    });
    return res.data;
  }
};

export default evaluationApi;
