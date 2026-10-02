import httpClient from '../../../core/http/httpClient';
import { ClinicalCaseSchema, ClinicalCasesListSchema } from '../../../core/validation/schemas';
import type { ClinicalCase } from '../../../types';

/**
 * Servicio de Red de Catálogo y Casos Clínicos con Validación de Bordes Zod
 */
export const casesApi = {
  async getCases(): Promise<ClinicalCase[]> {
    const res = await httpClient.get<unknown>('/api/cases');
    const parsed = ClinicalCasesListSchema.safeParse(res.data);
    if (!parsed.success) {
      console.warn('Contrato clínico no estricto recibido en listado de casos:', parsed.error.issues);
      return (Array.isArray(res.data) ? res.data : []) as ClinicalCase[];
    }
    return parsed.data as ClinicalCase[];
  },

  async getCaseById(caseId: string): Promise<ClinicalCase> {
    const res = await httpClient.get<unknown>(`/api/cases/${encodeURIComponent(caseId)}`);
    const parsed = ClinicalCaseSchema.safeParse(res.data);
    if (!parsed.success) {
      console.warn(`Discrepancia en contrato de caso clínico '${caseId}':`, parsed.error.issues);
      return res.data as ClinicalCase;
    }
    return parsed.data as ClinicalCase;
  }
};

export default casesApi;
