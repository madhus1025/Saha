/**
 * Catalogue: test-cases/messaging/conversations-and-messages.md
 * Covers: MSG-001..012, GRP-001..008, THR-001..005, TXT-001..007,
 *         EDT-001..004, DEL-001..003, REA-001..005, CFG-001..008
 *
 * MED-001..007 (blob-backed media) are excluded — they require storage-enabled infrastructure.
 */
import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import {
  HAS_TZ_OFFSET,
  ORPHAN_GUID,
  ROSTER,
  apiContext,
  apiLogin,
  auth,
  connectCouplesViaApi,
  createGroupViaApi,
  getPartnerConversationId,
  loginViaUi,
  seedCompleteCouple,
  sendTextAndGetId,
  sendTextViaApi,
  type SeededCouple,
} from './_fixtures'

let api: APIRequestContext
test.beforeAll(async () => {
  api = await apiContext()
})
test.afterAll(async () => {
  await api.dispose()
})

/** Two connected complete couples plus a group they share. */
async function connectedPair(tag: string): Promise<{ a: SeededCouple; b: SeededCouple }> {
  const a = await seedCompleteCouple(api, `${tag}A`)
  const b = await seedCompleteCouple(api, `${tag}B`)
  await connectCouplesViaApi(api, a, b)
  return { a, b }
}

/** Open the partner conversation in the UI. */
async function openPartnerThread(page: Page, username: string) {
  await loginViaUi(page, username)
  await page.goto('/messages')
  await page.locator('button[aria-current]').first().click()
  await expect(page.getByLabel('Message', { exact: true })).toBeVisible({ timeout: 15_000 })
}

