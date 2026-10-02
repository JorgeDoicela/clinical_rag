import { create } from 'zustand';
import collaborationApi from '../../modules/collaboration/api/collaborationApi';
import type { AteneoRoom, EvaluationResult } from '../../types';

export interface RoomParticipantDetail {
  nombre?: string;
  rol?: string;
  respondido?: boolean;
  resultado_evaluacion?: EvaluationResult;
}

export interface RoomConsensus {
  porcentaje_participacion?: number;
  score_promedio?: number;
  diagnostico_mayoritario?: string;
  promedio_sala?: number;
  total_respondidos?: number;
  total_conectados?: number;
  nivel_consenso?: string;
  top_brechas_sala?: string[];
}

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';

export interface ExtendedAteneoRoom extends Omit<AteneoRoom, 'participantes'> {
  participantes?: Record<string, RoomParticipantDetail>;
  estado?: string;
  analitica_consenso?: RoomConsensus;
}

export interface AteneoRoomState {
  room: ExtendedAteneoRoom | null;
  loading: boolean;
  error: string | null;
  studentAnswer: string;
  submitting: boolean;
  submittedEval: EvaluationResult | null;
  connectionStatus: ConnectionStatus;
  connectedCount: number;

  setStudentAnswer: (answer: string) => void;
  setSubmittedEval: (evaluation: EvaluationResult | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setConnectedCount: (count: number) => void;
  setRoom: (room: ExtendedAteneoRoom, userEmail?: string) => void;
  fetchRoomState: (roomCode: string, userEmail?: string) => Promise<void>;
  updateRoomStatus: (roomCode: string, nuevoEstado: string, userId: string) => Promise<void>;
  submitAnswer: (roomCode: string, userEmail: string) => Promise<void>;
  resetRoom: () => void;
}

export const useAteneoRoomStore = create<AteneoRoomState>((set, get) => ({
  room: null,
  loading: true,
  error: null,
  studentAnswer: '',
  submitting: false,
  submittedEval: null,
  connectionStatus: 'DISCONNECTED',
  connectedCount: 0,

  setStudentAnswer: (studentAnswer) => set({ studentAnswer }),
  setSubmittedEval: (submittedEval) => set({ submittedEval }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setConnectedCount: (connectedCount) => set({ connectedCount }),

  setRoom: (data: ExtendedAteneoRoom, userEmail?: string) => {
    set({
      room: data,
      loading: false,
      error: null,
    });

    if (userEmail) {
      const myEmail = userEmail.toLowerCase();
      const rawParticipants = data.participantes as unknown;
      if (rawParticipants && typeof rawParticipants === 'object' && !Array.isArray(rawParticipants)) {
        const dict = rawParticipants as Record<string, RoomParticipantDetail>;
        const myParticipantData = dict[myEmail];
        if (myParticipantData?.respondido && myParticipantData.resultado_evaluacion) {
          set({ submittedEval: myParticipantData.resultado_evaluacion });
        }
      }
    }
  },

  fetchRoomState: async (roomCode: string, userEmail?: string) => {
    if (!roomCode) return;
    try {
      const data = await collaborationApi.getRoom(roomCode);
      get().setRoom(data as ExtendedAteneoRoom, userEmail);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'La sala no existe o ha finalizado';
      set({ error: msg, loading: false });
    }
  },

  updateRoomStatus: async (roomCode: string, nuevoEstado: string, userId: string) => {
    try {
      await collaborationApi.updateRoomStatus(roomCode, nuevoEstado, userId);
      await get().fetchRoomState(roomCode);
    } catch (err) {
      console.error('Error al actualizar fase de la sala:', err);
    }
  },

  submitAnswer: async (roomCode: string, userEmail: string) => {
    const { studentAnswer, submitting } = get();
    if (!studentAnswer.trim() || submitting) return;

    set({ submitting: true });
    try {
      const res = (await collaborationApi.submitRoomAnswer(
        roomCode,
        userEmail || 'alumno@ateneo.edu.ec',
        studentAnswer
      )) as { resultado_evaluacion?: EvaluationResult };

      if (res?.resultado_evaluacion) {
        set({ submittedEval: res.resultado_evaluacion });
      }
      await get().fetchRoomState(roomCode, userEmail);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar diagnóstico';
      alert(msg);
    } finally {
      set({ submitting: false });
    }
  },

  resetRoom: () => {
    set({
      room: null,
      loading: true,
      error: null,
      studentAnswer: '',
      submitting: false,
      submittedEval: null,
      connectionStatus: 'DISCONNECTED',
      connectedCount: 0,
    });
  },
}));

export default useAteneoRoomStore;
