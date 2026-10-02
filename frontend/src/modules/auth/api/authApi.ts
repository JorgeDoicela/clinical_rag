import httpClient from '../../../core/http/httpClient';
import { LoginResponseSchema, UserSchema } from '../../../core/validation/schemas';
import type { LoginResponse, User } from '../../../types';

/**
 * Servicio de Red de Autenticación y RBAC con Validación Zod
 */
export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await httpClient.post<unknown>('/api/auth/login', { email, password });
    const parsed = LoginResponseSchema.safeParse(res.data);
    if (!parsed.success) {
      console.warn('Discrepancia en contrato de login:', parsed.error.issues);
      return res.data as LoginResponse;
    }
    return parsed.data as LoginResponse;
  },

  async getMe(): Promise<User> {
    const res = await httpClient.get<unknown>('/api/auth/me');
    const parsed = UserSchema.safeParse(res.data);
    if (!parsed.success) {
      console.warn('Discrepancia en contrato de usuario actual:', parsed.error.issues);
      return res.data as User;
    }
    return parsed.data as User;
  },

  async getUsers(): Promise<User[]> {
    const res = await httpClient.get<User[]>('/api/auth/users');
    return res.data;
  }
};

export default authApi;
