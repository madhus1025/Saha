import { test, expect, type APIRequestContext } from '@playwright/test'
import { apiContext, seedCompleteCouple, loginViaUi, type SeededCouple } from './fixtures'

/** App shell: sidebar navigation, the "coming soon" modules, theme toggle, and the 404 page. */

let api: APIRequestContext
let couple: SeededCouple

test.beforeAll(async () => {
  api = await apiContext()
  couple = await seedCompleteCouple(api, 'nav')
})
test.afterAll(async () => {
  await api.dispose()
})

test.beforeEach(async ({ page }) => {
  await loginViaUi(page, couple.registrant.username)
})

const NAV = [
  { link: 'Home', url: /\/dashboard/, heading: /Good (morning|afternoon|evening)/ },
  { link: 'Messages', url: /\/messages/, heading: /Messages/ },
  { link: 'Connect', url: /\/connect/, heading: /Connect/ },
  { link: 'Settings', url: /\/settings/, heading: /Settings/ },
] as const

test.describe('Sidebar navigation', () => {
  for (const { link, url, heading } of NAV) {
    test(`the "${link}" sidebar item routes to its page`, async ({ page }) => {
      await page.getByRole('link', { name: link, exact: true }).click()
      await expect(page).toHaveURL(url)
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible()
    })
  }
})

test.describe('Coming-soon modules', () => {
  for (const [path, title] of [
    ['/finance', 'Finance'],
    ['/memories', 'Memories'],
    ['/goals', 'Goals'],
    ['/calendar', 'Calendar'],
  ] as const) {
    test(`${title} renders the Coming Soon placeholder`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Coming Soon' })).toBeVisible()
    })
  }
})

test.describe('Theme toggle', () => {
  test('the top-bar toggle flips the document theme', async ({ page }) => {
    const html = page.locator('html')
    const before = await html.getAttribute('class')
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await expect(html).not.toHaveClass(before ?? '')
    // Toggling back returns to the original theme.
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await expect(html).toHaveClass(before ?? '')
  })
})

test.describe('Not found', () => {
  test('an unknown route renders the 404 page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    // Target the heading specifically: the route-change live region also names the page, so a
    // substring text match would resolve to both it and the <h1>.
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  })
})

test.describe('Direct-URL access while signed out', () => {
  const protectedRoutes = ['/dashboard', '/messages', '/connect', '/profile', '/settings', '/finance']
  for (const route of protectedRoutes) {
    test(`signed-out access to ${route} redirects to /login`, async ({ page }) => {
      await page.getByRole('button', { name: 'Sign out' }).click()
      await expect(page).toHaveURL(/\/login/)
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/)
    })
  }
})
