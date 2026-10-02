import { getBaseApiUrl, getAuthHeaders } from './httpClient';

export interface StreamEventPayload {
  token?: string;
  event?: string;
  guia?: string;
  pagina?: number;
  error?: string;
  done?: boolean;
  cita_normativa?: {
    guia: string;
    pagina: number;
  };
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onStart?: (metadata: { guia?: string; pagina?: number }) => void;
  onComplete: (fullText: string, metadata?: { cita_normativa?: { guia: string; pagina: number } }) => void;
  onError: (error: Error) => void;
}

/**
 * Cliente para consumo resiliente de Server-Sent Events (SSE) y Streaming HTTP.
 * Procesa chunks continuos mediante ReadableStream y decodificador UTF-8 en tiempo real.
 */
export async function streamSocraticTurn(
  endpoint: string,
  payload: Record<string, unknown>,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const base = getBaseApiUrl();
  const normalizedEndpoint = endpoint.startsWith('/api')
    ? endpoint
    : endpoint.startsWith('/')
      ? `/api${endpoint}`
      : `/api/${endpoint}`;

  const url = `${base}${normalizedEndpoint}`;
  const initialHeaders = getAuthHeaders({
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: initialHeaders,
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const message = (errorJson as { detail?: string }).detail || `Error HTTP ${response.status}: ${response.statusText}`;
      throw new Error(message);
    }

    if (!response.body) {
      throw new Error('El servidor no retornó un flujo de datos legible (ReadableStream).');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulatedText = '';
    let buffer = '';
    let metadata: { cita_normativa?: { guia: string; pagina: number } } | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const dataStr = trimmed.replace(/^data:\s*/, '');
        try {
          const parsed = JSON.parse(dataStr) as StreamEventPayload;

          if (parsed.event === 'start' && callbacks.onStart) {
            callbacks.onStart({ guia: parsed.guia, pagina: parsed.pagina });
          }

          if (parsed.token) {
            accumulatedText += parsed.token;
            callbacks.onToken(parsed.token);
          }

          if (parsed.error) {
            throw new Error(parsed.error);
          }

          if (parsed.done) {
            if (parsed.cita_normativa) {
              metadata = { cita_normativa: parsed.cita_normativa };
            }
          }
        } catch (parseError) {
          // Ignorar fragmentos parciales no JSON
        }
      }
    }

    callbacks.onComplete(accumulatedText, metadata);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return;
    }
    const errorInstance = err instanceof Error ? err : new Error(String(err));
    callbacks.onError(errorInstance);
  }
}
