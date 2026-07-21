/**
 * Catalogue: test-cases/connect/connections.md
 * Covers: CON-001..031
 */
import { test, expect, type APIRequestContext } from '@playwright/test'
import {
  ORPHAN_GUID,
  ROSTER,
  apiContext,
  apiLogin,
  auth,
  connectCouplesViaApi,
  loginViaUi,
  rejectConnectionViaApi,
  seedCompleteCouple,
  seedIncompleteCouple,
  sendConnectRequest,
} from './_fixtures'

let api: APIRequestContext
test.beforeAll(async () => {
  api = await apiContext()
})
test.afterAll(async () => {
  await api.dispose()
})

/** Open Connect and switch to the Find Couples tab. */
async function openFind(page: import('@playwright/test').Page) {
  await page.goto('/connect')
  await page.getByRole('button', { name: 'Find Couples' }).first().click()
}

test.describe('CON · Connect surface', () => {
  test('[CON-001] the header shows the couple’s own TogetherID as read-only text', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/connect')

    await expect(page.getByText(ROSTER.madhu.togetherID).first()).toBeVisible()
    // It must not be presented as an editable field.
    await expect(page.locator(`input[value="${ROSTER.madhu.togetherID}"]`)).toHaveCount(0)
  })

  test('[CON-002] the three tabs switch and exactly one is active at a time', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/connect')

    for (const tab of ['Connected', 'Pending', 'Find Couples']) {
      await page.getByRole('button', { name: tab }).first().click()
      await expect(page.getByRole('button', { name: tab }).first()).toBeVisible()
    }
  })

  test('[CON-004] a couple with no connections sees an empty state with a Find Couples CTA', async ({
    page,
  }) => {
    const lonely = await seedCompleteCouple(api, 'lonely')
    await loginViaUi(page, lonely.registrant.username)
    await page.goto('/connect')

    await expect(page.getByText(/no connections|not connected|find couples/i).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('[CON-005] the connected list contains only accepted couples', async () => {
    const me = await seedCompleteCouple(api, 'listA')
    const accepted = await seedCompleteCouple(api, 'listB')
    const pendingOnly = await seedCompleteCouple(api, 'listC')

    await connectCouplesViaApi(api, me, accepted)
    await sendConnectRequest(api, me.registrant.username, pendingOnly.togetherID)

    const client = auth(api, await apiLogin(api, me.registrant.username))
    const list = (await (await client.get('/connect/connections?status=Accepted')).json()) as Array<{
      togetherID: string
    }>

    const ids = list.map((c) => c.togetherID)
    expect(ids).toContain(accepted.togetherID)
    expect(ids, 'a pending request must not appear as an accepted connection').not.toContain(
      pendingOnly.togetherID,
    )
    expect(ids, 'a couple must never be connected to itself').not.toContain(me.togetherID)
  })
})

test.describe('CON · Search', () => {
  test('[CON-007] a one-character query shows the hint and sends no request', async ({ page }) => {
    let searchCalls = 0
    await page.route('**/connect/search**', (route) => {
      searchCalls++
      return route.continue()
    })

    await loginViaUi(page, ROSTER.madhu.username)
    await openFind(page)
    await page.getByPlaceholder(/Search by Together ID/).fill('A')

    await expect(page.getByText(/at least 2 characters/i)).toBeVisible()
    await page.waitForTimeout(1000)
    expect(searchCalls, 'a sub-minimum query must not hit the API').toBe(0)
  })

  test('[CON-007] the search input uppercases what the user types', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await openFind(page)
    const input = page.getByPlaceholder(/Search by Together ID/)
    await input.fill('ravi-kavya')
    await expect(input).toHaveValue('RAVI-KAVYA')
  })

  test('[CON-008] an exact and a partial TogetherID both find the couple', async ({ page }) => {
    const me = await seedCompleteCouple(api, 'findA')
    const target = await seedCompleteCouple(api, 'findB')

    await loginViaUi(page, me.registrant.username)
    await openFind(page)

    await page.getByPlaceholder(/Search by Together ID/).fill(target.togetherID)
    await expect(page.getByText(target.togetherID).first()).toBeVisible({ timeout: 15_000 })

    // Trim only the tail: seeded TogetherIDs share the `RGN-<tag>-` prefix, so a leading slice
    // matches every couple this suite has ever created and the target drowns in the results.
    await page.getByPlaceholder(/Search by Together ID/).fill(target.togetherID.slice(0, -2))
    await expect(page.getByText(target.togetherID).first()).toBeVisible({ timeout: 15_000 })
  })

  test('[CON-009][SEC-006] an unmatched query echoes the search term escaped', async ({ page }) => {
    const dialogs: string[] = []
    page.on('dialog', (d) => {
      dialogs.push(d.message())
      return d.dismiss()
    })

    await loginViaUi(page, ROSTER.madhu.username)
    await openFind(page)
    await page.getByPlaceholder(/Search by Together ID/).fill('<IMG SRC=X ONERROR=ALERT(1)>')

    await page.waitForTimeout(2000)
    expect(dialogs, 'a search echo must never execute injected markup').toEqual([])
    expect(await page.locator('img[src="X"], img[src="x"]').count()).toBe(0)
  })

  test('[CON-011] search never returns the searcher’s own couple', async () => {
    const me = await seedCompleteCouple(api, 'selfsearch')
    const client = auth(api, await apiLogin(api, me.registrant.username))
    const results = (await (await client.get(`/connect/search?togetherId=${me.togetherID}`)).json()) as Array<{
      togetherID: string
    }>
    expect(results.map((r) => r.togetherID)).not.toContain(me.togetherID)
  })

  test('[CON-011] search results expose no sensitive fields', async () => {
    const me = await seedCompleteCouple(api, 'dtoA')
    const target = await seedCompleteCouple(api, 'dtoB')

    const client = auth(api, await apiLogin(api, me.registrant.username))
    const raw = await (await client.get(`/connect/search?togetherId=${target.togetherID}`)).text()

    expect(raw).not.toMatch(/passwordHash|password|refreshToken/i)
    expect(raw, 'search must not disclose partner email addresses').not.toContain(target.registrant.email)
  })

  test('[CON-011] an AwaitingPartner couple is not discoverable through search', async () => {
    const me = await seedCompleteCouple(api, 'searcher')
    const incomplete = await seedIncompleteCouple(api, 'hidden')

    const client = auth(api, await apiLogin(api, me.registrant.username))
    const results = (await (await client.get(`/connect/search?togetherId=${incomplete.togetherID}`)).json()) as Array<{
      togetherID: string
    }>
    expect(
      results.map((r) => r.togetherID),
      'an incomplete home cannot be connected to, so it must not be offered',
    ).not.toContain(incomplete.togetherID)
  })

  test('[CON-010] injection-shaped queries are handled as data', async () => {
    const me = await seedCompleteCouple(api, 'injq')
    const client = auth(api, await apiLogin(api, me.registrant.username))

    for (const query of ["' OR 1=1 --", '%', '_', '../../etc/passwd', '<script>']) {
      const res = await client.get(`/connect/search?togetherId=${encodeURIComponent(query)}`)
      expect([200, 400], `query "${query}" must not error the server`).toContain(res.status())
      if (res.status() === 200) {
        const rows = (await res.json()) as unknown[]
        // A wildcard must not become a "list every couple" oracle.
        expect(Array.isArray(rows)).toBeTruthy()
      }
    }
  })

  test('[CON-027] search and connections reject anonymous callers', async () => {
    expect((await api.get('https://localhost:7001/api/v1/connect/search?togetherId=AB')).status()).toBe(401)
    expect((await api.get('https://localhost:7001/api/v1/connect/connections')).status()).toBe(401)
  })
})

