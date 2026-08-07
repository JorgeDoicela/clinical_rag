const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getAuthHeaders(headers = {}) {
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

export async function evaluateResponse(caseId, respuestaEstudiante, imagen = null) {
  const formData = new FormData();
  formData.append('case_id', caseId);
  formData.append('respuesta_estudiante', respuestaEstudiante);

  if (imagen) {
    formData.append('imagen', imagen, imagen.name);
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
