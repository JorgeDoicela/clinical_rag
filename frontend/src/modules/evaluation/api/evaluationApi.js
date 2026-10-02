import httpClient from '../../../core/http/httpClient';

/**
 * Servicio de Red de Evaluación Clínica, RAG y Feedback
 */
export const evaluationApi = {
  async evaluateDirect(caseId, respuestaEstudiante, imagenes = null) {
    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('respuesta_estudiante', respuestaEstudiante);

    if (imagenes && imagenes.length > 0) {
      imagenes.forEach((img) => {
        formData.append('imagenes', img, img.name);
      });
    }

    const res = await httpClient.post('/api/evaluate', formData);
    return res.data;
  },

  async evaluatePhase(caseId, faseNumero, respuestaEstudiante, historialPrevio = '', imagenes = null) {
    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('fase_numero', faseNumero.toString());
    formData.append('respuesta_estudiante', respuestaEstudiante);

    if (historialPrevio) {
      formData.append('historial_previo', historialPrevio);
    }

    if (imagenes && imagenes.length > 0) {
      imagenes.forEach((img) => {
        formData.append('imagenes', img, img.name);
      });
    }

    const res = await httpClient.post('/api/evaluate/phase', formData);
    return res.data;
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