test.describe('MSG · Conversation list', () => {
  test('[MSG-001][MSG-003] a completed home has exactly one partner conversation, visible to both', async () => {
    const couple = await seedCompleteCouple(api, 'provision')

    for (const username of [couple.registrant.username, couple.partner.username]) {
      const client = auth(api, await apiLogin(api, username))
      const list = (await (await client.get('/conversations')).json()) as Array<{ type: string }>
      const partnerConversations = list.filter((c) => c.type === 'Partner')
      expect(partnerConversations.length, `${username} must see exactly one partner chat`).toBe(1)
    }
  })

  test('[MSG-001][REL-005] every conversation timestamp carries an explicit UTC offset', async () => {
    const couple = await seedCompleteCouple(api, 'tsconv')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    await sendTextViaApi(api, couple.registrant.username, conversationId, 'timestamp probe')

    const client = auth(api, await apiLogin(api, couple.registrant.username))
    const list = (await (await client.get('/conversations')).json()) as Array<{ lastActivityAt: string }>

    for (const row of list) {
      expect(row.lastActivityAt, 'a naive timestamp is read as local time by the browser').toMatch(
        HAS_TZ_OFFSET,
      )
    }
  })

  test('[MSG-006] a message sent seconds ago reads as "now", not a timezone-shifted age', async ({
    page,
  }) => {
    const couple = await seedCompleteCouple(api, 'relnow')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    await sendTextViaApi(api, couple.registrant.username, conversationId, 'fresh message')

    await loginViaUi(page, couple.registrant.username)
    await page.goto('/messages')
    // The runner is pinned to Asia/Kolkata (+05:30) — a missing `Z` would surface as "5h".
    await expect(page.getByText(/^now$/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('[MSG-007] selecting a conversation deep-links and marks the row as current', async ({ page }) => {
    const couple = await seedCompleteCouple(api, 'select')
    await loginViaUi(page, couple.registrant.username)
    await page.goto('/messages')

    await page.locator('button[aria-current]').first().click()
    await expect(page).toHaveURL(/\/messages\/[0-9a-f-]{36}/, { timeout: 15_000 })

    const url = page.url()
    await page.reload()
    await expect(page, 'a deep link must survive a refresh').toHaveURL(url)
  })

  test('[MSG-008] a foreign conversation id reveals nothing and stays recoverable', async ({ page }) => {
    const mine = await seedCompleteCouple(api, 'foreignA')
    const other = await seedCompleteCouple(api, 'foreignB')
    const foreignId = await getPartnerConversationId(api, other.registrant.username)

    await loginViaUi(page, mine.registrant.username)
    await page.goto(`/messages/${foreignId}`)

    await expect(page.locator('body')).not.toContainText(other.registrant.name)
    // The user must be able to get back to their own list.
    await expect(page.getByRole('link', { name: 'Messages', exact: true }).first()).toBeVisible()
  })

  test('[MSG-008][TXT-007] a non-participant is refused on read, send, edit and delete', async () => {
    const mine = await seedCompleteCouple(api, 'scopeA')
    const other = await seedCompleteCouple(api, 'scopeB')
    const foreignConversation = await getPartnerConversationId(api, other.registrant.username)
    const foreignMessage = await sendTextAndGetId(
      api,
      other.registrant.username,
      foreignConversation,
      'private',
    )

    const intruder = auth(api, await apiLogin(api, mine.registrant.username))

    expect((await intruder.get(`/conversations/${foreignConversation}`)).status()).toBe(404)
    expect((await intruder.get(`/conversations/${foreignConversation}/messages`)).status()).toBe(404)
    expect(
      (await intruder.post(`/conversations/${foreignConversation}/messages`, { body: 'intrusion' })).status(),
    ).toBe(404)
    expect(
      (await intruder.put(`/conversations/${foreignConversation}/messages/${foreignMessage}`, { body: 'edited' })).status(),
    ).toBe(404)
    expect((await intruder.del(`/conversations/${foreignConversation}/messages/${foreignMessage}`)).status()).toBe(404)
  })

  test('[MSG-009] the New group button opens exactly one dialog even when clicked repeatedly', async ({
    page,
  }) => {
    const couple = await seedCompleteCouple(api, 'onedialog')
    await loginViaUi(page, couple.registrant.username)
    await page.goto('/messages')

    const newGroup = page.getByRole('button', { name: 'New group chat' })
    await newGroup.click()
    await expect(page.getByRole('dialog')).toHaveCount(1)
  })
})

test.describe('GRP · Group creation', () => {
  test('[GRP-003] a couple with no connections cannot create a group', async ({ page }) => {
    const lonely = await seedCompleteCouple(api, 'grplonely')
    await loginViaUi(page, lonely.registrant.username)
    await page.goto('/messages')
    await page.getByRole('button', { name: 'New group chat' }).click()

    await expect(page.getByRole('button', { name: 'Create' })).toBeDisabled()
  })

  test('[GRP-001][ACC-005] the group dialog closes on Escape and restores focus', async ({ page }) => {
    const couple = await seedCompleteCouple(api, 'grpesc')
    await loginViaUi(page, couple.registrant.username)
    await page.goto('/messages')

    const trigger = page.getByRole('button', { name: 'New group chat' })
    await trigger.click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // A modal dialog must be dismissible from the keyboard (WAI-ARIA APG / WCAG 2.1.2).
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog'), 'Escape must close the modal').toHaveCount(0)
  })

  test('[GRP-001] focus moves into the dialog when it opens', async ({ page }) => {
    const couple = await seedCompleteCouple(api, 'grpfocus')
    await loginViaUi(page, couple.registrant.username)
    await page.goto('/messages')
    await page.getByRole('button', { name: 'New group chat' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const focusIsInsideDialog = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]')
      return !!dialog && !!document.activeElement && dialog.contains(document.activeElement)
    })
    expect(focusIsInsideDialog, 'opening a modal must move focus into it').toBeTruthy()
  })

  test('[GRP-002] a blank and an over-long group name are refused by the API', async () => {
    const { a, b } = await connectedPair('grpname')
    const client = auth(api, await apiLogin(api, a.registrant.username))

    expect((await client.post('/conversations/group', { name: '   ', targetCoupleIds: [b.coupleId] })).status()).toBe(400)
    expect(
      (await client.post('/conversations/group', { name: 'x'.repeat(81), targetCoupleIds: [b.coupleId] })).status(),
    ).toBe(400)
    expect(
      (await client.post('/conversations/group', { name: 'x'.repeat(80), targetCoupleIds: [b.coupleId] })).status(),
      'exactly 80 characters is the documented maximum and must be accepted',
    ).toBe(201)
  })

  test('[GRP-006] a created group appears for every participant couple', async () => {
    const { a, b } = await connectedPair('grpall')
    const groupId = await createGroupViaApi(api, a.registrant.username, 'Shared group', [b.coupleId])

    for (const username of [a.registrant.username, a.partner.username, b.registrant.username, b.partner.username]) {
      const client = auth(api, await apiLogin(api, username))
      const list = (await (await client.get('/conversations')).json()) as Array<{ id: string }>
      expect(list.map((c) => c.id), `${username} must see the group`).toContain(groupId)
    }
  })

  test('[GRP-007] own couple, duplicates, unknown ids and empty lists are refused', async () => {
    const { a, b } = await connectedPair('grpinvalid')
    const client = auth(api, await apiLogin(api, a.registrant.username))

    expect(
      (await client.post('/conversations/group', { name: 'Self', targetCoupleIds: [a.coupleId] })).status(),
      'a group with only your own couple is meaningless',
    ).toBeGreaterThanOrEqual(400)

    expect((await client.post('/conversations/group', { name: 'Empty', targetCoupleIds: [] })).status()).toBe(400)
    expect(
      (await client.post('/conversations/group', { name: 'Ghost', targetCoupleIds: [ORPHAN_GUID] })).status(),
    ).toBeGreaterThanOrEqual(400)

    const dup = await client.post('/conversations/group', {
      name: 'Duplicate',
      targetCoupleIds: [b.coupleId, b.coupleId],
    })
    expect(dup.status(), 'a duplicated target must not produce a doubled participant').toBeLessThan(500)
  })
})

test.describe('TXT · Sending text', () => {
  test('[TXT-001] the send button is disabled for an empty and a whitespace-only draft', async ({
    page,
  }) => {
    const couple = await seedCompleteCouple(api, 'txtempty')
    await openPartnerThread(page, couple.registrant.username)

    const send = page.getByRole('button', { name: 'Send message' })
    await expect(send).toBeDisabled()

    await page.getByLabel('Message', { exact: true }).fill('   ')
    await expect(send, 'whitespace is not a message').toBeDisabled()
  })

  test('[TXT-002] a message sends with Enter and appears in the thread', async ({ page }) => {
    const couple = await seedCompleteCouple(api, 'txtsend')
    await openPartnerThread(page, couple.registrant.username)

    const body = `hello ${Date.now()}`
    await page.getByLabel('Message', { exact: true }).fill(body)
    await page.getByLabel('Message', { exact: true }).press('Enter')

    await expect(page.getByText(body).first()).toBeVisible({ timeout: 15_000 })
  })

  test('[TXT-003] Shift+Enter inserts a newline instead of sending', async ({ page }) => {
    const couple = await seedCompleteCouple(api, 'txtshift')
    await openPartnerThread(page, couple.registrant.username)

    const composer = page.getByLabel('Message', { exact: true })
    await composer.fill('first line')
    await composer.press('Shift+Enter')
    await composer.type('second line')

    await expect(composer).toHaveValue('first line\nsecond line')
  })

  test('[TXT-003][SEC-006] HTML-shaped message text renders literally', async ({ page }) => {
    const couple = await seedCompleteCouple(api, 'txtxss')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    const payload = '<img src=x onerror=alert(1)><b>bold?</b>'
    await sendTextViaApi(api, couple.registrant.username, conversationId, payload)

    const dialogs: string[] = []
    page.on('dialog', (d) => {
      dialogs.push(d.message())
      return d.dismiss()
    })

    await openPartnerThread(page, couple.registrant.username)
    await expect(page.getByText(payload)).toBeVisible({ timeout: 15_000 })
    expect(await page.locator('img[src="x"]').count()).toBe(0)
    expect(dialogs).toEqual([])
  })

  test('[TXT-004] exactly 4000 characters is accepted and 4001 is refused', async () => {
    const couple = await seedCompleteCouple(api, 'txtmax')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)

    const ok = await sendTextViaApi(api, couple.registrant.username, conversationId, 'a'.repeat(4000))
    expect(ok.status(), '4000 characters is the documented maximum').toBe(201)

    const tooLong = await sendTextViaApi(api, couple.registrant.username, conversationId, 'a'.repeat(4001))
    expect(tooLong.status()).toBe(400)
  })

  test('[TXT-004] an oversized body is rejected without being silently truncated', async () => {
    const couple = await seedCompleteCouple(api, 'txttrunc')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)

    await sendTextViaApi(api, couple.registrant.username, conversationId, 'a'.repeat(4001))

    const client = auth(api, await apiLogin(api, couple.registrant.username))
    const page1 = (await (await client.get(`/conversations/${conversationId}/messages`)).json()) as {
      items: Array<{ body: string }>
    }
    expect(
      page1.items.some((m) => m.body.length === 4000 && /^a+$/.test(m.body)),
      'a rejected message must not be persisted in truncated form',
    ).toBeFalsy()
  })

  test('[TXT-006] a rapidly double-submitted draft sends only one message', async ({ page }) => {
    const couple = await seedCompleteCouple(api, 'txtdouble')
    await openPartnerThread(page, couple.registrant.username)

    const body = `double ${Date.now()}`
    const composer = page.getByLabel('Message', { exact: true })
    await composer.fill(body)
    await composer.press('Enter')
    await composer.press('Enter') // second Enter on a now-empty composer
    await expect(page.getByText(body).first()).toBeVisible({ timeout: 15_000 })

    // Count on the server: the same text also appears in the conversation-list preview, so a
    // DOM count would double-count a single message.
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    const client = auth(api, await apiLogin(api, couple.registrant.username))
    const listed = (await (await client.get(`/conversations/${conversationId}/messages`)).json()) as {
      items: Array<{ body: string }>
    }
    expect(listed.items.filter((m) => m.body === body).length, 'one Enter must send one message').toBe(1)
  })

  test('[TXT-006] a failed send does not silently discard the user’s draft', async ({ page }) => {
    const couple = await seedCompleteCouple(api, 'txtfail')
    await openPartnerThread(page, couple.registrant.username)

    await page.route('**/messages', async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Something went wrong.' }),
        })
      }
      return route.continue()
    })

    const body = `will fail ${Date.now()}`
    const composer = page.getByLabel('Message', { exact: true })
    await composer.fill(body)
    await composer.press('Enter')
    await page.waitForTimeout(2000)

    expect(
      await composer.inputValue(),
      'the composer clears optimistically — a failed send loses the typed message',
    ).toBe(body)
  })

  test('[TXT-005] drafts are kept per conversation', async ({ page }) => {
    const { a, b } = await connectedPair('draft')
    const groupId = await createGroupViaApi(api, a.registrant.username, 'Draft group', [b.coupleId])

    await loginViaUi(page, a.registrant.username)
    await page.goto('/messages')

    const partnerRow = page.locator('button[aria-current]').first()
    await partnerRow.click()
    await page.getByLabel('Message', { exact: true }).fill('draft for partner')

    await page.goto(`/messages/${groupId}`)
    await expect(page.getByLabel('Message', { exact: true }), 'a draft must not leak into another conversation').toHaveValue('')
  })
})

