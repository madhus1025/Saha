import { test, expect, type APIRequestContext } from '@playwright/test'
import { apiContext, seedCompleteCouple, loginViaUi, type SeededCouple } from './fixtures'

/** Dashboard content + the Settings appearance controls. */

let api: APIRequestContext
let couple: SeededCouple

test.beforeAll(async () => {
  api = await apiContext()
  couple = await seedCompleteCouple(api, 'dash')
})
test.afterAll(async () => {
  await api.dispose()
})

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, couple.registrant.username)
  })

  test('greets the signed-in partner and shows the Together ID', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible()
    await expect(page.getByText(couple.togetherID).first()).toBeVisible()
  })

  test('shows both partners on the couple card', async ({ page }) => {
    // The card shows the signed-in partner by username and the other partner by name (once the
    // profile query resolves).
    await expect(page.getByText(couple.registrant.username).first()).toBeVisible()
    await expect(page.getByText(couple.partner.name).first()).toBeVisible({ timeout: 15_000 })
  })

  test('renders the module grid with all six modules', async ({ page }) => {
    for (const title of ['Finance', 'Memories', 'Goals', 'Messages', 'Connect', 'Calendar']) {
      await expect(page.getByRole('link', { name: new RegExp(title) }).first()).toBeVisible()
    }
  })

  test('a module card navigates to its module', async ({ page }) => {
    await page.getByRole('link', { name: /Finance/ }).first().click()
    await expect(page).toHaveURL(/\/finance/)
  })
})

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, couple.registrant.username)
    await page.goto('/settings')
  })

  test('offers Light, Dark and System appearance options', async ({ page }) => {
    for (const label of ['Light', 'Dark', 'System']) {
      await expect(page.getByRole('button', { name: label })).toBeVisible()
    }
  })

  test('selecting Dark applies the dark theme and persists across reload', async ({ page }) => {
    await page.getByRole('button', { name: 'Dark' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 15_000 })
    // Reset back to Light so the choice doesn't leak into other tests sharing storage.
    await page.getByRole('button', { name: 'Light' }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })
})
