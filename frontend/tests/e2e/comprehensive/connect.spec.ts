import { test, expect, type APIRequestContext } from '@playwright/test'
import {
  apiContext,
  seedCompleteCouple,
  sendConnectRequest,
  loginViaUi,
} from './fixtures'

/** Connect: couple search, sending requests, and accepting / declining incoming requests. */

let api: APIRequestContext
test.beforeAll(async () => {
  api = await apiContext()
})
test.afterAll(async () => {
  await api.dispose()
})

test.describe('Search & request', () => {
  test('a couple can be found by Together ID and sent a connection request', async ({ page }) => {
    const me = await seedCompleteCouple(api, 'srchA')
    const target = await seedCompleteCouple(api, 'srchB')

    await loginViaUi(page, me.registrant.username)
    await page.goto('/connect')
    await page.getByRole('button', { name: 'Find Couples' }).first().click()

    await page.getByPlaceholder(/Search by Together ID/).fill(target.togetherID)
    await expect(page.getByText(target.togetherID)).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Connect', exact: true }).click()
    await expect(page.getByText('Request sent!').first()).toBeVisible()
  })

  test('searching gibberish shows a "no couples found" empty state', async ({ page }) => {
    const me = await seedCompleteCouple(api, 'srchC')
    await loginViaUi(page, me.registrant.username)
    await page.goto('/connect')
    await page.getByRole('button', { name: 'Find Couples' }).first().click()
    await page.getByPlaceholder(/Search by Together ID/).fill('ZZZ-NOPE-QQQ')
    await expect(page.getByText(/No couples found/)).toBeVisible({ timeout: 10_000 })
  })

  test('a single character shows the "enter at least 2 characters" hint', async ({ page }) => {
    const me = await seedCompleteCouple(api, 'srchD')
    await loginViaUi(page, me.registrant.username)
    await page.goto('/connect')
    await page.getByRole('button', { name: 'Find Couples' }).first().click()
    await page.getByPlaceholder(/Search by Together ID/).fill('A')
    await expect(page.getByText(/at least 2 characters/)).toBeVisible()
  })
})

test.describe('Incoming requests', () => {
  test('an incoming request can be accepted and appears under Connected', async ({ page }) => {
    const me = await seedCompleteCouple(api, 'accA')
    const sender = await seedCompleteCouple(api, 'accB')
    const req = await sendConnectRequest(api, sender.registrant.username, me.togetherID)
    expect(req.status()).toBe(201)

    await loginViaUi(page, me.registrant.username)
    await page.goto('/connect')
    await page.getByRole('button', { name: /Pending/ }).click()
    await expect(page.getByText(sender.togetherID)).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Accept' }).click()
    await expect(page.getByText('Connection accepted!').first()).toBeVisible()

    await page.getByRole('button', { name: 'Connected', exact: true }).click()
    await expect(page.getByText(sender.togetherID)).toBeVisible()
  })

  test('an incoming request can be declined and leaves the pending list', async ({ page }) => {
    const me = await seedCompleteCouple(api, 'rejA')
    const sender = await seedCompleteCouple(api, 'rejB')
    await sendConnectRequest(api, sender.registrant.username, me.togetherID)

    await loginViaUi(page, me.registrant.username)
    await page.goto('/connect')
    await page.getByRole('button', { name: /Pending/ }).click()
    await expect(page.getByText(sender.togetherID)).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Decline request' }).click()
    await expect(page.getByText('Request declined').first()).toBeVisible()
    await expect(page.getByText(sender.togetherID)).toHaveCount(0)
  })
})

test.describe('Empty states', () => {
  test('a couple with no connections sees the empty Connected + Pending states', async ({ page }) => {
    const lonely = await seedCompleteCouple(api, 'empty')
    await loginViaUi(page, lonely.registrant.username)
    await page.goto('/connect')

    await expect(page.getByText(/No connections yet/)).toBeVisible()
    await page.getByRole('button', { name: /Pending/ }).click()
    await expect(page.getByText(/No pending requests/)).toBeVisible()
  })
})
