import httpClient from '../../../core/http/httpClient';

/**
 * Servicio de Red de Autenticación y RBAC
 */
export const authApi = {
  async login(email, password) {
    const data = await httpClient.post('/api/auth/login', { email, password });
    return data;
  },

  async getMe() {
    const data = await httpClient.get('/api/auth/me');
    return data;
  },

  async getUsers() {
    const data = await httpClient.get('/api/auth/users');
    return data;
  }
};

export default authApi;
