import type { HttpResponse, RequestOptions } from '../../types';

export const getBaseApiUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined') {
    if (window.location.protocol === 'https:') {
      return '';
    }
    const host = window.location.hostname;
    return `http://${host}:8000`;
  }
  return 'http://localhost:8000';
};

export const API_URL: string = getBaseApiUrl();

export function getAuthHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('ateneo_token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export class HttpError extends Error {
  status: number;
  response?: { status: number; data: unknown };

  constructor(message: string, status: number, responseData?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    if (responseData !== undefined) {
      this.response = { status, data: responseData };
    }
  }
}

/**
 * Cliente HTTP Core Unificado para Ateneo+
 * Gestiona inyección de Bearer Token JWT, serialización automática y manejo de errores normalizado.
 */
export class HttpClient {
  private baseUrl?: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl;
  }

  getBaseUrl(): string {
    return this.baseUrl || getBaseApiUrl();
  }

  async request<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    const base = this.getBaseUrl();
    const normalizedEndpoint = endpoint.startsWith('/api')
      ? endpoint
      : endpoint.startsWith('/')
        ? `/api${endpoint}`
        : `/api/${endpoint}`;

    const url = `${base}${normalizedEndpoint}`;
    const initialHeaders: Record<string, string> = (options.headers as Record<string, string>) || {};
    const headers = getAuthHeaders(initialHeaders);

    if (!(options.body instanceof FormData) && !headers['Content-Type'] && options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorData = (await res.json().catch(() => ({}))) as { detail?: string };
      const message = errorData.detail || `Error HTTP ${res.status}: ${res.statusText}`;
      throw new HttpError(message, res.status, errorData);
    }

    if (options.responseType === 'blob') {
      const blobData = (await res.blob()) as unknown as T;
      return { data: blobData, status: res.status, ok: res.ok };
    }

    const data = (await res.json().catch(() => ({}))) as T;
    return { data, status: res.status, ok: res.ok };
  }

  get<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = unknown>(endpoint: string, body?: unknown, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    const serializedBody = body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined);
    return this.request<T>(endpoint, { ...options, method: 'POST', body: serializedBody });
  }

  put<T = unknown>(endpoint: string, body?: unknown, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    const serializedBody = body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined);
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: serializedBody });
  }

  delete<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const httpClient = new HttpClient();
export default httpClient;
