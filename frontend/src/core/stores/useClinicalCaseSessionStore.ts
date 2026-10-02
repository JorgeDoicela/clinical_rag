import { create } from 'zustand';

export interface DraftEntry {
  respuesta: string;
  timestamp: number;
}

export interface ClinicalCaseSessionState {
  drafts: Record<string, DraftEntry>;
  saveDraft: (caseId: string, respuesta: string) => void;
  getDraft: (caseId: string) => string;
  clearDraft: (caseId: string) => void;
}

/**
 * useClinicalCaseSessionStore — Salvaguarda borradores en memoria
 * Previene la pérdida de diagnósticos elaborados ante caídas de sesión o cierres accidentales.
 */
export const useClinicalCaseSessionStore = create<ClinicalCaseSessionState>((set, get) => ({
  drafts: {},

  saveDraft: (caseId: string, respuesta: string) => {
    if (!caseId) return;
    set((state) => ({
      drafts: {
        ...state.drafts,
        [caseId]: {
          respuesta,
          timestamp: Date.now(),
        },
      },
    }));
  },

  getDraft: (caseId: string) => {
    if (!caseId) return '';
    const draft = get().drafts[caseId];
    return draft ? draft.respuesta : '';
  },

  clearDraft: (caseId: string) => {
    if (!caseId) return;
    set((state) => {
      const updated = { ...state.drafts };
      delete updated[caseId];
      return { drafts: updated };
    });
  },
}));

export default useClinicalCaseSessionStore;
