import { defineConfig, devices } from '@playwright/test'

/**
 * Real-backend E2E config.
 *
 * These specs drive the ACTUAL Saha backend (register/login/connect/messages) — they are NOT the
 * mocked page.route suites under tests/e2e/{messages,connect}. Run with:
 *
 *   1. Start the backend (IntegrationTest env, http+https):
 *        cd backend/src/Saha.API
 *        ASPNETCORE_ENVIRONMENT=IntegrationTest \
 *        ASPNETCORE_URLS="https://localhost:7001;http://localhost:5001" dotnet run --no-launch-profile
 *   2. From frontend/:  npx playwright test --config playwright.real.config.ts
 *
 * Vite (started below) proxies /api -> https://localhost:7001, so the browser talks to the real API.
 */
const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './tests/e2e/real',
  globalSetup: './tests/e2e/real/global-setup.ts',
  fullyParallel: false,
  workers: 1, // one shared backend + deterministic ordering for a clean bug report
  forbidOnly: !!process.env['CI'],
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['html', { outputFolder: 'playwright-report-real', open: 'never' }], ['list']],

  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
})
