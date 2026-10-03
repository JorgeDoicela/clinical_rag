import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { telemetry } from '../core/observability/telemetry';
import { httpClient } from '../core/http/httpClient';

describe('Observabilidad Forense de Usuario Real (RUM) y Telemetría Distribuida (Fase 16)', () => {
  beforeEach(() => {
    telemetry.resetBuffer();
    telemetry.init({
      appName: 'ateneo-frontend',
      appVersion: '1.0.0',
      sampleRate: 1.0,
      flushIntervalMs: 0 // deshabilitar timer en tests
    });
    localStorage.clear();
  });

  afterEach(() => {
    telemetry.destroy();
    vi.restoreAllMocks();
  });

  it('1. Recopila metadatos contextuales del entorno del dispositivo y condiciones de red', () => {
    localStorage.setItem('ateneo_active_tenant', 'uce');
    localStorage.setItem('ateneo_locale', 'es-EC');

    const context = telemetry.getDeviceContext();

    expect(context.appName).toBe('ateneo-frontend');
    expect(context.appVersion).toBe('1.0.0');
    expect(context.tenantId).toBe('uce');
    expect(context.locale).toBe('es-EC');
    expect(typeof context.isOnline).toBe('boolean');
    expect(context.viewport).toBeDefined();
    expect(context.viewport.width).toBeGreaterThan(0);
    expect(context.timestamp).toBeGreaterThan(0);
  });

  it('2. Genera cabeceras de trazabilidad distribuida W3C (traceparent) y X-Request-ID para correlación con backend', () => {
    const headers = telemetry.getTraceHeaders();

    // Verificación de X-Request-ID
    expect(headers['X-Request-ID']).toBeDefined();
    expect(headers['X-Request-ID']).toMatch(/^req-[a-f0-9]{16}$/);

    // Verificación de W3C traceparent (versión 00, trace-id de 32 hex, span-id de 16 hex, flags 01)
    expect(headers['traceparent']).toBeDefined();
    expect(headers['traceparent']).toMatch(/^00-[a-f0-9]{32}-[a-f0-9]{16}-01$/);

    // Metadatos de contexto
    expect(headers['X-Tenant-ID']).toBe('default');
    expect(headers['X-Locale']).toBe('es-EC');
  });

  it('3. Inyecta automáticamente cabeceras de trazabilidad distribuida en las peticiones de httpClient', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ping: 'pong' })
      } as unknown as Response)
    );

    await httpClient.get('/health/live');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledOptions = fetchSpy.mock.calls[0][1];
    const calledHeaders = calledOptions?.headers as Record<string, string>;

    expect(calledHeaders['X-Request-ID']).toMatch(/^req-[a-f0-9]{16}$/);
    expect(calledHeaders['traceparent']).toMatch(/^00-[a-f0-9]{32}-[a-f0-9]{16}-01$/);
    expect(calledHeaders['X-Tenant-ID']).toBeDefined();
    expect(calledHeaders['X-Locale']).toBeDefined();
  });

  it('4. Registra métricas de Core Web Vitals clasificando automáticamente su desempeño perceptual', () => {
    // LCP óptimo (<= 2500ms)
    telemetry.recordMetric('LCP', 1450);
    // CLS crítico (> 0.25)
    telemetry.recordMetric('CLS', 0.35);
    // TTFB bueno (<= 800ms)
    telemetry.recordMetric('TTFB', 320);

    const buffer = telemetry.getBuffer();
    expect(buffer.metrics.length).toBe(3);

    const lcp = buffer.metrics.find((m) => m.name === 'LCP');
    expect(lcp?.rating).toBe('good');
    expect(lcp?.value).toBe(1450);

    const cls = buffer.metrics.find((m) => m.name === 'CLS');
    expect(cls?.rating).toBe('poor');
    expect(cls?.value).toBe(0.35);

    const ttfb = buffer.metrics.find((m) => m.name === 'TTFB');
    expect(ttfb?.rating).toBe('good');
  });

  it('5. Captura y encola excepciones globales no controladas y rechazos de promesas', () => {
    // Simular error de ejecución
    telemetry.recordError({
      message: 'Uncaught TypeError: Cannot read property of undefined',
      stack: 'TypeError at DicomStudyViewer.tsx:120',
      source: 'DicomStudyViewer.tsx',
      lineno: 120,
      colno: 15,
      type: 'error',
      timestamp: Date.now()
    });

    // Simular promesa rechazada
    telemetry.recordError({
      message: 'Failed to fetch WADO-RS DICOM frame',
      type: 'unhandledrejection',
      timestamp: Date.now()
    });

    const buffer = telemetry.getBuffer();
    expect(buffer.errors.length).toBe(2);
    expect(buffer.errors[0].type).toBe('error');
    expect(buffer.errors[0].message).toContain('Cannot read property');
    expect(buffer.errors[1].type).toBe('unhandledrejection');
    expect(buffer.errors[1].message).toContain('Failed to fetch');
  });

  it('6. Descarga y vacía atómicamente el buffer de telemetría mediante flush()', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve({ ok: true, status: 200 } as unknown as Response)
    );

    // Cargar métricas y errores
    telemetry.recordMetric('LCP', 2100);
    telemetry.recordError({
      message: 'Simulated Network Glitch',
      type: 'error',
      timestamp: Date.now()
    });

    expect(telemetry.getBuffer().metrics.length).toBe(1);
    expect(telemetry.getBuffer().errors.length).toBe(1);

    const flushed = telemetry.flush();
    expect(flushed).toBe(true);

    // El buffer debe quedar limpio tras el volcado
    expect(telemetry.getBuffer().metrics.length).toBe(0);
    expect(telemetry.getBuffer().errors.length).toBe(0);

    // Se debe haber emitido la petición con la carga útil
    expect(fetchSpy).toHaveBeenCalled();
  });
});
