import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginApi, getMeApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ateneo_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      const storedToken = localStorage.getItem('ateneo_token');
      if (storedToken) {
        try {
          const userData = await getMeApi();
          setUser(userData);
          setToken(storedToken);
        } catch (err) {
          console.error("Sesión expirada:", err);
          logout();
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    }
    verifyAuth();
  }, []);

  const login = async (email, password) => {
    const data = await loginApi(email, password);
    localStorage.setItem('ateneo_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('ateneo_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }
  return context;
}
