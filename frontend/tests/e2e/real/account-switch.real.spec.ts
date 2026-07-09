import { test, expect, type Page } from '@playwright/test'
import { apiContext, seedCouple, loginViaUi, SEED_PASSWORD } from './fixtures'

/**
 * Privacy regression: switching accounts in the SAME browser tab (logout → login) must not leak the
 * previous couple's conversations. This reproduces the real user flow with CLIENT-SIDE navigation
 * only (no full page reload) — a page reload would reinitialize the app and hide the cache leak.
 */

/** Fill + submit the login form already visible on /login, without a full navigation. */
async function loginOnCurrentPage(page: Page, username: string): Promise<void> {
  await expect(page).toHaveURL(/\/login/)
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Shared Password').fill(SEED_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
}

async function gotoMessagesViaNav(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Messages' }).first().click()
  await expect(page).toHaveURL(/\/messages/)
}

test('switching accounts in the same tab does not leak the previous couple’s conversations', async ({
  browser,
}) => {
  const api = await apiContext()
  const A = await seedCouple(api, 'LA')
  const B = await seedCouple(api, 'LB')
  await api.dispose()

  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  // Couple A logs in and writes a private message in their partner chat.
  await loginViaUi(page, A.husband.username)
  await gotoMessagesViaNav(page)
  await page.getByRole('button', { name: /You & / }).first().click()
  await page.getByRole('textbox', { name: 'Message' }).fill('alpha private secret')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.locator('div.group', { hasText: 'alpha private secret' })).toBeVisible()

  // Couple A signs out (client-side navigation to /login, no reload).
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login/)

  // Couple B signs in in the same tab (no page reload) and opens Messages via the nav link.
  await loginOnCurrentPage(page, B.husband.username)
  await gotoMessagesViaNav(page)

  // B sees their OWN partner chat...
  await expect(
    page.getByRole('button', { name: new RegExp(`You & ${B.wife.name}`) }),
  ).toBeVisible()

  // ...and must NOT see couple A's private conversation or its message preview.
  await expect(page.getByText('alpha private secret')).toHaveCount(0)
  await expect(page.getByText(A.wife.name)).toHaveCount(0)
  await expect(page.getByText(A.husband.name)).toHaveCount(0)

  await ctx.close()
})
