import { test, expect } from '@playwright/test';

test.describe('E2E: Flujo de Autenticación y Control de Acceso RBAC (Ateneo+)', () => {
  test('debe cargar la pantalla de login con diseño institucional y campos floating label', async ({ page }) => {
    await page.goto('/login');

    // Verificar marca institucional sobria sin emojis
    await expect(page.locator('text=Accede a tu cuenta').first()).toBeVisible();
    await expect(page.locator('text=Simulador Clínico & Evaluación con IA')).toBeVisible();

    // Verificar campo de correo electrónico
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('placeholder', 'Correo electrónico');

    // Ingresar correo y avanzar al paso de contraseña
    await emailInput.fill('estudiante@ateneo.edu.ec');
    const continueBtn = page.getByRole('button', { name: /Siguiente/i });
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();

    // Verificar aparición del campo de contraseña
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
  });

  test('debe redirigir a login al intentar acceder a rutas protegidas sin credenciales activas', async ({ page }) => {
    // Intentar acceder a ruta de administración
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*\/login/);

    // Intentar acceder a consola docente
    await page.goto('/teacher');
    await expect(page).toHaveURL(/.*\/login/);
  });
});
