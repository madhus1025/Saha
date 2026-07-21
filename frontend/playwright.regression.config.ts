import { defineConfig, devices } from '@playwright/test'

/**
 * Catalogue-traceable regression suite.
 *
 * Every test title is prefixed with the `test-cases/` catalogue ID(s) it executes
 * (e.g. `[AUTH-002]`), so the JSON reporter output can be joined straight back onto the
 * manual catalogue to produce an execution report.
 *
 * Prerequisites (identical to the comprehensive suite):
 *   1. Backend in IntegrationTest env:
 *        cd backend/src/Saha.API
 *        ASPNETCORE_ENVIRONMENT=IntegrationTest \
 *        ASPNETCORE_URLS="https://localhost:7001;http://localhost:5001" dotnet run --no-launch-profile
 *   2. Seeded roster:  cd frontend && npm run seed:e2e && npm run seed:e2e:connect
 *   3. npx playwright test --config playwright.regression.config.ts
 *
 * The timezone is pinned off-UTC so timestamp-serialization regressions stay deterministic.
 */
const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './tests/e2e/regression',
  globalSetup: './tests/e2e/regression/global-setup.ts',
  fullyParallel: false,
  workers: 1, // shared SQLite backend — serialise for deterministic, lock-free runs
  forbidOnly: !!process.env['CI'],
  // One retry separates a genuine defect from load-dependent flake: a reported defect fails on
  // every attempt, whereas a timing-sensitive test that passes on retry is marked `flaky` rather
  // than `failed`. Flaky results are reported but never counted as defects.
  retries: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['html', { outputFolder: 'playwright-report-regression', open: 'never' }],
    ['json', { outputFile: 'test-results/regression-results.json' }],
    ['list'],
  ],

  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    timezoneId: 'Asia/Kolkata',
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
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
