import { test, expect, type APIRequestContext } from '@playwright/test'
import {
  apiContext,
  apiLogin,
  connectCouplesViaApi,
  getPartnerConversationId,
  seedCompleteCouple,
  seedIncompleteCouple,
  sendConnectRequest,
  sendTextViaApi,
  loginViaUi,
  API_BASE,
  HAS_TZ_OFFSET,
} from './fixtures'

/**
 * Regression coverage for the four bugs found during exploration. Each test is written to FAIL
 * against the unfixed product and PASS once the corresponding fix lands.
 *
 * The suite pins timezone Asia/Kolkata (+05:30) so the UTC-serialization bug is deterministic even
 * on a UTC CI runner (see playwright.comprehensive.config.ts).
 */

let api: APIRequestContext
test.beforeAll(async () => {
  api = await apiContext()
})
test.afterAll(async () => {
  await api.dispose()
})

// ─────────────────────────────────────────────────────────────────────────────
// BUG-001 (HIGH): DB-sourced timestamps are serialized without a UTC offset (`Z`),
// so a client in any non-UTC timezone renders every message/conversation/connection
// time wrong (a just-sent message shows "5h" in IST instead of "now").
// ─────────────────────────────────────────────────────────────────────────────
test.describe('BUG-001 · timestamps carry a UTC offset', () => {
  test('API: message, conversation and connection timestamps end with Z / ±hh:mm', async () => {
    const a = await seedCompleteCouple(api, 'ts1')
    const b = await seedCompleteCouple(api, 'ts2')
    await connectCouplesViaApi(api, a, b)

    const convId = await getPartnerConversationId(api, a.registrant.username)
    const postRes = await sendTextViaApi(api, a.registrant.username, convId, 'timestamp check')
    expect(postRes.status()).toBe(201)

    const tokenValue = await apiLogin(api, a.registrant.username)
    const auth = { Authorization: `Bearer ${tokenValue}` }

    // GET messages — the value read back from the DB.
    const msgRes = await api.get(`${API_BASE}/conversations/${convId}/messages`, { headers: auth })
    const page = (await msgRes.json()) as { items: Array<{ createdAt: string }> }
    expect(page.items.length).toBeGreaterThan(0)
    expect(page.items[0].createdAt, `messages[].createdAt = ${page.items[0].createdAt}`).toMatch(
      HAS_TZ_OFFSET,
    )

    // GET conversations — lastActivityAt read from the DB.
    const convRes = await api.get(`${API_BASE}/conversations`, { headers: auth })
    const convs = (await convRes.json()) as Array<{ lastActivityAt: string }>
    for (const c of convs) {
      expect(c.lastActivityAt, `conversation.lastActivityAt = ${c.lastActivityAt}`).toMatch(
        HAS_TZ_OFFSET,
      )
    }

    // GET connections — createdAt / acceptedAt read from the DB.
    const connRes = await api.get(`${API_BASE}/connect/connections?status=Accepted`, { headers: auth })
    const conns = (await connRes.json()) as Array<{ createdAt: string; acceptedAt: string | null }>
    expect(conns.length).toBeGreaterThan(0)
    for (const c of conns) {
      expect(c.createdAt, `connection.createdAt = ${c.createdAt}`).toMatch(HAS_TZ_OFFSET)
      if (c.acceptedAt) {
        expect(c.acceptedAt, `connection.acceptedAt = ${c.acceptedAt}`).toMatch(HAS_TZ_OFFSET)
      }
    }
  })

  test('UI (IST): a just-sent message reads "now", never a stale "5h"', async ({ page }) => {
    const a = await seedCompleteCouple(api, 'tsui')
    await loginViaUi(page, a.registrant.username)

    // SPA navigation keeps the in-memory access token, so the thread loads without a boot refresh.
    await page.getByRole('link', { name: 'Messages', exact: true }).click()
    await expect(page).toHaveURL(/\/messages$/)

    // Open the auto-created partner conversation from the list.
    await page.getByRole('button', { name: /Partner/ }).first().click()
    await expect(page).toHaveURL(/\/messages\/.+/)

    const composer = page.getByPlaceholder(/Write a message/)
    await expect(composer).toBeVisible()
    await composer.fill(`hello ${Date.now()}`)
    await page.getByRole('button', { name: 'Send message' }).click()

    // The send invalidates the thread, so the bubble re-renders from the DB value — exactly where a
    // no-`Z` timestamp would resurface as a stale "5h" in this +05:30 timezone.
    await expect(page.getByText('now').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/^\d+[hd]$/)).toHaveCount(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BUG-002 (LOW, visible): the login footer renders a literal "·" escape instead
// of a "·" separator.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('BUG-002 · login separator renders a real character', () => {
  test('the login page never shows a literal \\u00b7 escape', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('link', { name: 'Create our home' })).toBeVisible()
    const body = await page.locator('body').innerText()
    expect(body, 'login copy must not contain a raw unicode escape').not.toContain('\\u00b7')
    // The intended separator is present between the two footer links.
    await expect(page.getByRole('link', { name: 'I have an invitation' })).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BUG-003 (MEDIUM): a couple still in `AwaitingPartner` can send a connection request.
// The request is invisible to the target (GetConnections drops incomplete couples) and
// permanently occupies the between-couples slot, blocking a real future request.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('BUG-003 · only complete couples can send connection requests', () => {
  test('API: an AwaitingPartner couple is refused when requesting a connection', async () => {
    const incomplete = await seedIncompleteCouple(api, 'inc')
    const target = await seedCompleteCouple(api, 'tgt')

    const res = await sendConnectRequest(api, incomplete.registrant.username, target.togetherID)
    expect(
      res.status(),
      `incomplete couple should be refused, got HTTP ${res.status()}: ${await res.text()}`,
    ).toBeGreaterThanOrEqual(400)

    // And the target must have no phantom pending request.
    const targetToken = await apiLogin(api, target.registrant.username)
    const pend = await api.get(`${API_BASE}/connect/connections?status=Pending`, {
      headers: { Authorization: `Bearer ${targetToken}` },
    })
    const pending = (await pend.json()) as Array<{ togetherID: string }>
    expect(pending.find((p) => p.togetherID === incomplete.togetherID)).toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BUG-004 (MEDIUM): the Connect "Pending" tab count badge only appears after the user
// opens the Pending tab, because the pending query is gated by `enabled: activeTab === 'pending'`.
// A notification badge that requires you to already be on the tab is useless.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('BUG-004 · pending-request badge is visible from other tabs', () => {
  test('UI: the Pending badge shows a count on first load (Connected tab)', async ({ page }) => {
    const target = await seedCompleteCouple(api, 'pbA')
    const sender = await seedCompleteCouple(api, 'pbB')
    // sender → target, left pending (not accepted).
    const reqRes = await sendConnectRequest(api, sender.registrant.username, target.togetherID)
    expect(reqRes.status()).toBe(201)

    await loginViaUi(page, target.registrant.username)
    await page.goto('/connect')

    // Default tab is "Connected". The Pending tab must already advertise the incoming request.
    const pendingTab = page.getByRole('button', { name: /Pending/ })
    await expect(pendingTab).toBeVisible()
    await expect(pendingTab).toContainText(/[1-9]/, { timeout: 10_000 })
  })
})
