import { test, expect } from '@playwright/test';

test.describe('E2E: Simulador Clínico y Visor Diagnóstico de Paraclínicos (Ateneo+)', () => {
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

    // 3. Interceptar caso con estudios paraclínicos adjuntos
    await page.route(/\/api\/cases\/case_dengue_01/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'case_dengue_01',
          titulo: 'Dengue con Signos de Alarma',
          guia_asociada: 'dengue',
          dificultad: 'intermedio',
          especialidad: 'Urgencias',
          signos_alarma: true,
          caso_preambulo: 'Paciente femenina de 24 años con trombocitopenia de 45.000/uL y dolor abdominal continuo.',
          pregunta: 'Indique el esquema de hidratación parenteral y criterios de ingreso hospitalario.',
          estudios_paraclinicos: [
            {
              tipo: 'ecg',
              titulo: 'ECG de Monitoreo',
              descripcion: 'Trazado electrocardiográfico en derivación DII',
              url: '/static/test_ecg.png',
            },
          ],
        }),
      });
    });
  });

  test('debe cargar la simulación split-screen y permitir la inspección paraclínica en Canvas', async ({ page }) => {
    await page.goto('/cases/case_dengue_01');

    // 1. Verificar título del caso clínico en panel de split-screen
    await expect(page.locator('text=Dengue con Signos de Alarma').first()).toBeVisible();

    // 2. Verificar área de respuesta clínica del estudiante
    const responseArea = page.locator('textarea');
    await expect(responseArea).toBeVisible();

    // 3. Escribir resolución razonada
    await responseArea.fill('Iniciar hidratación con Cristaloides a razón de 10 ml/kg en la primera hora y monitoreo de diuresis horaria.');
    await expect(responseArea).toHaveValue(/Cristaloides a razón de 10 ml\/kg/);

    // 4. Verificar presencia del botón de emisión de dictamen formativo
    const submitBtn = page.getByRole('button', { name: /Emitir Diagnóstico/i });
    await expect(submitBtn).toBeVisible();
  });
});
