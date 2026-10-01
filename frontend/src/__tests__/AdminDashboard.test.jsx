import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AdminDashboard from '../pages/AdminDashboard';
import * as clientModule from '../api/client';

describe('Página AdminDashboard (Gestión y Seguridad RBAC)', () => {
  const mockUsers = [
    { id: 'usr_01', nombre: 'Dr. Carlos Andrade', email: 'docente@ateneo.edu.ec', rol: 'docente' },
    { id: 'usr_02', nombre: 'María Silva', email: 'alumno@ateneo.edu.ec', rol: 'alumno' },
    { id: 'usr_03', nombre: 'Admin Master', email: 'admin@ateneo.edu.ec', rol: 'administrador' },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('debe listar los usuarios y sus roles asignados', async () => {
    vi.spyOn(clientModule, 'getUsersApi').mockResolvedValue(mockUsers);

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Panel de Administración')).toBeInTheDocument();
      expect(screen.getByText('María Silva')).toBeInTheDocument();
      expect(screen.getByText('Dr. Carlos Andrade')).toBeInTheDocument();
      expect(screen.getByText('Admin Master')).toBeInTheDocument();
    });
  });

  it('debe mostrar mensaje descriptivo en caso de error de red', async () => {
    vi.spyOn(clientModule, 'getUsersApi').mockRejectedValue(new Error('Fallo en el servidor de identidades'));

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Fallo en el servidor de identidades/i)).toBeInTheDocument();
    });
  });

  it('debe volver a cargar usuarios al pulsar el botón de actualizar cuentas', async () => {
    const mockGetUsers = vi.spyOn(clientModule, 'getUsersApi').mockResolvedValue(mockUsers);

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Actualizar Cuentas')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Actualizar Cuentas'));
    await waitFor(() => {
      expect(mockGetUsers).toHaveBeenCalledTimes(2);
    });
  });
});
