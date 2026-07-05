import { test, expect } from '@playwright/test'

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('shows the login form', async ({ page }) => {
    await expect(page.getByText('Welcome back')).toBeVisible()
    await expect(page.getByLabel('Username')).toBeVisible()
    await expect(page.getByLabel('Shared Password')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('shows validation errors for empty submission', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText('Username is required')).toBeVisible()
    await expect(page.getByText('Password is required')).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.getByLabel('Username').fill('invaliduser')
    await page.getByLabel('Shared Password').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    // Any error toast is acceptable — message depends on backend availability
    await expect(
      page.getByText(/invalid|unauthorized|incorrect|failed|error|network/i).first(),
    ).toBeVisible({ timeout: 10000 })
  })

  test('password toggle shows/hides password', async ({ page }) => {
    const passwordInput = page.getByLabel('Shared Password')
    await passwordInput.fill('secret')
    expect(await passwordInput.getAttribute('type')).toBe('password')

    await page.getByLabel('Show password').click()
    expect(await passwordInput.getAttribute('type')).toBe('text')

    await page.getByLabel('Hide password').click()
    expect(await passwordInput.getAttribute('type')).toBe('password')
  })

  test('navigates to register page', async ({ page }) => {
    await page.getByRole('link', { name: /create your couple account/i }).click()
    await expect(page).toHaveURL('/register')
  })

  test('navigates to forgot password page', async ({ page }) => {
    await page.getByRole('link', { name: /forgot password/i }).click()
    await expect(page).toHaveURL('/forgot-password')
  })

  test('redirects to dashboard when already authenticated', async ({ page, context }) => {
    // Set auth state in localStorage
    await context.addInitScript(() => {
      localStorage.setItem(
        'saha-auth',
        JSON.stringify({
          state: {
            isAuthenticated: true,
            username: 'testuser',
            togetherID: 'TEST-ID',
            coupleId: 'fake-id',
            partnerId: 'fake-partner-id',
            role: 'Husband',
          },
          version: 0,
        }),
      )
    })
    await page.goto('/login')
    await expect(page).toHaveURL('/dashboard')
  })
})