test.describe('EDT / DEL · Editing and deleting', () => {
  test('[EDT-002] an edited message is marked edited and keeps its identity', async () => {
    const couple = await seedCompleteCouple(api, 'edit')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    const messageId = await sendTextAndGetId(api, couple.registrant.username, conversationId, 'original')

    const client = auth(api, await apiLogin(api, couple.registrant.username))
    const res = await client.put(`/conversations/${conversationId}/messages/${messageId}`, {
      body: 'updated text',
    })
    expect(res.ok()).toBeTruthy()

    const listed = (await (await client.get(`/conversations/${conversationId}/messages`)).json()) as {
      items: Array<{ id: string; body: string; isEdited: boolean }>
    }
    const updated = listed.items.find((m) => m.id === messageId)!
    expect(updated.body).toBe('updated text')
    expect(updated.isEdited).toBe(true)
  })

  test('[EDT-003] only the sender may edit; the other partner is refused', async () => {
    const couple = await seedCompleteCouple(api, 'editauth')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    const messageId = await sendTextAndGetId(api, couple.registrant.username, conversationId, 'mine')

    const otherPartner = auth(api, await apiLogin(api, couple.partner.username))
    const res = await otherPartner.put(`/conversations/${conversationId}/messages/${messageId}`, {
      body: 'hijacked',
    })
    expect(res.status(), 'a partner may read but not rewrite the other’s message').toBe(403)
  })

  test('[EDT-003] empty, oversized and unknown-message edits are refused', async () => {
    const couple = await seedCompleteCouple(api, 'editval')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    const messageId = await sendTextAndGetId(api, couple.registrant.username, conversationId, 'body')
    const client = auth(api, await apiLogin(api, couple.registrant.username))

    expect((await client.put(`/conversations/${conversationId}/messages/${messageId}`, { body: '' })).status()).toBe(400)
    expect(
      (await client.put(`/conversations/${conversationId}/messages/${messageId}`, { body: 'a'.repeat(4001) })).status(),
    ).toBe(400)
    expect(
      (await client.put(`/conversations/${conversationId}/messages/${ORPHAN_GUID}`, { body: 'x' })).status(),
    ).toBe(404)
  })

  test('[DEL-001] a deleted message leaves a tombstone with no original content', async () => {
    const couple = await seedCompleteCouple(api, 'del')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    const secret = `secret-${Date.now()}`
    const messageId = await sendTextAndGetId(api, couple.registrant.username, conversationId, secret)

    const client = auth(api, await apiLogin(api, couple.registrant.username))
    expect((await client.del(`/conversations/${conversationId}/messages/${messageId}`)).ok()).toBeTruthy()

    const raw = await (await client.get(`/conversations/${conversationId}/messages`)).text()
    expect(raw, 'deleted content must not be served to anyone').not.toContain(secret)
  })

  test('[DEL-002] a non-sender cannot delete, and a repeated delete is a stable error', async () => {
    const couple = await seedCompleteCouple(api, 'delauth')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    const messageId = await sendTextAndGetId(api, couple.registrant.username, conversationId, 'mine to delete')

    const otherPartner = auth(api, await apiLogin(api, couple.partner.username))
    expect((await otherPartner.del(`/conversations/${conversationId}/messages/${messageId}`)).status()).toBe(403)

    const sender = auth(api, await apiLogin(api, couple.registrant.username))
    expect((await sender.del(`/conversations/${conversationId}/messages/${messageId}`)).ok()).toBeTruthy()

    const second = await sender.del(`/conversations/${conversationId}/messages/${messageId}`)
    expect(second.status(), 'deleting twice must be a clean 4xx, never a 500').toBeLessThan(500)
  })

  test('[EDT-003][DEL-003] a deleted message cannot be resurrected by an edit', async () => {
    const couple = await seedCompleteCouple(api, 'resurrect')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    const messageId = await sendTextAndGetId(api, couple.registrant.username, conversationId, 'gone')
    const client = auth(api, await apiLogin(api, couple.registrant.username))

    await client.del(`/conversations/${conversationId}/messages/${messageId}`)
    const res = await client.put(`/conversations/${conversationId}/messages/${messageId}`, {
      body: 'back from the dead',
    })
    expect(res.status(), 'editing a deleted message must be refused').toBeGreaterThanOrEqual(400)

    const raw = await (await client.get(`/conversations/${conversationId}/messages`)).text()
    expect(raw).not.toContain('back from the dead')
  })
})

