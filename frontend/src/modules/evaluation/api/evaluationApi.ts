import httpClient from '../../../core/http/httpClient';
import { EvaluationResultSchema, PhaseEvaluationResultSchema } from '../../../core/validation/schemas';
import type { EvaluationResult, PhaseEvaluationResult } from '../../../types';

/**
 * Servicio de Red de Evaluación Clínica, RAG y Feedback con Validación Zod
 */
export const evaluationApi = {
  async evaluateDirect(caseId: string, respuestaEstudiante: string, imagenes: File[] | null = null): Promise<EvaluationResult> {
    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('respuesta_estudiante', respuestaEstudiante);

    if (imagenes && imagenes.length > 0) {
      imagenes.forEach((img) => {
        formData.append('imagenes', img, img.name);
      });
    }

    const res = await httpClient.post<unknown>('/api/evaluate', formData);
    const parsed = EvaluationResultSchema.safeParse(res.data);
    if (!parsed.success) {
      console.warn('Discrepancia en contrato de evaluación RAG:', parsed.error.issues);
      return res.data as EvaluationResult;
    }
    return parsed.data as EvaluationResult;
  },

  async evaluatePhase(
    caseId: string,
    faseNumero: number,
    respuestaEstudiante: string,
    historialPrevio: string = '',
    imagenes: File[] | null = null
  ): Promise<PhaseEvaluationResult> {
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

    const res = await httpClient.post<unknown>('/api/evaluate/phase', formData);
    const parsed = PhaseEvaluationResultSchema.safeParse(res.data);
    if (!parsed.success) {
      console.warn(`Discrepancia en evaluación de fase ${faseNumero}:`, parsed.error.issues);
      return res.data as PhaseEvaluationResult;
    }
    return parsed.data as PhaseEvaluationResult;
  },

  async exportEvaluationPdf(payload: unknown): Promise<Blob> {
    const res = await httpClient.post<Blob>('/api/evaluate/export-pdf', payload, {
      responseType: 'blob',
    });
    return res.data;
  },

  async exportHistoryPdf(payload: unknown): Promise<Blob> {
    const res = await httpClient.post<Blob>('/api/history/export-pdf', payload, {
      responseType: 'blob',
    });
    return res.data;
  }
};

export default evaluationApi;
