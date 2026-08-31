export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function getAuthHeaders(headers = {}) {
  const token = localStorage.getItem('ateneo_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function loginApi(email, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Error al iniciar sesión. Verifique sus credenciales.');
  }
  return res.json();
}

export async function getMeApi() {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error('Sesión no válida o expirada.');
  }
  return res.json();
}

export async function getUsersApi() {
  const res = await fetch(`${API_URL}/api/auth/users`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error('No tiene permisos para ver los usuarios del sistema.');
  }
  return res.json();
}

export async function fetchCases() {
  const res = await fetch(`${API_URL}/api/cases`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error('Error al cargar la lista de casos clínicos.');
  }
  return res.json();
}

export async function fetchCaseById(caseId) {
  const res = await fetch(`${API_URL}/api/cases/${caseId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Error al obtener el caso clínico ${caseId}.`);
  }
  return res.json();
}

/**
 * Evalúa la respuesta del estudiante enviando el razonamiento y opcionalmente
 * múltiples estudios diagnósticos simultáneos (ECG, Rx, Labs, etc.).
 *
 * @param {string} caseId - ID del caso clínico
 * @param {string} respuestaEstudiante - Texto libre del razonamiento clínico
 * @param {File|File[]|null} imagenes - Archivo único (backward compat) o array de archivos
 */
export async function evaluateResponse(caseId, respuestaEstudiante, imagenes = null) {
  const formData = new FormData();
  formData.append('case_id', caseId);
  formData.append('respuesta_estudiante', respuestaEstudiante);

  // Soporte de imagen singular (backward compat) o array de imágenes
  if (imagenes) {
    const imagenesArray = Array.isArray(imagenes) ? imagenes : [imagenes];
    imagenesArray.forEach((img) => {
      formData.append('imagenes', img, img.name);
    });
  }

  const res = await fetch(`${API_URL}/api/evaluate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Error durante el proceso de evaluación.');
  }

  return res.json();
}

/**
 * Evalúa un hito clínico específico en el modo de simulación secuencial por fases.
 *
 * @param {string} caseId - ID del caso clínico
 * @param {number} faseNumero - Número de fase (1, 2 o 3)
 * @param {string} respuestaEstudiante - Respuesta del estudiante para esta fase
 * @param {string} historialPrevio - Contexto de respuestas de fases anteriores
 * @param {File|File[]|null} imagenes - Estudios o imágenes adjuntas en esta fase
 */
export async function evaluatePhase(caseId, faseNumero, respuestaEstudiante, historialPrevio = '', imagenes = null) {
  const formData = new FormData();
  formData.append('case_id', caseId);
  formData.append('fase_numero', faseNumero.toString());
  formData.append('respuesta_estudiante', respuestaEstudiante);
  formData.append('historial_previo', historialPrevio);

  if (imagenes) {
    const imagenesArray = Array.isArray(imagenes) ? imagenes : [imagenes];
    imagenesArray.forEach((img) => {
      formData.append('imagenes', img, img.name);
    });
  }

  const res = await fetch(`${API_URL}/api/evaluate/phase`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error al evaluar la fase ${faseNumero}.`);
  }

  return res.json();
}

/**
 * Obtiene la recomendación adaptativa proactiva basada en KST y BKT.
 */
export async function fetchAdaptiveNextCase(studentId = null) {
  const query = studentId ? `?student_id=${encodeURIComponent(studentId)}` : '';
  const res = await fetch(`${API_URL}/api/adaptive/next-case${query}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Error al obtener la recomendación adaptativa.');
  }
  return res.json();
}

/**
 * Obtiene el estado continuo de dominio del grafo de competencias clínicas KST.
 */
export async function fetchKnowledgeState(studentId = null) {
  const query = studentId ? `?student_id=${encodeURIComponent(studentId)}` : '';
  const res = await fetch(`${API_URL}/api/adaptive/knowledge-state${query}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Error al obtener el estado de conocimiento.');
  }
  return res.json();
}

/**
 * Obtiene la trayectoria longitudinal de aprendizaje BKT.
 */
export async function fetchLearningPath(studentId = null) {
  const query = studentId ? `?student_id=${encodeURIComponent(studentId)}` : '';
  const res = await fetch(`${API_URL}/api/adaptive/learning-path${query}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Error al obtener la trayectoria de aprendizaje.');
  }
  return res.json();
}

/**
 * Cliente HTTP unificado con sintaxis axios-like (client.get, client.post)
 * para los componentes de dashboard, visor de PDFs y benchmark.
 */

const client = {
  async request(endpoint, options = {}) {
    const normalizedEndpoint = endpoint.startsWith('/api') 
      ? endpoint 
      : endpoint.startsWith('/') 
        ? `/api${endpoint}` 
        : `/api/${endpoint}`;

    const url = `${API_URL}${normalizedEndpoint}`;
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
      err.response = { status: res.status, data: errorData };
      throw err;
    }

    if (options.responseType === 'blob') {
      const blobData = await res.blob();
      return { data: blobData, status: res.status, ok: res.ok };
    }

    const data = await res.json().catch(() => ({}));
    return { data, status: res.status, ok: res.ok };
  },

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint, body, options = {}) {
    const serializedBody = body instanceof FormData ? body : JSON.stringify(body);
    return this.request(endpoint, { ...options, method: 'POST', body: serializedBody });
  },

  put(endpoint, body, options = {}) {
    const serializedBody = body instanceof FormData ? body : JSON.stringify(body);
    return this.request(endpoint, { ...options, method: 'PUT', body: serializedBody });
  },

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
};

export default client;