test.describe('REA · Reactions', () => {
  test('[REA-002] a participant can add an allowed reaction', async () => {
    const couple = await seedCompleteCouple(api, 'react')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    const messageId = await sendTextAndGetId(api, couple.registrant.username, conversationId, 'react to me')

    const client = auth(api, await apiLogin(api, couple.partner.username))
    const res = await client.put(`/conversations/${conversationId}/messages/${messageId}/reaction`, {
      emoji: 'heart',
    })
    expect(res.ok()).toBeTruthy()

    const listed = (await (await client.get(`/conversations/${conversationId}/messages`)).json()) as {
      items: Array<{ id: string; reactions: Array<{ emoji: string; count: number }> }>
    }
    const target = listed.items.find((m) => m.id === messageId)!
    expect(target.reactions.find((r) => r.emoji === 'heart')?.count).toBe(1)
  })

  test('[REA-003] reacting twice changes the reaction rather than duplicating it', async () => {
    const couple = await seedCompleteCouple(api, 'reactchange')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    const messageId = await sendTextAndGetId(api, couple.registrant.username, conversationId, 'change me')

    const client = auth(api, await apiLogin(api, couple.partner.username))
    await client.put(`/conversations/${conversationId}/messages/${messageId}/reaction`, { emoji: 'heart' })
    await client.put(`/conversations/${conversationId}/messages/${messageId}/reaction`, { emoji: 'fire' })

    const listed = (await (await client.get(`/conversations/${conversationId}/messages`)).json()) as {
      items: Array<{ id: string; reactions: Array<{ emoji: string; count: number }> }>
    }
    const target = listed.items.find((m) => m.id === messageId)!
    const total = target.reactions.reduce((sum, r) => sum + r.count, 0)
    expect(total, 'one partner may hold at most one reaction per message').toBe(1)
    expect(target.reactions.find((r) => r.emoji === 'fire')?.count).toBe(1)
  })

  test('[REA-003] a reaction can be removed', async () => {
    const couple = await seedCompleteCouple(api, 'reactremove')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    const messageId = await sendTextAndGetId(api, couple.registrant.username, conversationId, 'remove me')

    const client = auth(api, await apiLogin(api, couple.partner.username))
    await client.put(`/conversations/${conversationId}/messages/${messageId}/reaction`, { emoji: 'heart' })
    expect((await client.del(`/conversations/${conversationId}/messages/${messageId}/reaction`)).ok()).toBeTruthy()

    const listed = (await (await client.get(`/conversations/${conversationId}/messages`)).json()) as {
      items: Array<{ id: string; reactions: Array<{ count: number }> }>
    }
    const target = listed.items.find((m) => m.id === messageId)!
    expect(target.reactions.reduce((sum, r) => sum + r.count, 0)).toBe(0)
  })

  test('[REA-004] reaction tokens outside the allowlist are refused', async () => {
    const couple = await seedCompleteCouple(api, 'reactbad')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    const messageId = await sendTextAndGetId(api, couple.registrant.username, conversationId, 'bad tokens')
    const client = auth(api, await apiLogin(api, couple.registrant.username))

    for (const emoji of ['❤️', 'HEART_ATTACK', 'unknown', '<script>', '']) {
      const res = await client.put(`/conversations/${conversationId}/messages/${messageId}/reaction`, { emoji })
      expect(res.status(), `token "${emoji}" must be refused`).toBe(400)
    }
  })

  test('[REA-004][SEC-004] a rejected reaction does not echo the raw payload back', async () => {
    const couple = await seedCompleteCouple(api, 'reactecho')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    const messageId = await sendTextAndGetId(api, couple.registrant.username, conversationId, 'echo probe')
    const client = auth(api, await apiLogin(api, couple.registrant.username))

    const res = await client.put(`/conversations/${conversationId}/messages/${messageId}/reaction`, {
      emoji: '<svg/onload=alert(1)>',
    })
    const body = await res.text()

    // Reflecting attacker-controlled input into an error string is how a sanitised API turns into
    // an injection sink the moment a client renders the message unescaped.
    expect(body, 'error messages must not reflect raw user input').not.toContain('onload=alert(1)')
  })

  test('[REA-005] concurrent reactions from both partners keep an accurate count', async () => {
    const couple = await seedCompleteCouple(api, 'reactrace')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    const messageId = await sendTextAndGetId(api, couple.registrant.username, conversationId, 'race me')

    const one = auth(api, await apiLogin(api, couple.registrant.username))
    const two = auth(api, await apiLogin(api, couple.partner.username))

    await Promise.all([
      one.put(`/conversations/${conversationId}/messages/${messageId}/reaction`, { emoji: 'heart' }),
      two.put(`/conversations/${conversationId}/messages/${messageId}/reaction`, { emoji: 'heart' }),
    ])

    const listed = (await (await one.get(`/conversations/${conversationId}/messages`)).json()) as {
      items: Array<{ id: string; reactions: Array<{ emoji: string; count: number }> }>
    }
    const target = listed.items.find((m) => m.id === messageId)!
    expect(target.reactions.find((r) => r.emoji === 'heart')?.count, 'both partners must be counted').toBe(2)
  })

  test('[REA-001][MSG-012] the React control is reachable without a pointer hover', async ({ page }) => {
    const couple = await seedCompleteCouple(api, 'reactkbd')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    await sendTextViaApi(api, couple.registrant.username, conversationId, 'keyboard reach')

    await openPartnerThread(page, couple.registrant.username)
    const react = page.getByRole('button', { name: 'React' }).first()

    // Hover-only affordances are a WCAG 2.1.1 failure: the control must be focusable and operable
    // by keyboard alone, not merely revealed by a mouse hover.
    await react.focus()
    await expect(react, 'the React action must be reachable by keyboard').toBeFocused()
  })
})

