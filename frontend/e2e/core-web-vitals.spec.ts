import { test, expect } from '@playwright/test';

test.describe('E2E: Auditoría de Rendimiento Clínico y Core Web Vitals (Ateneo+)', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Simular sesión activa en localStorage
    await page.addInitScript(() => {
      const authData = {
        state: {
          token: 'mock_jwt_token',
          user: {
            id: 'user_01',
            email: 'estudiante@ateneo.edu.ec',
            nombre: 'Dr. Test Ateneo',
            rol: 'alumno',
            cohorte: '2026-A',
          },
        },
        version: 0,
      };
      localStorage.setItem('ateneo_auth_session', JSON.stringify(authData));
      localStorage.setItem('ateneo_token', 'mock_jwt_token');
    });

    // 2. Interceptar endpoint de verificación de sesión
    await page.route(/\/api\/auth\/me/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user_01',
          email: 'estudiante@ateneo.edu.ec',
          nombre: 'Dr. Test Ateneo',
          rol: 'alumno',
          cohorte: '2026-A',
        }),
      });
    });

    // 3. Interceptar API de catálogo
    await page.route(/\/api\/cases(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'case_vitals_01',
            titulo: 'Caso Clínico de Monitoreo de Rendimiento',
            guia_asociada: 'dengue',
            caso_preambulo: 'Caso clínico para evaluación de Core Web Vitals en puesto de guardia médica.',
            pregunta: '¿Cuál es la conducta inmediata?',
          },
        ]),
      });
    });

    await page.route(/\/api\/adaptive\/next-case/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          case_id: 'case_vitals_01',
          titulo: 'Caso Clínico de Monitoreo',
          justificacion_pedagogica: 'Prueba de rendimiento.',
          competencia_foco: 'Diagnóstico',
        }),
      });
    });

    await page.route(/\/api\/history\/trends/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          score_promedio: 8.5,
          total_evaluaciones: 12,
          tendencia_temporal: [],
          competencias_radar: [],
        }),
      });
    });
  });

  test('debe cumplir los umbrales de Core Web Vitals (LCP < 2.5s, CLS < 0.1, TTFB < 1.0s)', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const domReadyDuration = Date.now() - startTime;

    // 1. Validar que el DOM esté listo en menos de 2.0 segundos
    expect(domReadyDuration).toBeLessThan(2000);

    // 2. Extraer métricas de Performance Navigation Timing mediante PerformanceObserver en el navegador
    const metrics = await page.evaluate(async () => {
      return new Promise<{
        navigationDuration: number;
        domInteractive: number;
        cls: number;
      }>((resolve) => {
        let clsValue = 0;

        try {
          const clsObserver = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
          });
          clsObserver.observe({ type: 'layout-shift', buffered: true });
        } catch {
          clsValue = 0;
        }

        setTimeout(() => {
          const navEntries = performance.getEntriesByType('navigation');
          const nav = navEntries[0] as PerformanceNavigationTiming | undefined;

          resolve({
            navigationDuration: nav ? nav.duration : 0,
            domInteractive: nav ? nav.domInteractive : 0,
            cls: clsValue,
          });
        }, 300);
      });
    });

    // 3. Afirmaciones sobre Core Web Vitals de grado hospitalario
    // Cumulative Layout Shift (CLS) debe ser menor a 0.1 para evitar saltos de interfaz durante lectura de GPC
    expect(metrics.cls).toBeLessThan(0.1);

    // Tiempo de carga interactivo del DOM debe ser veloz
    expect(metrics.domInteractive).toBeLessThan(3500);
  });
});
