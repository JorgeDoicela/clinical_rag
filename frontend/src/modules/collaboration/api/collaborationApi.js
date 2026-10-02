import httpClient from '../../../core/http/httpClient';

/**
 * Servicio de Red de Salas Colaborativas de Ateneo
 */
export const collaborationApi = {
  async createRoom(caseId, docenteId, docenteNombre) {
    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('docente_id', docenteId || 'usr_docente_001');
    formData.append('docente_nombre', docenteNombre || 'Dr. Carlos Andrade (Docente)');

    const data = await httpClient.post('/api/ateneo/create', formData);
    return data;
  },

  async joinRoom(roomCode, userId, userEmail, userNombre, userRol) {
    const formData = new FormData();
    formData.append('room_code', roomCode);
    formData.append('user_id', userId || 'usr_alumno_001');
    formData.append('user_email', userEmail || 'alumno@ateneo.edu.ec');
    formData.append('user_nombre', userNombre || 'Estudiante María José Silva');
    formData.append('user_rol', userRol || 'alumno');

    const data = await httpClient.post('/api/ateneo/join', formData);
    return data;
  },

  async getRoom(roomCode) {
    const data = await httpClient.get(`/api/ateneo/room/${roomCode}`);
    return data;
  },

  async updateRoomStatus(roomCode, nuevoEstado, docenteId) {
    const formData = new FormData();
    formData.append('nuevo_estado', nuevoEstado);
    formData.append('docente_id', docenteId || 'usr_docente_001');

    const data = await httpClient.post(`/api/ateneo/room/${roomCode}/status`, formData);
    return data;
  },

  async submitRoomAnswer(roomCode, userEmail, studentAnswer) {
    const formData = new FormData();
    formData.append('user_email', userEmail);
    formData.append('respuesta_estudiante', studentAnswer);

    const data = await httpClient.post(`/api/ateneo/room/${roomCode}/submit`, formData);
    return data;
  }
};

export default collaborationApi;
