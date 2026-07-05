import { test, expect } from '@playwright/test'

const validForm = {
  togetherIDOrUsername: 'MADHU-PRIYA',
  code: '123456',
  newPassword: 'NewPass@123',
  confirmPassword: 'NewPass@123',
}

const fillForm = async (
  page: Parameters<Parameters<typeof test>[2]>[0],
  overrides: Partial<typeof validForm> = {},
) => {
  const values = { ...validForm, ...overrides }
  await page.getByLabel('Together ID or Username').fill(values.togetherIDOrUsername)
  await page.getByLabel('6-Digit Code').fill(values.code)
  await page.getByLabel('New Password').fill(values.newPassword)
  await page.getByLabel('Confirm Password').fill(values.confirmPassword)
}

test.describe('Reset Password', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reset-password')
  })

  test('renders page heading and description', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'New password' })).toBeVisible()
    await expect(page.getByText('Enter the code you received')).toBeVisible()
  })

  test('shows all four fields', async ({ page }) => {
    await expect(page.getByLabel('Together ID or Username')).toBeVisible()
    await expect(page.getByLabel('6-Digit Code')).toBeVisible()
    await expect(page.getByLabel('New Password')).toBeVisible()
    await expect(page.getByLabel('Confirm Password')).toBeVisible()
  })

  test('shows code field hint about checking both inboxes', async ({ page }) => {
    await expect(page.getByText("Check both partners' email inboxes")).toBeVisible()
  })

  test('show/hide password toggle works', async ({ page }) => {
    const passwordInput = page.getByLabel('New Password')
    await expect(passwordInput).toHaveAttribute('type', 'password')
    await page.locator('form button[type="button"]').click()
    await expect(passwordInput).toHaveAttribute('type', 'text')
    await page.locator('form button[type="button"]').click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('Confirm Password field also toggles with show/hide', async ({ page }) => {
    const confirmInput = page.getByLabel('Confirm Password')
    await expect(confirmInput).toHaveAttribute('type', 'password')
    await page.locator('form button[type="button"]').click()
    await expect(confirmInput).toHaveAttribute('type', 'text')
  })

  test('validates empty Together ID field', async ({ page }) => {
    await fillForm(page, { togetherIDOrUsername: '' })
    await page.getByRole('button', { name: /reset password/i }).click()
    await expect(page.getByText('Required')).toBeVisible()
  })

  test('validates code must be exactly 6 digits', async ({ page }) => {
    await fillForm(page, { code: '123' })
    await page.getByRole('button', { name: /reset password/i }).click()
    await expect(page.getByText('Code must be exactly 6 digits')).toBeVisible()
  })

  test('validates code must contain only digits', async ({ page }) => {
    await fillForm(page, { code: '12345a' })
    await page.getByRole('button', { name: /reset password/i }).click()
    await expect(page.getByText('Must contain only digits')).toBeVisible()
  })

  test('validates password minimum length', async ({ page }) => {
    await fillForm(page, { newPassword: 'Ab1@', confirmPassword: 'Ab1@' })
    await page.getByRole('button', { name: /reset password/i }).click()
    await expect(page.getByText('At least 8 characters')).toBeVisible()
  })

  test('validates password must have uppercase letter', async ({ page }) => {
    await fillForm(page, { newPassword: 'lowercase1@', confirmPassword: 'lowercase1@' })
    await page.getByRole('button', { name: /reset password/i }).click()
    await expect(page.getByText('Need at least one uppercase letter')).toBeVisible()
  })

  test('validates password must have lowercase letter', async ({ page }) => {
    await fillForm(page, { newPassword: 'UPPERCASE1@', confirmPassword: 'UPPERCASE1@' })
    await page.getByRole('button', { name: /reset password/i }).click()
    await expect(page.getByText('Need at least one lowercase letter')).toBeVisible()
  })

  test('validates password must have a number', async ({ page }) => {
    await fillForm(page, { newPassword: 'NoNumber@', confirmPassword: 'NoNumber@' })
    await page.getByRole('button', { name: /reset password/i }).click()
    await expect(page.getByText('Need at least one number')).toBeVisible()
  })

  test('validates password must have a special character', async ({ page }) => {
    await fillForm(page, { newPassword: 'NoSpecial1', confirmPassword: 'NoSpecial1' })
    await page.getByRole('button', { name: /reset password/i }).click()
    await expect(page.getByText('Need at least one special character')).toBeVisible()
  })

  test('validates passwords must match', async ({ page }) => {
    await fillForm(page, { confirmPassword: 'DifferentPass@1' })
    await page.getByRole('button', { name: /reset password/i }).click()
    await expect(page.getByText('Passwords do not match')).toBeVisible()
  })

  test('successful reset redirects to login with success toast', async ({ page }) => {
    await page.route((url) => url.pathname.endsWith('/auth/reset-password'), (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
    )
    await fillForm(page)
    await page.getByRole('button', { name: /reset password/i }).click()
    // Toast appears before navigation completes — check it first
    await expect(page.getByText('Password updated!')).toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('shows error toast on invalid/expired code', async ({ page }) => {
    await page.route((url) => url.pathname.endsWith('/auth/reset-password'), (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid or expired reset code.' }),
      }),
    )
    await fillForm(page)
    await page.getByRole('button', { name: /reset password/i }).click()
    await expect(page.getByText('Reset failed').first()).toBeVisible()
    await expect(page.getByText('Invalid or expired reset code.').first()).toBeVisible()
  })

  test('Resend code link navigates to forgot password', async ({ page }) => {
    await page.getByRole('link', { name: /resend code/i }).click()
    await expect(page).toHaveURL('/forgot-password')
  })
})
