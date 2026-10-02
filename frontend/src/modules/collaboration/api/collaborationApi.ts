import httpClient from '../../../core/http/httpClient';
import type { AteneoRoom, UserRole } from '../../../types';

/**
 * Servicio de Red de Salas Colaborativas de Ateneo
 */
export const collaborationApi = {
  async createRoom(caseId: string, docenteId?: string, docenteNombre?: string): Promise<AteneoRoom> {
    const formData = new FormData();
    formData.append('case_id', caseId);
    if (docenteId) formData.append('docente_id', docenteId);
    if (docenteNombre) formData.append('docente_nombre', docenteNombre);

    const res = await httpClient.post<AteneoRoom>('/api/ateneo/create', formData);
    return res.data;
  },

  async joinRoom(roomCode: string, userId?: string, userEmail?: string, userNombre?: string, userRol?: UserRole | string): Promise<AteneoRoom> {
    const formData = new FormData();
    formData.append('room_code', roomCode);
    if (userId) formData.append('user_id', userId);
    if (userEmail) formData.append('user_email', userEmail);
    if (userNombre) formData.append('user_nombre', userNombre);
    if (userRol) formData.append('user_rol', userRol);

    const res = await httpClient.post<AteneoRoom>('/api/ateneo/join', formData);
    return res.data;
  },

  async getRoom(roomCode: string): Promise<AteneoRoom> {
    const res = await httpClient.get<AteneoRoom>(`/api/ateneo/room/${encodeURIComponent(roomCode)}`);
    return res.data;
  },

  async updateRoomStatus(roomCode: string, nuevoEstado: string, docenteId?: string): Promise<AteneoRoom> {
    const formData = new FormData();
    formData.append('nuevo_estado', nuevoEstado);
    if (docenteId) formData.append('docente_id', docenteId);

    const res = await httpClient.post<AteneoRoom>(`/api/ateneo/room/${encodeURIComponent(roomCode)}/status`, formData);
    return res.data;
  },

  async submitRoomAnswer(roomCode: string, userEmail: string, studentAnswer: string): Promise<unknown> {
    const formData = new FormData();
    formData.append('user_email', userEmail);
    formData.append('respuesta_estudiante', studentAnswer);

    const res = await httpClient.post<unknown>(`/api/ateneo/room/${encodeURIComponent(roomCode)}/submit`, formData);
    return res.data;
  }
};

export default collaborationApi;
