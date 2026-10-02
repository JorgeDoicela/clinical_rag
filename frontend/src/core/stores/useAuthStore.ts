import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../../modules/auth/api/authApi';
import type { User } from '../../types';

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  verifyAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: true,

      setUser: (user) => set({ user }),
      setToken: (token) => {
        if (typeof localStorage !== 'undefined') {
          if (token) {
            localStorage.setItem('ateneo_token', token);
          } else {
            localStorage.removeItem('ateneo_token');
          }
        }
        set({ token });
      },

      login: async (email: string, password: string): Promise<User> => {
        set({ loading: true });
        try {
          const data = await authApi.login(email, password);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('ateneo_token', data.access_token);
          }
          set({
            token: data.access_token,
            user: data.user,
            loading: false,
          });
          return data.user;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      logout: () => {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('ateneo_token');
        }
        set({
          user: null,
          token: null,
          loading: false,
        });
      },

      verifyAuth: async () => {
        const currentToken = get().token || (typeof localStorage !== 'undefined' ? localStorage.getItem('ateneo_token') : null);
        if (!currentToken) {
          set({ user: null, token: null, loading: false });
          return;
        }

        try {
          const userData = await authApi.getMe();
          set({
            user: userData,
            token: currentToken,
            loading: false,
          });
        } catch (err) {
          console.error('Sesión expirada o token inválido:', err);
          get().logout();
        }
      },
    }),
    {
      name: 'ateneo_auth_session',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
    }
  )
);

export default useAuthStore;
