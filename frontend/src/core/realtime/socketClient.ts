export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';

export type SocketEventHandler = (payload: any) => void;

export interface AteneoSocketMessage {
  type: string;
  payload?: any;
}

export interface AteneoUserMeta {
  user_id?: string;
  nombre?: string;
  email?: string;
  rol?: string;
}

/**
 * Cliente WebSocket resiliente para Salas de Ateneo+ con reconexión exponencial,
 * latidos de presencia (heartbeat) y tolerancia a fallos de red.
 */
export class AteneoSocketClient {
  private ws: WebSocket | null = null;
  private roomCode: string | null = null;
  private userMeta: AteneoUserMeta | null = null;
  private status: ConnectionStatus = 'DISCONNECTED';
  private eventHandlers: Map<string, Set<SocketEventHandler>> = new Map();
  private statusHandlers: Set<(status: ConnectionStatus) => void> = new Set();
  
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 6;
  private baseReconnectDelay = 1000;
  private isIntentionallyClosed = false;

  constructor() {
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange() {
    // Si la pestaña vuelve a primer plano y el socket estaba caído, reintentar conexión
    if (document.visibilityState === 'visible' && this.status === 'DISCONNECTED' && this.roomCode && !this.isIntentionallyClosed) {
      this.reconnectAttempts = 0;
      this.initConnection();
    }
  }

  private getWebSocketUrl(roomCode: string): string {
    const rawApiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
    const parsed = new URL(rawApiUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');
    const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${parsed.host}/api/ateneo/ws/${roomCode}`;
  }

  public connect(roomCode: string, userMeta?: AteneoUserMeta): void {
    this.roomCode = roomCode;
    this.userMeta = userMeta || null;
    this.isIntentionallyClosed = false;
    this.reconnectAttempts = 0;
    this.initConnection();
  }

  private initConnection(): void {
    if (!this.roomCode || this.isIntentionallyClosed) return;

    this.clearTimers();
    this.setStatus(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

    try {
      const url = this.getWebSocketUrl(this.roomCode);
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.setStatus('CONNECTED');
        this.reconnectAttempts = 0;
        this.startHeartbeat();

        // Enviar identificación de presencia inicial
        if (this.userMeta) {
          this.send('IDENTIFY', this.userMeta);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message: AteneoSocketMessage = JSON.parse(event.data);
          this.dispatch(message.type, message.payload);
        } catch (e) {
          console.error('[WS Client] Error parseando mensaje entrante:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WS Client] Error en canal WebSocket:', err);
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.ws = null;

        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect();
        } else {
          this.setStatus('DISCONNECTED');
        }
      };
    } catch (e) {
      console.error('[WS Client] Excepción al inicializar WebSocket:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus('DISCONNECTED');
      this.dispatch('RECONNECT_FAILED', {
        attempts: this.reconnectAttempts,
        reason: 'Se superó el límite máximo de reintentos de conexión.',
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.baseReconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 12000);
    this.setStatus('RECONNECTING');

    this.reconnectTimeout = setTimeout(() => {
      this.initConnection();
    }, delay);
    if (typeof (this.reconnectTimeout as any)?.unref === 'function') {
      (this.reconnectTimeout as any).unref();
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.status === 'CONNECTED' && this.ws?.readyState === WebSocket.OPEN) {
        this.send('PING', { timestamp: Date.now() });
      }
    }, 20000);
    if (typeof (this.heartbeatInterval as any)?.unref === 'function') {
      (this.heartbeatInterval as any).unref();
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private clearTimers(): void {
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  public send(type: string, payload?: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type, payload }));
        return true;
      } catch (e) {
        console.error('[WS Client] Error al enviar mensaje:', e);
      }
    }
    return false;
  }

  public on(eventType: string, handler: SocketEventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);

    // Retorna función de desuscripción limpia
    return () => {
      this.off(eventType, handler);
    };
  }

  public off(eventType: string, handler: SocketEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventType);
      }
    }
  }

  public onStatusChange(handler: (status: ConnectionStatus) => void): () => void {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  private setStatus(newStatus: ConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusHandlers.forEach((handler) => handler(this.status));
    }
  }

  private dispatch(type: string, payload: any): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[WS Client] Error ejecutando handler para evento '${type}':`, err);
        }
      });
    }
  }

  public disconnect(): void {
    this.isIntentionallyClosed = true;
    this.clearTimers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('DISCONNECTED');
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public destroy(): void {
    this.disconnect();
    this.eventHandlers.clear();
    this.statusHandlers.clear();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }
}

// Instancia singleton por defecto
export const ateneoSocketClient = new AteneoSocketClient();
