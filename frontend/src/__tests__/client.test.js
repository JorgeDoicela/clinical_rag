import { describe, it, expect, vi, beforeEach } from 'vitest';
import httpClient, { getAuthHeaders } from '../core/http/httpClient';
import { authApi } from '../modules/auth/api/authApi';
import { casesApi } from '../modules/cases/api/casesApi';
import { evaluationApi } from '../modules/evaluation/api/evaluationApi';

describe('Cliente HTTP Core y Capa de Red Modular (Ateneo+)', () => {
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

  it('authApi.login debe enviar credenciales y retornar token y usuario', async () => {
    const mockResponse = {
      access_token: 'fake-token',
      token_type: 'bearer',
      user: { id: 'usr_01', email: 'alumno@ateneo.edu.ec', rol: 'alumno' }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const res = await authApi.login('alumno@ateneo.edu.ec', 'Secret123!');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/login'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email: 'alumno@ateneo.edu.ec', password: 'Secret123!' })
      })
    );
    expect(res.access_token).toBe('fake-token');
    expect(res.user.rol).toBe('alumno');
  });

  it('authApi.login debe lanzar error tipado si las credenciales son inválidas', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ detail: 'Credenciales inválidas' })
    });

    await expect(authApi.login('wrong@test.com', 'badpass')).rejects.toThrow('Credenciales inválidas');
  });

  it('casesApi.getCases debe listar los casos clínicos disponibles', async () => {
    const mockCases = [
      { id: 'case_01', titulo: 'Caso Dengue' },
      { id: 'case_02', titulo: 'Caso Hipertensión' }
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCases
    });

    const cases = await casesApi.getCases();
    expect(cases).toHaveLength(2);
    expect(cases[0].id).toBe('case_01');
  });

  it('evaluationApi.evaluateDirect debe construir FormData adecuadamente con imágenes', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ score: 9.0, aciertos: ['Diagnóstico certero'] })
    });

    const fakeFile = new File(['fake data'], 'ecg.png', { type: 'image/png' });
    const res = await evaluationApi.evaluateDirect('case_01', 'Sospecha de infarto', [fakeFile]);

    expect(global.fetch).toHaveBeenCalled();
    const fetchArgs = global.fetch.mock.calls[0];
    const body = fetchArgs[1].body;
    expect(body instanceof FormData).toBe(true);
    expect(body.get('case_id')).toBe('case_01');
    expect(body.get('respuesta_estudiante')).toBe('Sospecha de infarto');
    expect(res.score).toBe(9.0);
  });

  it('httpClient.get normaliza la ruta y devuelve { data, status, ok }', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' })
    });

    const res = await httpClient.get('/health');
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('ok');
  });
});
