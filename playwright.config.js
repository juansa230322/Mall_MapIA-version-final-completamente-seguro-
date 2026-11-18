// Pruebas de navegador (Playwright + Chromium).
// Requiere: npm.cmd run build, la base inicializada y `npx.cmd playwright install chromium`.
// Si no se puede descargar Chromium, PW_CHROMIUM_PATH permite usar un Chrome/Chromium ya instalado.
import { defineConfig, devices } from '@playwright/test';

const ejecutable = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {};
const video = process.env.PW_VIDEO === '1' ? 'on' : 'off';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'docs/evidencias/reporte-playwright' }]],
  use: {
    baseURL: 'http://localhost:3000',
    locale: 'es-CO',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video,
    launchOptions: ejecutable,
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 860 }, launchOptions: ejecutable } },
    {
      name: 'movil-390',
      use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, launchOptions: ejecutable },
    },
  ],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000/api/v1/salud',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
