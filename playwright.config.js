const { defineConfig } = require('@playwright/test');

const frontendPort = process.env.FRONTEND_PORT || '4173';
const backendPort = process.env.BACKEND_PORT || '3001';

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm --prefix backend start',
      url: `http://127.0.0.1:${backendPort}/api/health`,
      timeout: 120_000,
      reuseExistingServer: true,
    },
    {
      command: `npx http-server frontend -p ${frontendPort} -c-1 --silent`,
      url: `http://127.0.0.1:${frontendPort}/login.html`,
      timeout: 120_000,
      reuseExistingServer: true,
    },
  ],
});