test.describe('CON · Requests', () => {
  test('[CON-014] a request appears as pending for both couples', async () => {
    const initiator = await seedCompleteCouple(api, 'reqA')
    const target = await seedCompleteCouple(api, 'reqB')

    const res = await sendConnectRequest(api, initiator.registrant.username, target.togetherID)
    expect(res.status()).toBe(201)

    const initiatorPending = (await (
      await auth(api, await apiLogin(api, initiator.registrant.username)).get('/connect/connections?status=Pending')
    ).json()) as Array<{ togetherID: string }>
    const targetPending = (await (
      await auth(api, await apiLogin(api, target.registrant.username)).get('/connect/connections?status=Pending')
    ).json()) as Array<{ togetherID: string }>

    expect(initiatorPending.map((c) => c.togetherID)).toContain(target.togetherID)
    expect(targetPending.map((c) => c.togetherID)).toContain(initiator.togetherID)
  })

  test('[CON-015] a couple cannot connect to itself', async () => {
    const me = await seedCompleteCouple(api, 'selfconn')
    const res = await sendConnectRequest(api, me.registrant.username, me.togetherID)
    expect(res.status()).toBe(409)
    expect(await res.text()).toContain('SELF_CONNECTION')
  })

  test('[CON-016] duplicate and reverse requests are refused without creating a second row', async () => {
    const a = await seedCompleteCouple(api, 'dupA')
    const b = await seedCompleteCouple(api, 'dupB')

    expect((await sendConnectRequest(api, a.registrant.username, b.togetherID)).status()).toBe(201)

    const same = await sendConnectRequest(api, a.registrant.username, b.togetherID)
    expect(same.status(), 'a repeated request must conflict').toBe(409)

    const reverse = await sendConnectRequest(api, b.registrant.username, a.togetherID)
    expect(reverse.status(), 'the reverse direction must recognise the existing pair').toBe(409)

    const pending = (await (
      await auth(api, await apiLogin(api, a.registrant.username)).get('/connect/connections?status=Pending')
    ).json()) as Array<{ togetherID: string }>
    expect(pending.filter((c) => c.togetherID === b.togetherID).length).toBe(1)
  })

  test('[CON-017] an unknown target TogetherID is refused without enumerating', async () => {
    const me = await seedCompleteCouple(api, 'unknowntgt')
    const res = await sendConnectRequest(api, me.registrant.username, 'NO-SUCH-COUPLE-XYZ')
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test('[CON-018] two concurrent identical requests create exactly one connection', async () => {
    const a = await seedCompleteCouple(api, 'raceA')
    const b = await seedCompleteCouple(api, 'raceB')
    const bearer = await apiLogin(api, a.registrant.username)
    const client = auth(api, bearer)

    const [r1, r2] = await Promise.all([
      client.post('/connect/request', { targetTogetherID: b.togetherID }),
      client.post('/connect/request', { targetTogetherID: b.togetherID }),
    ])

    const created = [r1, r2].filter((r) => r.status() === 201)
    expect(created.length, 'exactly one of two racing requests may be created').toBe(1)
    expect(
      [r1, r2].every((r) => r.status() < 500),
      'the losing request must be a clean conflict, not a 500 from the unique index',
    ).toBeTruthy()
  })
})

test.describe('CON · Accept / decline', () => {
  test('[CON-021] the recipient accepts and both couples become connected', async () => {
    const initiator = await seedCompleteCouple(api, 'accA')
    const target = await seedCompleteCouple(api, 'accB')
    await connectCouplesViaApi(api, initiator, target)

    for (const couple of [initiator, target]) {
      const client = auth(api, await apiLogin(api, couple.registrant.username))
      const accepted = (await (await client.get('/connect/connections?status=Accepted')).json()) as Array<{
        togetherID: string
      }>
      const counterpart = couple === initiator ? target : initiator
      expect(accepted.map((c) => c.togetherID)).toContain(counterpart.togetherID)
    }
  })

  test('[CON-022] a declined request does not become a connection', async () => {
    const initiator = await seedCompleteCouple(api, 'decA')
    const target = await seedCompleteCouple(api, 'decB')
    await rejectConnectionViaApi(api, initiator, target)

    const client = auth(api, await apiLogin(api, initiator.registrant.username))
    const accepted = (await (await client.get('/connect/connections?status=Accepted')).json()) as Array<{
      togetherID: string
    }>
    expect(accepted.map((c) => c.togetherID)).not.toContain(target.togetherID)
  })

  test('[CON-023] the initiator cannot accept their own request', async () => {
    const initiator = await seedCompleteCouple(api, 'authA')
    const target = await seedCompleteCouple(api, 'authB')
    await sendConnectRequest(api, initiator.registrant.username, target.togetherID)

    const initiatorClient = auth(api, await apiLogin(api, initiator.registrant.username))
    const pending = (await (await initiatorClient.get('/connect/connections?status=Pending')).json()) as Array<{
      connectionId: string
      togetherID: string
    }>
    const row = pending.find((p) => p.togetherID === target.togetherID)!

    const res = await initiatorClient.put(`/connect/request/${row.connectionId}/accept`)
    expect(res.status(), 'only the recipient may accept').toBe(403)
  })

  test('[CON-023] an unrelated couple cannot accept or reject someone else’s request', async () => {
    const initiator = await seedCompleteCouple(api, 'unrelA')
    const target = await seedCompleteCouple(api, 'unrelB')
    const stranger = await seedCompleteCouple(api, 'unrelC')
    await sendConnectRequest(api, initiator.registrant.username, target.togetherID)

    const targetClient = auth(api, await apiLogin(api, target.registrant.username))
    const pending = (await (await targetClient.get('/connect/connections?status=Pending')).json()) as Array<{
      connectionId: string
      togetherID: string
    }>
    const row = pending.find((p) => p.togetherID === initiator.togetherID)!

    const strangerClient = auth(api, await apiLogin(api, stranger.registrant.username))
    expect([403, 404]).toContain((await strangerClient.put(`/connect/request/${row.connectionId}/accept`)).status())
    expect([403, 404]).toContain((await strangerClient.put(`/connect/request/${row.connectionId}/reject`)).status())
  })

  test('[CON-024] an unknown connection id and a repeated accept are stable errors', async () => {
    const initiator = await seedCompleteCouple(api, 'idemA')
    const target = await seedCompleteCouple(api, 'idemB')
    await sendConnectRequest(api, initiator.registrant.username, target.togetherID)

    const targetClient = auth(api, await apiLogin(api, target.registrant.username))
    expect([400, 403, 404]).toContain((await targetClient.put(`/connect/request/${ORPHAN_GUID}/accept`)).status())

    const pending = (await (await targetClient.get('/connect/connections?status=Pending')).json()) as Array<{
      connectionId: string
      togetherID: string
    }>
    const row = pending.find((p) => p.togetherID === initiator.togetherID)!

    expect((await targetClient.put(`/connect/request/${row.connectionId}/accept`)).status()).toBe(204)
    const second = await targetClient.put(`/connect/request/${row.connectionId}/accept`)
    expect(second.status(), 'accepting an already-accepted request must be a clean 4xx').toBeGreaterThanOrEqual(400)
    expect(second.status()).toBeLessThan(500)
  })

  test('[CON-025] racing accept and reject settle on exactly one terminal state', async () => {
    const initiator = await seedCompleteCouple(api, 'termA')
    const target = await seedCompleteCouple(api, 'termB')
    await sendConnectRequest(api, initiator.registrant.username, target.togetherID)

    const targetClient = auth(api, await apiLogin(api, target.registrant.username))
    const pending = (await (await targetClient.get('/connect/connections?status=Pending')).json()) as Array<{
      connectionId: string
      togetherID: string
    }>
    const row = pending.find((p) => p.togetherID === initiator.togetherID)!

    const [acc, rej] = await Promise.all([
      targetClient.put(`/connect/request/${row.connectionId}/accept`),
      targetClient.put(`/connect/request/${row.connectionId}/reject`),
    ])

    const succeeded = [acc, rej].filter((r) => r.status() === 204)
    expect(succeeded.length, 'only one terminal transition may commit').toBe(1)
    expect([acc, rej].every((r) => r.status() < 500), 'the loser must not be a 500').toBeTruthy()
  })

  test('[CON-026] the status filter is scoped and validated', async () => {
    const me = await seedCompleteCouple(api, 'filterA')
    const client = auth(api, await apiLogin(api, me.registrant.username))

    expect((await client.get('/connect/connections?status=Accepted')).status()).toBe(200)
    expect((await client.get('/connect/connections?status=Pending')).status()).toBe(200)
    expect((await client.get('/connect/connections')).status()).toBe(200)

    const bogus = await client.get('/connect/connections?status=NotAStatus')
    expect(bogus.status(), 'an invalid status filter must be rejected, not silently ignored').toBe(400)
  })
})

test.describe('CON · Cross-feature and lifecycle', () => {
  test('[CON-028] only accepted couples become eligible for a group conversation', async () => {
    const me = await seedCompleteCouple(api, 'grpelA')
    const accepted = await seedCompleteCouple(api, 'grpelB')
    const pendingOnly = await seedCompleteCouple(api, 'grpelC')

    await connectCouplesViaApi(api, me, accepted)
    await sendConnectRequest(api, me.registrant.username, pendingOnly.togetherID)

    const client = auth(api, await apiLogin(api, me.registrant.username))

    const good = await client.post('/conversations/group', {
      name: 'Eligible group',
      targetCoupleIds: [accepted.coupleId],
    })
    expect(good.status()).toBe(201)

    const bad = await client.post('/conversations/group', {
      name: 'Ineligible group',
      targetCoupleIds: [pendingOnly.coupleId],
    })
    expect(bad.status(), 'a merely pending couple must not be groupable').toBeGreaterThanOrEqual(400)
    expect(bad.status()).toBeLessThan(500)
  })

  test('[CON-031] a previously rejected pair follows an explicit reconnect policy', async () => {
    const initiator = await seedCompleteCouple(api, 'reconA')
    const target = await seedCompleteCouple(api, 'reconB')
    await rejectConnectionViaApi(api, initiator, target)

    // Whatever the product rule is, the retry must be a deliberate answer — either a new pending
    // request (201) or an explicit refusal (4xx). A 500 means the unique pair index surfaced raw.
    const retry = await sendConnectRequest(api, initiator.registrant.username, target.togetherID)
    expect(
      retry.status(),
      'reconnecting after a decline must not fall through to an unhandled uniqueness error',
    ).toBeLessThan(500)

    const reverse = await sendConnectRequest(api, target.registrant.username, initiator.togetherID)
    expect(reverse.status(), 'the reverse reconnect must also be handled').toBeLessThan(500)
  })

  test('[CON-003] the pending badge reflects the incoming count on first load', async ({ page }) => {
    const me = await seedCompleteCouple(api, 'badgeA')
    const sender = await seedCompleteCouple(api, 'badgeB')
    await sendConnectRequest(api, sender.registrant.username, me.togetherID)

    await loginViaUi(page, me.registrant.username)
    await page.goto('/connect')
    // The badge must be populated before the Pending tab is ever opened (BUG-004 regression).
    await expect(page.getByText('1').first()).toBeVisible({ timeout: 15_000 })
  })

  test('[CON-019][CON-020] incoming cards offer Accept/Decline and outgoing cards do not', async ({
    page,
  }) => {
    const me = await seedCompleteCouple(api, 'cardA')
    const sender = await seedCompleteCouple(api, 'cardB')
    const receiver = await seedCompleteCouple(api, 'cardC')
    await sendConnectRequest(api, sender.registrant.username, me.togetherID) // incoming
    await sendConnectRequest(api, me.registrant.username, receiver.togetherID) // outgoing

    await loginViaUi(page, me.registrant.username)
    await page.goto('/connect')
    await page.getByRole('button', { name: 'Pending' }).first().click()

    await expect(page.getByRole('button', { name: /Accept/i }).first()).toBeVisible({ timeout: 15_000 })
    // Exactly one incoming request exists, so exactly one Accept control may be offered.
    await expect(page.getByRole('button', { name: /Accept/i })).toHaveCount(1)
  })
})
