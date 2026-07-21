import { test, expect } from '@playwright/test'

/**
 * Post-deployment smoke tests. These are tagged `@smoke` and run by the CD pipeline against the
 * live deployed frontend (PLAYWRIGHT_BASE_URL = FRONTEND_URL). They use NO request mocking — they
 * only verify that the Static Web App actually serves the SPA and that client-side routing plus the
 * auth guard work end to end. Keep them dependency-free and fast.
 */
test.describe('Smoke', () => {
  test('@smoke the app serves and redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('@smoke the login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Welcome home' })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('@smoke protected routes are guarded', async ({ page }) => {
    await page.goto('/messages')
    await expect(page).toHaveURL(/\/login/)
  })
})
