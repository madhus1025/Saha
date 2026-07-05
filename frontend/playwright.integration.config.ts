import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e/integration',
  fullyParallel: false, // integration tests must run sequentially — they share real state
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report-integration' }], ['list']],
  globalSetup: './tests/e2e/integration/global-setup.ts',

  use: {
    baseURL: process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:5175',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },

  timeout: 30000,

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
