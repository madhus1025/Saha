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

  test('shows both partners on the couple card, each by name', async ({ page }) => {
    // This assertion previously required the signed-in partner to be shown by *username* while the
    // other was shown by name — codifying the inconsistency rather than catching it. Both halves of
    // one card must identify people the same way, and a username is a credential, not a name.
    await expect(page.getByText(couple.registrant.name).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(couple.partner.name).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('body')).not.toContainText(couple.registrant.username)
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
    // The appearance options are a radiogroup, so the selected one is exposed to assistive
    // technology rather than carried by colour alone (SAHA-D10).
    for (const label of ['Light', 'Dark', 'System']) {
      await expect(page.getByRole('radio', { name: label })).toBeVisible()
    }
  })

  test('selecting Dark applies the dark theme and persists across reload', async ({ page }) => {
    await page.getByRole('radio', { name: 'Dark' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 15_000 })
    // Reset back to Light so the choice doesn't leak into other tests sharing storage.
    await page.getByRole('radio', { name: 'Light' }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })
})
