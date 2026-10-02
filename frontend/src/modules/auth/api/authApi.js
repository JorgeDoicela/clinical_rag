import httpClient from '../../../core/http/httpClient';

/**
 * Servicio de Red de Autenticación y RBAC
 */
export const authApi = {
  async login(email, password) {
    const res = await httpClient.post('/api/auth/login', { email, password });
    return res.data;
  },

  async getMe() {
    const res = await httpClient.get('/api/auth/me');
    return res.data;
  },

  async getUsers() {
    const res = await httpClient.get('/api/auth/users');
    return res.data;
  }
};

export default authApi;
