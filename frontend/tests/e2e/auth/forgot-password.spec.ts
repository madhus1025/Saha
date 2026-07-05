import { test, expect } from '@playwright/test'

test.describe('Forgot Password', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password')
  })

  test('shows forgot password form', async ({ page }) => {
    await expect(page.getByText('Reset password')).toBeVisible()
    await expect(page.getByLabel(/together id or username/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset code/i })).toBeVisible()
  })

  test('validates empty submission', async ({ page }) => {
    await page.getByRole('button', { name: /send reset code/i }).click()
    await expect(page.getByText(/please enter/i)).toBeVisible()
  })

  test('shows success message after submission', async ({ page }) => {
    await page.getByLabel(/together id or username/i).fill('TEST-ID')
    await page.getByRole('button', { name: /send reset code/i }).click()
    // Always shows success (enumeration protection) — toast title is "Code sent!"
    await expect(page.getByText('Code sent!').first()).toBeVisible({ timeout: 10000 })
  })

  test('navigates back to login', async ({ page }) => {
    await page.getByRole('link', { name: /back to sign in/i }).click()
    await expect(page).toHaveURL('/login')
  })
})

test.describe('Reset Password', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reset-password')
  })

  test('shows reset password form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /new password/i })).toBeVisible()
    await expect(page.getByLabel(/6-digit code/i)).toBeVisible()
    await expect(page.getByLabel('New Password')).toBeVisible()
    await expect(page.getByLabel('Confirm Password')).toBeVisible()
  })

  test('validates 6-digit code format', async ({ page }) => {
    await page.getByLabel(/together id or username/i).fill('MADHU-PRIYA')
    await page.getByLabel(/6-digit code/i).fill('12345') // 5 digits — must be exactly 6
    await page.getByLabel('New Password').fill('StrongP@ss1')
    await page.getByLabel('Confirm Password').fill('StrongP@ss1')
    await page.getByRole('button', { name: /reset password/i }).click()
    await expect(page.getByText(/exactly 6 digits/i)).toBeVisible()
  })

  test('validates password mismatch', async ({ page }) => {
    await page.getByLabel(/together id or username/i).fill('MADHU-PRIYA')
    await page.getByLabel(/6-digit code/i).fill('123456')
    await page.getByLabel('New Password').fill('StrongP@ss1')
    await page.getByLabel('Confirm Password').fill('DifferentP@ss1')
    await page.getByRole('button', { name: /reset password/i }).click()
    await expect(page.getByText(/passwords do not match/i)).toBeVisible()
  })
})
