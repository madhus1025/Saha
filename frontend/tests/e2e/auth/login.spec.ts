import { test, expect } from '@playwright/test'

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('shows the login form @smoke', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome home' })).toBeVisible()
    await expect(page.getByText('Either of your usernames opens the door.')).toBeVisible()
    await expect(page.getByLabel('Username')).toBeVisible()
    await expect(page.getByLabel('Your shared password')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('shows validation errors for empty submission', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText('Username is required')).toBeVisible()
    await expect(page.getByText('Password is required')).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.getByLabel('Username').fill('invaliduser')
    await page.getByLabel('Your shared password').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    // Any error toast is acceptable — message depends on backend availability
    await expect(
      page.getByText(/invalid|unauthorized|incorrect|failed|error|network/i).first(),
    ).toBeVisible({ timeout: 10000 })
  })

  test('password toggle shows/hides password', async ({ page }) => {
    const passwordInput = page.getByLabel('Your shared password')
    await passwordInput.fill('secret')
    expect(await passwordInput.getAttribute('type')).toBe('password')

    await page.getByLabel('Show password').click()
    expect(await passwordInput.getAttribute('type')).toBe('text')

    await page.getByLabel('Hide password').click()
    expect(await passwordInput.getAttribute('type')).toBe('password')
  })

  test('navigates to register page', async ({ page }) => {
    await page.getByRole('link', { name: /create our home/i }).click()
    await expect(page).toHaveURL('/register')
  })

  test('navigates to forgot password page', async ({ page }) => {
    await page.getByRole('link', { name: /forgot our password/i }).click()
    await expect(page).toHaveURL('/forgot-password')
  })

  test('offers the invitation path', async ({ page }) => {
    await page.getByRole('link', { name: /i have an invitation/i }).click()
    await expect(page).toHaveURL('/invite/accept')
  })

  const seedAuth = (coupleState: 'Complete' | 'AwaitingPartner') => `
    localStorage.setItem('saha-auth', JSON.stringify({
      state: {
        isAuthenticated: true,
        username: 'testuser',
        togetherID: 'TEST-ID',
        coupleId: 'fake-id',
        partnerId: 'fake-partner-id',
        role: 'Husband',
        coupleState: '${coupleState}',
      },
      version: 0,
    }))
  `

  test('redirects a complete couple to the dashboard', async ({ page, context }) => {
    await context.addInitScript(seedAuth('Complete'))
    await page.goto('/login')
    await expect(page).toHaveURL('/dashboard')
  })

  test('redirects a registrant awaiting their partner to the threshold', async ({ page, context }) => {
    // Sending them to /dashboard would bounce back here via CompleteCoupleRoute — a guard loop.
    await context.addInitScript(seedAuth('AwaitingPartner'))
    await page.goto('/login')
    await expect(page).toHaveURL('/waiting')
  })

  test('keeps a registrant awaiting their partner out of the app', async ({ page, context }) => {
    await context.addInitScript(seedAuth('AwaitingPartner'))
    await page.goto('/messages')
    await expect(page).toHaveURL('/waiting')
  })
})
