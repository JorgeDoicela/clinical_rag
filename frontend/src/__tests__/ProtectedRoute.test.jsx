import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../modules/auth/components/ProtectedRoute';
import * as AuthContextModule from '../context/AuthContext';

describe('Componente ProtectedRoute (Seguridad RBAC)', () => {
  it('debe mostrar pantalla de carga mientras loading sea true', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      loading: true
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Contenido Protegido</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText(/Verificando sesión y permisos/i)).toBeInTheDocument();
  });

  it('debe redirigir al login si no existe usuario autenticado', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      loading: false
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Página de Login</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Contenido Privado</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Página de Login')).toBeInTheDocument();
  });

  it('debe denegar el acceso si el rol del usuario no está autorizado', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: 'usr_01', rol: 'alumno' },
      loading: false
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/" element={<div>Inicio</div>} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['administrador']}>
                <div>Panel Admin Secreto</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Panel Admin Secreto')).not.toBeInTheDocument();
  });

  it('debe permitir el acceso si el usuario cuenta con el rol requerido', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: 'usr_02', rol: 'docente' },
      loading: false
    });

    render(
      <MemoryRouter initialEntries={['/docente']}>
        <Routes>
          <Route
            path="/docente"
            element={
              <ProtectedRoute allowedRoles={['docente']}>
                <div>Panel Docente Autorizado</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Panel Docente Autorizado')).toBeInTheDocument();
  });
});
