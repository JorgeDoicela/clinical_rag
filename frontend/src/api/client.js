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

export async function evaluateResponse(caseId, respuestaEstudiante) {
  const res = await fetch(`${API_URL}/api/evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      case_id: caseId,
      respuesta_estudiante: respuestaEstudiante,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Error durante el proceso de evaluación.');
  }

  return res.json();
}
