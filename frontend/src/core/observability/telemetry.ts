/**
 * Módulo de Observabilidad Forense de Usuario Real (RUM) y Telemetría Distribuida (Ateneo+)
 * Monitorea Core Web Vitals, excepciones no controladas y propaga W3C Trace Context (traceparent / X-Request-ID).
 * Diseñado bajo estándar Senior: cero parches, resiliencia ante entornos sin DOM y consumo de red ultraligero (< 2 kB).
 */

export interface CoreWebVitalMetric {
  name: 'LCP' | 'FID' | 'CLS' | 'INP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface TelemetryErrorEvent {
  message: string;
  stack?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  type: 'error' | 'unhandledrejection';
  timestamp: number;
}

export interface ClientDeviceContext {
  appName: string;
  appVersion: string;
  tenantId: string;
  locale: string;
  route: string;
  networkType: string;
  isOnline: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  viewport: { width: number; height: number };
  timestamp: number;
}

export interface TelemetryPayload {
  context: ClientDeviceContext;
  metrics: CoreWebVitalMetric[];
  errors: TelemetryErrorEvent[];
  traceId: string;
}

export interface TelemetryConfig {
  appName?: string;
  appVersion?: string;
  endpoint?: string;
  sampleRate?: number; // 0.0 a 1.0
  maxBufferErrors?: number;
  maxBufferMetrics?: number;
  flushIntervalMs?: number;
  enableBeacon?: boolean;
}

