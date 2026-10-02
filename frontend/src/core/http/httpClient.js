import { API_URL, getAuthHeaders } from '../../api/client';

/**
 * Cliente HTTP Core Unificado para Ateneo+
 * Gestiona inyección de Bearer Token JWT, serialización automática y manejo de errores normalizado.
 */
class HttpClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  getBaseUrl() {
    if (this.baseUrl) return this.baseUrl;
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
  }

  async request(endpoint, options = {}) {
    const base = this.getBaseUrl();
    const normalizedEndpoint = endpoint.startsWith('/api')
      ? endpoint
      : endpoint.startsWith('/')
        ? `/api${endpoint}`
        : `/api/${endpoint}`;

    const url = `${base}${normalizedEndpoint}`;
    const headers = getAuthHeaders(options.headers || {});

    if (!(options.body instanceof FormData) && !headers['Content-Type'] && options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const err = new Error(errorData.detail || `Error HTTP ${res.status}: ${res.statusText}`);
      err.status = res.status;
      err.response = { status: res.status, data: errorData };
      throw err;
    }

    if (options.responseType === 'blob') {
      const blobData = await res.blob();
      return { data: blobData, status: res.status, ok: res.ok };
    }

    const data = await res.json().catch(() => ({}));
    return { data, status: res.status, ok: res.ok };
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    const serializedBody = body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined);
    return this.request(endpoint, { ...options, method: 'POST', body: serializedBody });
  }

  put(endpoint, body, options = {}) {
    const serializedBody = body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined);
    return this.request(endpoint, { ...options, method: 'PUT', body: serializedBody });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const httpClient = new HttpClient();
export default httpClient;
