import { test, expect } from '@playwright/test'

const authState = JSON.stringify({
  state: {
    isAuthenticated: true,
    username: 'madhu',
    partnerName: 'Priya Avinash',
    togetherID: 'MADHU-PRIYA',
    coupleId: '11111111-1111-1111-1111-111111111111',
    partnerId: '22222222-2222-2222-2222-222222222222',
    role: 'Husband',
    profilePictureUrl: null,
  },
  version: 0,
})

test.describe('Settings', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript((stored) => {
      localStorage.setItem('saha-auth', stored)
    }, authState)
    await page.goto('/settings')
  })

  test('renders settings page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(page.getByText('Personalise your experience')).toBeVisible()
  })

  test('shows Appearance card with Light, Dark, System options', async ({ page }) => {
    await expect(page.getByText('Appearance')).toBeVisible()
    await expect(page.getByRole('button', { name: /light/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /dark/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /system/i })).toBeVisible()
  })

  test('selecting Dark theme updates active state', async ({ page }) => {
    const darkBtn = page.getByRole('button', { name: /dark/i })
    await darkBtn.click()
    await expect(darkBtn).toHaveClass(/border-gold-400/)
  })

  test('selecting Light theme updates active state', async ({ page }) => {
    await page.getByRole('button', { name: /dark/i }).click()
    const lightBtn = page.getByRole('button', { name: /light/i })
    await lightBtn.click()
    await expect(lightBtn).toHaveClass(/border-gold-400/)
  })

  test('selecting System theme updates active state', async ({ page }) => {
    const systemBtn = page.getByRole('button', { name: /system/i })
    await systemBtn.click()
    await expect(systemBtn).toHaveClass(/border-gold-400/)
  })

  test('only one theme option is active at a time', async ({ page }) => {
    await page.getByRole('button', { name: /dark/i }).click()
    const activeButtons = await page.locator('button.border-gold-400').count()
    expect(activeButtons).toBe(1)
  })

  test('shows Notifications coming soon card', async ({ page }) => {
    await expect(page.getByText('Notifications')).toBeVisible()
    await expect(page.getByText(/notification preferences will be available/i)).toBeVisible()
  })

  test('shows Privacy & Security coming soon card', async ({ page }) => {
    await expect(page.getByText('Privacy & Security')).toBeVisible()
    await expect(page.getByText(/advanced security settings will be available/i)).toBeVisible()
  })

  test('dark mode applies dark class to html element', async ({ page }) => {
    await page.getByRole('button', { name: /dark/i }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('light mode removes dark class from html element', async ({ page }) => {
    await page.getByRole('button', { name: /dark/i }).click()
    await page.getByRole('button', { name: /light/i }).click()
    const htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass ?? '').not.toContain('dark')
  })

  test('unauthenticated access redirects to login', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto('/settings')
    await expect(page).toHaveURL('/login')
    await ctx.close()
  })
})