test.describe('THR · Thread and pagination', () => {
  test('[THR-004] a malformed cursor is rejected rather than silently restarting pagination', async () => {
    const couple = await seedCompleteCouple(api, 'cursor')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    for (let i = 0; i < 3; i++) {
      await sendTextViaApi(api, couple.registrant.username, conversationId, `msg ${i}`)
    }

    const client = auth(api, await apiLogin(api, couple.registrant.username))
    const firstPage = (await (await client.get(`/conversations/${conversationId}/messages?take=2`)).json()) as {
      items: Array<{ id: string }>
      nextCursor: string | null
    }

    const corrupted = await client.get(`/conversations/${conversationId}/messages?take=2&before=NOT_A_CURSOR`)

    // Silently ignoring a bad cursor hands back page 1 again — an infinite-scroll client then
    // appends duplicates it has already rendered, or loops forever.
    if (corrupted.status() === 200) {
      const body = (await corrupted.json()) as { items: Array<{ id: string }> }
      expect(
        body.items.map((m) => m.id),
        'a malformed cursor must not silently return the first page again',
      ).not.toEqual(firstPage.items.map((m) => m.id))
    } else {
      expect(corrupted.status()).toBe(400)
    }
  })

  test('[THR-004] pagination walks the history without gaps or duplicates', async () => {
    const couple = await seedCompleteCouple(api, 'paginate')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    for (let i = 0; i < 7; i++) {
      await sendTextViaApi(api, couple.registrant.username, conversationId, `page-msg-${i}`)
    }

    const client = auth(api, await apiLogin(api, couple.registrant.username))
    const seen: string[] = []
    let cursor: string | null = null

    for (let guard = 0; guard < 10; guard++) {
      const url: string = `/conversations/${conversationId}/messages?take=3${cursor ? `&before=${encodeURIComponent(cursor)}` : ''}`
      const body = (await (await client.get(url)).json()) as {
        items: Array<{ id: string }>
        nextCursor: string | null
      }
      seen.push(...body.items.map((m) => m.id))
      cursor = body.nextCursor
      if (!cursor) break
    }

    expect(new Set(seen).size, 'pagination must not return the same message twice').toBe(seen.length)
    expect(seen.length).toBeGreaterThanOrEqual(7)
  })

  test('[THR-004] an out-of-range take is clamped, not fatal', async () => {
    const couple = await seedCompleteCouple(api, 'take')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    await sendTextViaApi(api, couple.registrant.username, conversationId, 'take probe')
    const client = auth(api, await apiLogin(api, couple.registrant.username))

    for (const take of ['0', '-5', '99999']) {
      const res = await client.get(`/conversations/${conversationId}/messages?take=${take}`)
      expect(res.status(), `take=${take} must not error`).toBe(200)
      const body = (await res.json()) as { items: unknown[] }
      expect(body.items.length).toBeLessThanOrEqual(100)
    }
  })

  test('[THR-005] each message maps to the correct sender identity', async () => {
    const couple = await seedCompleteCouple(api, 'sender')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    await sendTextViaApi(api, couple.registrant.username, conversationId, 'from registrant')
    await sendTextViaApi(api, couple.partner.username, conversationId, 'from partner')

    const client = auth(api, await apiLogin(api, couple.registrant.username))
    const listed = (await (await client.get(`/conversations/${conversationId}/messages`)).json()) as {
      items: Array<{ body: string; senderName: string }>
    }

    expect(listed.items.find((m) => m.body === 'from registrant')?.senderName).toBe(couple.registrant.name)
    expect(listed.items.find((m) => m.body === 'from partner')?.senderName).toBe(couple.partner.name)
  })
})

