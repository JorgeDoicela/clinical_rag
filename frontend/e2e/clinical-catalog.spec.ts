import { test, expect } from '@playwright/test';

test.describe('E2E: Catálogo Clínico y Navegación Diagnóstica (Ateneo+)', () => {
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

    // 3. Interceptar catálogo de casos clínicos
    await page.route(/\/api\/cases(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'case_dengue_01',
            titulo: 'Dengue con Signos de Alarma en Paciente Femenina',
            guia_asociada: 'dengue',
            dificultad: 'intermedio',
            especialidad: 'Urgencias',
            signos_alarma: true,
            caso_preambulo: 'Paciente femenina de 24 años con fiebre alta y dolor retroocular',
            pregunta: '¿Cuál es la conducta terapéutica y monitoreo prioritario?',
          },
          {
            id: 'case_preeclampsia_01',
            titulo: 'Preeclampsia con Criterios de Severidad en Primigesta',
            guia_asociada: 'preeclampsia',
            dificultad: 'avanzado',
            especialidad: 'Gineco-Obstetricia',
            signos_alarma: true,
            caso_preambulo: 'Primigesta de 34 semanas con cifras tensionales de 160/110 mmHg',
            pregunta: '¿Cuál es el esquema farmacológico neuroprotector según la GPC?',
          },
        ]),
      });
    });

    await page.route(/\/api\/adaptive\/next-case/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          case_id: 'case_dengue_01',
          titulo: 'Dengue con Signos de Alarma',
          justificacion_pedagogica: 'Refuerzo de sospecha nosológica en ZDP.',
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

  test('debe renderizar el catálogo con navbar, estado de conectividad y buscador', async ({ page }) => {
    await page.goto('/');

    // 1. Navbar y Píldora de Conectividad
    await expect(page.locator('text=ATENEO+').first()).toBeVisible();
    
    // 2. Tarjetas de Casos Clínicos
    await expect(page.locator('text=Dengue con Signos de Alarma').first()).toBeVisible();
    await expect(page.locator('text=Preeclampsia con Criterios de Severidad').first()).toBeVisible();

    // 3. Filtrado por término de búsqueda (en viewports desktop md+)
    const isMobile = page.viewportSize() ? (page.viewportSize()!.width < 768) : false;
    if (!isMobile) {
      const searchBar = page.getByPlaceholder(/Buscar en Ateneo/i);
      await expect(searchBar).toBeVisible();
      await searchBar.fill('Preeclampsia');
      await expect(page.locator('text=Preeclampsia con Criterios de Severidad').first()).toBeVisible();
      await expect(page.locator('text=Dengue con Signos de Alarma')).not.toBeVisible();
    }
  });
});