// Estado interno del observador forense
class RealUserMonitoring {
  private config: Required<TelemetryConfig>;
  private errorBuffer: TelemetryErrorEvent[] = [];
  private metricBuffer: CoreWebVitalMetric[] = [];
  private initialized = false;
  private currentTraceId: string;
  private timerId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.config = {
      appName: 'ateneo-frontend',
      appVersion: '1.0.0',
      endpoint: '/api/telemetry/rum',
      sampleRate: 1.0,
      maxBufferErrors: 50,
      maxBufferMetrics: 50,
      flushIntervalMs: 30000,
      enableBeacon: true
    };
    this.currentTraceId = this.generateRandomHex(32);
  }

  /**
   * Genera un identificador hexadecimal aleatorio para W3C Tracing
   */
  generateRandomHex(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(Math.ceil(length / 2));
      crypto.getRandomValues(bytes);
      result = Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, length);
    } else {
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    return result;
  }

  /**
   * Genera cabecera estándar de correlación W3C traceparent (versión-traceId-spanId-flags)
   */
  generateTraceparent(): string {
    const spanId = this.generateRandomHex(16);
    return `00-${this.currentTraceId}-${spanId}-01`;
  }

  /**
   * Genera un identificador X-Request-ID único para correlación con backend
   */
  generateRequestId(): string {
    return `req-${this.generateRandomHex(16)}`;
  }

  /**
   * Inyecta cabeceras de trazabilidad distribuida para solicitudes salientes
   */
  getTraceHeaders(): Record<string, string> {
    const tenantId = typeof localStorage !== 'undefined' ? localStorage.getItem('ateneo_active_tenant') || 'default' : 'default';
    const locale = typeof localStorage !== 'undefined' ? localStorage.getItem('ateneo_locale') || 'es-EC' : 'es-EC';

    return {
      'X-Request-ID': this.generateRequestId(),
      'traceparent': this.generateTraceparent(),
      'X-Tenant-ID': tenantId,
      'X-Locale': locale
    };
  }

  /**
   * Recopila metadatos del dispositivo del estudiante y condiciones de red hospitalaria
   */
  getDeviceContext(): ClientDeviceContext {
    const isBrowser = typeof window !== 'undefined';
    const nav = isBrowser ? navigator : ({} as Navigator);

    // Tipado seguro para Connection API
    const connection = (nav as unknown as { connection?: { effectiveType?: string } }).connection;
    const networkType = connection?.effectiveType || (nav.onLine ? 'wifi/ethernet' : 'offline');

    const tenantId = isBrowser && typeof localStorage !== 'undefined' 
      ? localStorage.getItem('ateneo_active_tenant') || 'default' 
      : 'default';

    const locale = isBrowser && typeof localStorage !== 'undefined' 
      ? localStorage.getItem('ateneo_locale') || 'es-EC' 
      : 'es-EC';

    const route = isBrowser ? window.location.pathname : '/';

    return {
      appName: this.config.appName,
      appVersion: this.config.appVersion,
      tenantId,
      locale,
      route,
      networkType,
      isOnline: typeof nav.onLine === 'boolean' ? nav.onLine : true,
      deviceMemory: (nav as unknown as { deviceMemory?: number }).deviceMemory,
      hardwareConcurrency: nav.hardwareConcurrency,
      viewport: {
        width: isBrowser ? window.innerWidth : 1280,
        height: isBrowser ? window.innerHeight : 720
      },
      timestamp: Date.now()
    };
  }

  /**
   * Registra una métrica de Core Web Vitals calculando su calificación cualitativa
   */
  recordMetric(name: CoreWebVitalMetric['name'], value: number): void {
    let rating: CoreWebVitalMetric['rating'] = 'good';

    switch (name) {
      case 'LCP':
        rating = value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
        break;
      case 'FID':
      case 'INP':
        rating = value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor';
        break;
      case 'CLS':
        rating = value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
        break;
      case 'TTFB':
        rating = value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
        break;
    }

    const metric: CoreWebVitalMetric = {
      name,
      value: Math.round(value * 100) / 100,
      rating,
      timestamp: Date.now()
    };

    if (this.metricBuffer.length >= this.config.maxBufferMetrics) {
      this.metricBuffer.shift();
    }
    this.metricBuffer.push(metric);
  }

  /**
   * Registra un error o excepción de Javascript no capturada
   */
  recordError(error: TelemetryErrorEvent): void {
    if (this.errorBuffer.length >= this.config.maxBufferErrors) {
      this.errorBuffer.shift();
    }
    this.errorBuffer.push(error);
  }

  /**
   * Inicializa los observadores de Core Web Vitals y oyentes globales de error
   */
  init(options: TelemetryConfig = {}): void {
    if (this.initialized) return;
    this.config = { ...this.config, ...options };

    if (typeof window === 'undefined') {
      this.initialized = true;
      return;
    }

    // 1. Escucha global de errores no capturados
    window.addEventListener('error', (event: ErrorEvent) => {
      this.recordError({
        message: event.message || 'Error de script no capturado',
        stack: event.error?.stack,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'error',
        timestamp: Date.now()
      });
    });

    // 2. Escucha de promesas rechazadas sin catch
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      this.recordError({
        message: typeof reason === 'string' ? reason : (reason?.message || 'Rechazo de promesa asíncrona no controlado'),
        stack: reason?.stack,
        type: 'unhandledrejection',
        timestamp: Date.now()
      });
    });

    // 3. Inicialización segura de PerformanceObserver para Core Web Vitals
    this.initPerformanceObservers();

    // 4. Temporizador de volcado periódico y eventos de ciclo de vida
    if (this.config.flushIntervalMs > 0) {
      this.timerId = setInterval(() => {
        this.flush();
      }, this.config.flushIntervalMs);
    }

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });

    window.addEventListener('pagehide', () => {
      this.flush();
    });

    this.initialized = true;
  }

  private initPerformanceObservers(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    // Observador para LCP (Largest Contentful Paint)
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.recordMetric('LCP', lastEntry.startTime);
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // Ignorar si el navegador no soporta LCP
    }

    // Observador para CLS (Cumulative Layout Shift)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const layoutShift = entry as unknown as { hadRecentInput?: boolean; value?: number };
          if (!layoutShift.hadRecentInput && typeof layoutShift.value === 'number') {
            clsValue += layoutShift.value;
          }
        }
        this.recordMetric('CLS', clsValue);
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {
      // Ignorar si el navegador no soporta layout-shift
    }

    // Observador para TTFB (Time To First Byte)
    try {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        const nav = navEntries[0] as PerformanceNavigationTiming;
        if (nav.responseStart > 0) {
          this.recordMetric('TTFB', nav.responseStart);
        }
      }
    } catch {
      // Ignorar si performance.getEntriesByType no está disponible
    }
  }

  /**
   * Vuelca la carga útil de telemetría hacia el servidor
   */
  flush(): boolean {
    if (this.errorBuffer.length === 0 && this.metricBuffer.length === 0) {
      return false;
    }

    const payload: TelemetryPayload = {
      context: this.getDeviceContext(),
      metrics: [...this.metricBuffer],
      errors: [...this.errorBuffer],
      traceId: this.currentTraceId
    };

    // Limpiar buffers
    this.metricBuffer = [];
    this.errorBuffer = [];

    if (typeof window === 'undefined') return true;

    const data = JSON.stringify(payload);

    // Prioridad 1: navigator.sendBeacon para descargas atómicas sin bloquear unload
    if (this.config.enableBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      try {
        const blob = new Blob([data], { type: 'application/json' });
        const sent = navigator.sendBeacon(this.config.endpoint, blob);
        if (sent) return true;
      } catch {
        // Fallback a fetch
      }
    }

    // Prioridad 2: fetch con flag keepalive
    if (typeof fetch !== 'undefined') {
      try {
        fetch(this.config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: data,
          keepalive: true
        }).catch(() => {
          // Ignorar fallos de red silenciosos en telemetría
        });
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }

  // Métodos de inspección para pruebas unitarias
  getBuffer(): { metrics: CoreWebVitalMetric[]; errors: TelemetryErrorEvent[] } {
    return {
      metrics: [...this.metricBuffer],
      errors: [...this.errorBuffer]
    };
  }

  resetBuffer(): void {
    this.metricBuffer = [];
    this.errorBuffer = [];
  }

  destroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.resetBuffer();
    this.initialized = false;
  }
}

// Instancia singleton de observabilidad forense
export const telemetry = new RealUserMonitoring();
export default telemetry;
