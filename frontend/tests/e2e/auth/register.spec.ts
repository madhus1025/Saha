import { test, expect } from '@playwright/test'

test.describe('Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('shows multi-step registration form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Create your home' })).toBeVisible()
    // Step indicator label "Together" appears in the step chips
    await expect(page.getByText('Together', { exact: true }).first()).toBeVisible()
    await expect(page.getByLabel('Together ID')).toBeVisible()
  })

  test('step 1 validates Together ID', async ({ page }) => {
    await page.getByRole('button', { name: /continue/i }).click()
    // Empty field (len 0) fires the min(3) validator
    await expect(page.getByText(/together id must be at least/i)).toBeVisible()
  })

  test('Together ID is auto-uppercased', async ({ page }) => {
    const input = page.getByLabel('Together ID')
    await input.fill('madhu-priya')
    await expect(input).toHaveValue('MADHU-PRIYA')
  })

  test('step 1 proceeds to step 2 with valid together ID', async ({ page }) => {
    await page.getByLabel('Together ID').fill('JOHN-JANE')
    await page.getByRole('button', { name: /continue/i }).click()
    await expect(page.getByText("Husband's Details")).toBeVisible()
  })

  test('step 2 validates husband details', async ({ page }) => {
    await page.getByLabel('Together ID').fill('JOHN-JANE')
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /continue/i }).click()
    // Empty username fires the min(3) validator
    await expect(page.getByText(/username must be at least/i)).toBeVisible()
  })

  test('back button returns to previous step', async ({ page }) => {
    await page.getByLabel('Together ID').fill('JOHN-JANE')
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /back/i }).click()
    await expect(page.getByLabel('Together ID')).toBeVisible()
  })

  test('password validation enforces complexity', async ({ page }) => {
    await page.getByLabel('Together ID').fill('JOHN-JANE')
    await page.getByRole('button', { name: /continue/i }).click()

    await page.getByLabel('Username').first().fill('john')
    await page.getByLabel('Full Name').first().fill('John Doe')
    await page.locator('input[type="date"]').first().fill('1990-01-01')
    await page.getByLabel('Email').first().fill('john@example.com')
    await page.getByLabel('Phone Number').first().fill('+11234567890')
    await page.getByRole('button', { name: /continue/i }).click()

    await page.getByLabel('Username').first().fill('jane')
    await page.getByLabel('Full Name').first().fill('Jane Doe')
    await page.locator('input[type="date"]').first().fill('1992-06-15')
    await page.getByLabel('Email').first().fill('jane@example.com')
    await page.getByLabel('Phone Number').first().fill('+11234567891')
    await page.getByRole('button', { name: /continue/i }).click()

    await page.getByLabel('Shared Password').fill('weak')
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible()
  })

  test('navigates to login from register page', async ({ page }) => {
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/login')
  })
})
