const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchCases() {
  const res = await fetch(`${API_URL}/api/cases`);
  if (!res.ok) {
    throw new Error('Error al cargar la lista de casos clínicos.');
  }
  return res.json();
}

export async function fetchCaseById(caseId) {
  const res = await fetch(`${API_URL}/api/cases/${caseId}`);
  if (!res.ok) {
    throw new Error(`Error al obtener el caso clínico ${caseId}.`);
  }
  return res.json();
}

/**
 * Envía la respuesta del estudiante al backend usando multipart/form-data.
 * Soporta imagen clínica opcional (File object).
 */
export async function evaluateResponse(caseId, respuestaEstudiante, imagen = null) {
  const formData = new FormData();
  formData.append('case_id', caseId);
  formData.append('respuesta_estudiante', respuestaEstudiante);

  if (imagen) {
    formData.append('imagen', imagen, imagen.name);
  }

  const res = await fetch(`${API_URL}/api/evaluate`, {
    method: 'POST',
    body: formData,
    // No establecer Content-Type: el navegador lo pone automáticamente con el boundary correcto
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Error durante el proceso de evaluación.');
  }

  return res.json();
}
