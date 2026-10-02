import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../modules/auth/pages/Login';
import * as AuthContextModule from '../context/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null })
  };
});

describe('Página de Login (Google Accounts Pattern - Ateneo+)', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    mockLogin.mockReset();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      login: mockLogin,
      user: null
    });
  });

  it('debe renderizar el título de marca institucional y el campo de correo', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByText(/Accede a tu cuenta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Siguiente/i })).toBeInTheDocument();
  });

  it('debe avanzar al paso 2 de contraseña al ingresar un correo válido', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/Correo electrónico/i);
    fireEvent.change(emailInput, { target: { value: 'alumno@ateneo.edu.ec' } });

    const nextButton = screen.getByRole('button', { name: /Siguiente/i });
    fireEvent.click(nextButton);

    expect(screen.getByLabelText(/Contraseña de acceso/i)).toBeInTheDocument();
    expect(screen.getByText('alumno@ateneo.edu.ec')).toBeInTheDocument();
  });

  it('debe ejecutar el inicio de sesión y redirigir al resolver correctamente', async () => {
    mockLogin.mockResolvedValue({ id: 'usr_01', rol: 'alumno' });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    // Paso 1: Correo
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), {
      target: { value: 'alumno@ateneo.edu.ec' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Paso 2: Contraseña
    fireEvent.change(screen.getByLabelText(/Contraseña de acceso/i), {
      target: { value: 'Alumno123!' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('alumno@ateneo.edu.ec', 'Alumno123!');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('debe mostrar mensaje de error cuando las credenciales son incorrectas', async () => {
    mockLogin.mockRejectedValue(new Error('Credenciales incorrectas'));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    // Paso 1
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), {
      target: { value: 'alumno@ateneo.edu.ec' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Paso 2
    fireEvent.change(screen.getByLabelText(/Contraseña de acceso/i), {
      target: { value: 'password_erroneo' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Credenciales incorrectas/i)).toBeInTheDocument();
    });
  });

  it('debe verificar la regla cardinal de CERO EMOJIS en la interfaz de login', () => {
    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(container.textContent || '')).toBe(false);
  });
});
