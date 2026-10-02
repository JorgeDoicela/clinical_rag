import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración oficial de pruebas End-to-End (E2E) con Playwright para Ateneo+.
 * Utiliza los canales nativos del sistema (Google Chrome y Microsoft Edge) para máxima fidelidad
 * y ejecución sin latencia ni dependencia de descargas de binarios externos.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'Google Chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
    {
      name: 'Microsoft Edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
      },
    },
    {
      name: 'Mobile Pixel 5',
      use: {
        ...devices['Pixel 5'],
        channel: 'chrome',
      },
    },
  ],
  webServer: {
    command: 'npm run preview -- --port 5173',
    port: 5173,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