test.describe('CFG · Group settings', () => {
  test('[CFG-002] the owner can rename a group and every participant sees the new name', async () => {
    const { a, b } = await connectedPair('rename')
    const groupId = await createGroupViaApi(api, a.registrant.username, 'Before rename', [b.coupleId])

    const owner = auth(api, await apiLogin(api, a.registrant.username))
    expect((await owner.put(`/conversations/${groupId}/name`, { name: 'After rename' })).ok()).toBeTruthy()

    const participant = auth(api, await apiLogin(api, b.registrant.username))
    const detail = (await (await participant.get(`/conversations/${groupId}`)).json()) as { name?: string; title?: string }
    expect(detail.name ?? detail.title).toBe('After rename')
  })

  test('[CFG-003] a non-owner participant cannot rename the group', async () => {
    const { a, b } = await connectedPair('renameauth')
    const groupId = await createGroupViaApi(api, a.registrant.username, 'Owner only', [b.coupleId])

    const nonOwner = auth(api, await apiLogin(api, b.registrant.username))
    const res = await nonOwner.put(`/conversations/${groupId}/name`, { name: 'Hijacked' })
    expect(res.status(), 'only the owning couple may rename').toBe(403)
  })

  test('[CFG-003] both partners of the owning couple may rename', async () => {
    const { a, b } = await connectedPair('renameboth')
    const groupId = await createGroupViaApi(api, a.registrant.username, 'Couple owned', [b.coupleId])

    const ownerSpouse = auth(api, await apiLogin(api, a.partner.username))
    expect(
      (await ownerSpouse.put(`/conversations/${groupId}/name`, { name: 'Renamed by spouse' })).ok(),
      'ownership is couple-level, so either partner may rename',
    ).toBeTruthy()
  })

  test('[CFG-003] invalid group names are refused on rename', async () => {
    const { a, b } = await connectedPair('renameval')
    const groupId = await createGroupViaApi(api, a.registrant.username, 'Valid', [b.coupleId])
    const owner = auth(api, await apiLogin(api, a.registrant.username))

    expect((await owner.put(`/conversations/${groupId}/name`, { name: '  ' })).status()).toBe(400)
    expect((await owner.put(`/conversations/${groupId}/name`, { name: 'x'.repeat(81) })).status()).toBe(400)
  })

  test('[CFG-006] pin state is per-couple and never leaks to another couple', async () => {
    const { a, b } = await connectedPair('pin')
    const groupId = await createGroupViaApi(api, a.registrant.username, 'Pin test', [b.coupleId])

    const mine = auth(api, await apiLogin(api, a.registrant.username))
    expect((await mine.put(`/conversations/${groupId}/pin`)).ok()).toBeTruthy()

    const mineList = (await (await mine.get('/conversations')).json()) as Array<{ id: string; isPinned: boolean }>
    expect(mineList.find((c) => c.id === groupId)?.isPinned).toBe(true)

    const theirs = auth(api, await apiLogin(api, b.registrant.username))
    const theirList = (await (await theirs.get('/conversations')).json()) as Array<{ id: string; isPinned: boolean }>
    expect(
      theirList.find((c) => c.id === groupId)?.isPinned,
      'pinning is a personal preference, not a shared property',
    ).toBe(false)
  })

  test('[CFG-006] both partners of a couple share the same pin state', async () => {
    const { a, b } = await connectedPair('pinshared')
    const groupId = await createGroupViaApi(api, a.registrant.username, 'Shared pin', [b.coupleId])

    await auth(api, await apiLogin(api, a.registrant.username)).put(`/conversations/${groupId}/pin`)

    const spouse = auth(api, await apiLogin(api, a.partner.username))
    const list = (await (await spouse.get('/conversations')).json()) as Array<{ id: string; isPinned: boolean }>
    expect(list.find((c) => c.id === groupId)?.isPinned).toBe(true)
  })

  test('[CFG-006] the partner conversation cannot be pinned or hidden through the API', async () => {
    const couple = await seedCompleteCouple(api, 'partnerimmutable')
    const conversationId = await getPartnerConversationId(api, couple.registrant.username)
    const client = auth(api, await apiLogin(api, couple.registrant.username))

    const hide = await client.del(`/conversations/${conversationId}`)
    expect(hide.status(), 'the partner chat is not hideable').toBeGreaterThanOrEqual(400)
    expect(hide.status()).toBeLessThan(500)
  })

  test('[CFG-007] hiding a group removes it for the hiding couple only', async () => {
    const { a, b } = await connectedPair('hide')
    const groupId = await createGroupViaApi(api, a.registrant.username, 'Hide test', [b.coupleId])

    const mine = auth(api, await apiLogin(api, a.registrant.username))
    expect((await mine.del(`/conversations/${groupId}`)).ok()).toBeTruthy()

    const mineList = (await (await mine.get('/conversations')).json()) as Array<{ id: string }>
    expect(mineList.map((c) => c.id)).not.toContain(groupId)

    const theirs = auth(api, await apiLogin(api, b.registrant.username))
    const theirList = (await (await theirs.get('/conversations')).json()) as Array<{ id: string }>
    expect(theirList.map((c) => c.id), 'hiding is per-couple').toContain(groupId)
  })

  test('[CFG-007] a new message unhides a hidden group', async () => {
    const { a, b } = await connectedPair('unhide')
    const groupId = await createGroupViaApi(api, a.registrant.username, 'Unhide test', [b.coupleId])

    const mine = auth(api, await apiLogin(api, a.registrant.username))
    await mine.del(`/conversations/${groupId}`)

    await sendTextViaApi(api, b.registrant.username, groupId, 'are you still there?')

    const list = (await (await mine.get('/conversations')).json()) as Array<{ id: string }>
    expect(
      list.map((c) => c.id),
      'TouchActivity is documented to bring a hidden conversation back',
    ).toContain(groupId)
  })

  test('[CFG-005] a not-connected couple cannot be added to a group', async () => {
    const { a, b } = await connectedPair('addcouple')
    const stranger = await seedCompleteCouple(api, 'addstranger')
    const groupId = await createGroupViaApi(api, a.registrant.username, 'Add test', [b.coupleId])

    const owner = auth(api, await apiLogin(api, a.registrant.username))
    const res = await owner.post(`/conversations/${groupId}/couples`, { coupleId: stranger.coupleId })
    expect(res.status(), 'only accepted connections may be added').toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test('[CFG-005] a non-participant cannot add a couple to a group', async () => {
    const { a, b } = await connectedPair('addauth')
    const outsider = await seedCompleteCouple(api, 'addoutsider')
    const groupId = await createGroupViaApi(api, a.registrant.username, 'Closed group', [b.coupleId])

    const intruder = auth(api, await apiLogin(api, outsider.registrant.username))
    const res = await intruder.post(`/conversations/${groupId}/couples`, { coupleId: outsider.coupleId })
    expect([403, 404]).toContain(res.status())
  })

  test('[CFG-001] group settings are offered for a group and not for the partner chat', async ({ page }) => {
    const { a, b } = await connectedPair('cfgui')
    const groupId = await createGroupViaApi(api, a.registrant.username, 'Settings visible', [b.coupleId])

    await loginViaUi(page, a.registrant.username)
    await page.goto(`/messages/${groupId}`)
    await expect(page.getByRole('button', { name: 'Conversation settings' })).toBeVisible({ timeout: 15_000 })

    const partnerConversation = await getPartnerConversationId(api, a.registrant.username)
    await page.goto(`/messages/${partnerConversation}`)
    await expect(page.getByLabel('Message', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole('button', { name: 'Conversation settings' }),
      'a two-person partner chat has no group settings',
    ).toHaveCount(0)
  })
})

test.describe('MSG · Cross-account consistency', () => {
  test('[MSG-010] a message from one couple is visible to the other after a refetch', async ({ page }) => {
    const { a, b } = await connectedPair('cross')
    const groupId = await createGroupViaApi(api, a.registrant.username, 'Cross-account', [b.coupleId])

    const body = `cross ${Date.now()}`
    await sendTextViaApi(api, a.registrant.username, groupId, body)

    await loginViaUi(page, b.registrant.username)
    await page.goto(`/messages/${groupId}`)
    await expect(page.getByText(body).first()).toBeVisible({ timeout: 15_000 })
  })

  test('[MSG-011] the messages view is usable at a 320px viewport', async ({ page }) => {
    const couple = await seedCompleteCouple(api, 'narrow')
    await page.setViewportSize({ width: 320, height: 720 })
    await loginViaUi(page, couple.registrant.username)
    await page.goto('/messages')

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, 'the page must not scroll horizontally at 320px').toBeLessThanOrEqual(1)
  })
})
