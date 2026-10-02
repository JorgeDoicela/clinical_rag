import httpClient from '../../../core/http/httpClient';

/**
 * Servicio de Red de Salas Colaborativas de Ateneo
 */
export const collaborationApi = {
  async createRoom(caseId, docenteId, docenteNombre) {
    const formData = new FormData();
    formData.append('case_id', caseId);
    if (docenteId) formData.append('docente_id', docenteId);
    if (docenteNombre) formData.append('docente_nombre', docenteNombre);

    const res = await httpClient.post('/api/ateneo/create', formData);
    return res.data;
  },

  async joinRoom(roomCode, userId, userEmail, userNombre, userRol) {
    const formData = new FormData();
    formData.append('room_code', roomCode);
    if (userId) formData.append('user_id', userId);
    if (userEmail) formData.append('user_email', userEmail);
    if (userNombre) formData.append('user_nombre', userNombre);
    if (userRol) formData.append('user_rol', userRol);

    const res = await httpClient.post('/api/ateneo/join', formData);
    return res.data;
  },

  async getRoom(roomCode) {
    const res = await httpClient.get(`/api/ateneo/room/${roomCode}`);
    return res.data;
  },

  async updateRoomStatus(roomCode, nuevoEstado, docenteId) {
    const formData = new FormData();
    formData.append('nuevo_estado', nuevoEstado);
    if (docenteId) formData.append('docente_id', docenteId);

    const res = await httpClient.post(`/api/ateneo/room/${roomCode}/status`, formData);
    return res.data;
  },

  async submitRoomAnswer(roomCode, userEmail, studentAnswer) {
    const formData = new FormData();
    formData.append('user_email', userEmail);
    formData.append('respuesta_estudiante', studentAnswer);

    const res = await httpClient.post(`/api/ateneo/room/${roomCode}/submit`, formData);
    return res.data;
  }
};

export default collaborationApi;
