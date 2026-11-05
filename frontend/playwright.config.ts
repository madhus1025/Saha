import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:5173'

// Start a local preview only when the target is local (CI e2e + local checks). When pointed at a
// deployed URL (CD smoke tests against FRONTEND_URL), hit that URL directly with no local server.
const target = new URL(baseURL)
const isLocalTarget = ['localhost', '127.0.0.1'].includes(target.hostname)

export default defineConfig({
  testDir: './tests/e2e',
  // Suites that need a live backend run under their own configs (playwright.real.config.ts /
  // playwright.comprehensive.config.ts / playwright.regression.config.ts), not here — this default
  // config only serves the built frontend, so they would fail in the CI e2e job. Keep this config to the
  // mock-backed suites + smoke tests.
  testIgnore: ['**/integration/**', '**/real/**', '**/comprehensive/**', '**/regression/**'],
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],

  webServer: isLocalTarget
    ? {
        // Vite dev falls back to the SPA for public directory indexes; test the built artifact.
        command: `npm run build && npm run preview -- --host ${target.hostname} --port ${target.port || '5173'} --strictPort`,
        url: baseURL,
        reuseExistingServer: !process.env['CI'],
        timeout: 120_000,
        // Registration is flagged off by default until the invite screens exist (R-4), but the
        // wizard's e2e coverage still has to be able to reach it.
        env: { VITE_REGISTRATION_ENABLED: 'true' },
      }
    : undefined,
})
