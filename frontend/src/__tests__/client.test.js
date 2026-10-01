import { describe, it, expect, vi, beforeEach } from 'vitest';
import client, {
  getAuthHeaders,
  loginApi,
  getMeApi,
  getUsersApi,
  fetchCases,
  fetchCaseById,
  evaluateResponse
} from '../api/client';

describe('Servicio API Client (Ateneo+)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('getAuthHeaders debe adjuntar Authorization Bearer cuando existe token', () => {
    localStorage.setItem('ateneo_token', 'test-jwt-token-123');
    const headers = getAuthHeaders({ 'X-Custom': 'val' });
    expect(headers['Authorization']).toBe('Bearer test-jwt-token-123');
    expect(headers['X-Custom']).toBe('val');
  });

  it('getAuthHeaders no debe incluir Authorization si no hay token', () => {
    const headers = getAuthHeaders();
    expect(headers['Authorization']).toBeUndefined();
  });

  it('loginApi debe enviar credenciales y retornar token y usuario', async () => {
    const mockResponse = {
      access_token: 'fake-token',
      token_type: 'bearer',
      user: { id: 'usr_01', email: 'alumno@ateneo.edu.ec', rol: 'alumno' }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const res = await loginApi('alumno@ateneo.edu.ec', 'Secret123!');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/login'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alumno@ateneo.edu.ec', password: 'Secret123!' })
      })
    );
    expect(res.access_token).toBe('fake-token');
    expect(res.user.rol).toBe('alumno');
  });

  it('loginApi debe lanzar error si las credenciales son inválidas', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Credenciales inválidas' })
    });

    await expect(loginApi('wrong@test.com', 'badpass')).rejects.toThrow('Credenciales inválidas');
  });

  it('fetchCases debe listar los casos clínicos disponibles', async () => {
    const mockCases = [
      { id: 'case_01', titulo: 'Caso Dengue' },
      { id: 'case_02', titulo: 'Caso Hipertensión' }
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCases
    });

    const cases = await fetchCases();
    expect(cases).toHaveLength(2);
    expect(cases[0].id).toBe('case_01');
  });

  it('evaluateResponse debe construir FormData adecuadamente con imágenes', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ score: 9.0, aciertos: ['Diagnóstico certero'] })
    });

    const fakeFile = new File(['fake data'], 'ecg.png', { type: 'image/png' });
    const res = await evaluateResponse('case_01', 'Sospecha de infarto', [fakeFile]);

    expect(global.fetch).toHaveBeenCalled();
    const fetchArgs = global.fetch.mock.calls[0];
    const body = fetchArgs[1].body;
    expect(body instanceof FormData).toBe(true);
    expect(body.get('case_id')).toBe('case_01');
    expect(body.get('respuesta_estudiante')).toBe('Sospecha de infarto');
    expect(res.score).toBe(9.0);
  });

  it('client.get normaliza la ruta y devuelve { data, status, ok }', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' })
    });

    const res = await client.get('/health');
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('ok');
  });
});
