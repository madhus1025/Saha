import { defineConfig, devices } from '@playwright/test'

/**
 * Comprehensive real-backend E2E config (Phase-5 quality suite).
 *
 * Drives the ACTUAL Saha backend end-to-end (register → invite → accept → login → connect →
 * messaging → profile → settings), plus regression coverage for the bugs found during exploration.
 *
 * Prerequisites (see tests/e2e/comprehensive/README or docs/development/TESTING_GUIDE.md):
 *   1. Backend up in IntegrationTest env:
 *        cd backend/src/Saha.API
 *        ASPNETCORE_ENVIRONMENT=IntegrationTest \
 *        ASPNETCORE_URLS="https://localhost:7001;http://localhost:5001" dotnet run --no-launch-profile
 *   2. From frontend/:  npx playwright test --config playwright.comprehensive.config.ts
 *
 * A fixed non-UTC timezone is pinned so the timestamp-rendering regression is deterministic on any
 * runner (the UTC-serialization bug is invisible when the runner itself is in UTC).
 */
const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './tests/e2e/comprehensive',
  globalSetup: './tests/e2e/comprehensive/global-setup.ts',
  fullyParallel: false,
  workers: 1, // one shared backend + deterministic ordering for a clean report
  forbidOnly: !!process.env['CI'],
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['html', { outputFolder: 'playwright-report-comprehensive', open: 'never' }],
    ['json', { outputFile: 'test-results/comprehensive-results.json' }],
    ['list'],
  ],

  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    timezoneId: 'Asia/Kolkata', // +05:30 — surfaces the no-`Z` timestamp bug deterministically
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { VITE_REGISTRATION_ENABLED: 'true' },
  },
})
