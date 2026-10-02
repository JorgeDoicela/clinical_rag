import { useEffect, ReactNode } from 'react';
import { useAuthStore } from '../core/stores/useAuthStore';
import type { AuthContextType, User } from '../types';

export interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider — Fachada transparente basada en Zustand
 * Proporciona el contrato histórico AuthContextType para retrocompatibilidad total con tests existentes.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const verifyAuth = useAuthStore((state) => state.verifyAuth);

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  return <>{children}</>;
}

/**
 * Hook useAuth conectado reactivamente a los selectores atómicos de Zustand
 */
export function useAuth(): AuthContextType {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const loading = useAuthStore((state) => state.loading);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);

  return {
    user,
    token,
    loading,
    login: (email: string, password: string): Promise<User> => login(email, password),
    logout,
  };
}

export default AuthProvider;
