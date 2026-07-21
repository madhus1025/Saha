import { test, expect, type Page, type Locator } from '@playwright/test'
import {
  apiContext,
  seedCouple,
  loginViaUi,
  connectCouplesViaApi,
  createGroupViaApi,
} from './fixtures'

function uniq(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * A message body appears in BOTH the conversation-list preview and the chat bubble, so assertions
 * are scoped to the chat bubble (a `.group` row in the thread) to avoid strict-mode collisions.
 */
function bubble(page: Page, text: string): Locator {
  return page.locator('div.group', { hasText: text })
}

/** Open the (only) partner conversation from the list. */
async function openPartnerConversation(page: Page): Promise<void> {
  await page.goto('/messages')
  await page.getByRole('button', { name: /You & / }).first().click()
  await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible()
}

async function sendMessage(page: Page, text: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Message' }).fill(text)
  await page.getByRole('button', { name: 'Send message' }).click()
}

test.describe('Messaging — partner chat (real backend)', () => {
  test('husband and wife exchange messages that persist across accounts', async ({ browser }) => {
    const api = await apiContext()
    const couple = await seedCouple(api, 'PM')
    await api.dispose()

    const ctxH = await browser.newContext()
    const ctxW = await browser.newContext()
    const pageH = await ctxH.newPage()
    const pageW = await ctxW.newPage()

    // Husband sends a message.
    await loginViaUi(pageH, couple.husband.username)
    await openPartnerConversation(pageH)
    await sendMessage(pageH, 'hello from husband')
    await expect(bubble(pageH, 'hello from husband')).toBeVisible()

    // Wife, in a separate account/context, sees it and replies.
    await loginViaUi(pageW, couple.wife.username)
    await openPartnerConversation(pageW)
    await expect(bubble(pageW, 'hello from husband')).toBeVisible()
    await sendMessage(pageW, 'hi from wife')
    await expect(bubble(pageW, 'hi from wife')).toBeVisible()

    // Husband re-opens and sees the reply (validates persistence, not realtime push).
    await openPartnerConversation(pageH)
    await expect(bubble(pageH, 'hi from wife')).toBeVisible()

    await ctxH.close()
    await ctxW.close()
  })

  test('a sender can edit their own message', async ({ browser }) => {
    const api = await apiContext()
    const couple = await seedCouple(api, 'ED')
    await api.dispose()
    const ctx = await browser.newContext()
    const page = await ctx.newPage()

    await loginViaUi(page, couple.husband.username)
    await openPartnerConversation(page)
    await sendMessage(page, 'first version')
    await expect(bubble(page, 'first version')).toBeVisible()

    await page.getByRole('button', { name: 'Message actions' }).click()
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(page.getByText('Editing message')).toBeVisible()
    await page.getByRole('textbox', { name: 'Message' }).fill('edited version')
    await page.getByRole('button', { name: 'Send message' }).click()

    await expect(bubble(page, 'edited version')).toBeVisible()
    await expect(bubble(page, 'first version')).toBeHidden()
    // The "· edited" marker shows in the message meta.
    await expect(page.getByText(/·\s?edited/)).toBeVisible()

    await ctx.close()
  })

  test('a sender can delete their own message', async ({ browser }) => {
    const api = await apiContext()
    const couple = await seedCouple(api, 'DL')
    await api.dispose()
    const ctx = await browser.newContext()
    const page = await ctx.newPage()

    await loginViaUi(page, couple.husband.username)
    await openPartnerConversation(page)
    await sendMessage(page, 'delete me please')
    await expect(bubble(page, 'delete me please')).toBeVisible()

    await page.getByRole('button', { name: 'Message actions' }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(page.getByText('This message was deleted')).toBeVisible()
    await expect(bubble(page, 'delete me please')).toBeHidden()

    await ctx.close()
  })

  test('a partner can react to a message', async ({ browser }) => {
    const api = await apiContext()
    const couple = await seedCouple(api, 'RX')
    await api.dispose()
    const ctx = await browser.newContext()
    const page = await ctx.newPage()

    await loginViaUi(page, couple.husband.username)
    await openPartnerConversation(page)
    await sendMessage(page, 'react to this')
    await expect(bubble(page, 'react to this')).toBeVisible()

    await page.getByRole('button', { name: 'React', exact: true }).click()
    await page.getByRole('button', { name: 'Love', exact: true }).click()

    // The reaction summary pill (❤️) should now render on the message.
    await expect(bubble(page, 'react to this').getByText('❤️')).toBeVisible()

    await ctx.close()
  })

  test('REGRESSION: a just-sent message shows a fresh timestamp ("now")', async ({ browser }) => {
    // FIXED (BUG-001): the API now serializes every DateTime with a UTC offset ("Z"), so
    // relativeTime()'s `new Date(iso)` no longer misreads it as local time. A message sent seconds
    // ago renders as "now" even in a UTC+ timezone. See testing/BUGS.md and the actively-maintained
    // guard in tests/e2e/comprehensive/regression.spec.ts.
    // Uses a UTC+ timezone to expose the bug deterministically.
    const api = await apiContext()
    const couple = await seedCouple(api, 'TZ')
    await api.dispose()
    const ctx = await browser.newContext({ timezoneId: 'Asia/Kolkata' })
    const page = await ctx.newPage()

    await loginViaUi(page, couple.husband.username)
    await openPartnerConversation(page)
    await sendMessage(page, 'what time is it')
    await expect(bubble(page, 'what time is it')).toBeVisible()

    await expect(page.getByText(/^\d+[hd]$/)).toHaveCount(0)

    await ctx.close()
  })
})

test.describe('Messaging — group chat (real backend)', () => {
  test('owner creates a group with a connected couple; both couples see and use it', async ({
    browser,
  }) => {
    const api = await apiContext()
    const A = await seedCouple(api, 'GA')
    const B = await seedCouple(api, 'GB')
    await connectCouplesViaApi(api, A, B)
    await api.dispose()

    const groupName = uniq('Trip')

    const ctxA = await browser.newContext()
    const ctxB = await browser.newContext()
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    // A creates the group through the UI.
    await loginViaUi(pageA, A.husband.username)
    await pageA.goto('/messages')
    await pageA.getByRole('button', { name: 'New group chat' }).click()
    await pageA.getByRole('textbox', { name: 'Group name' }).fill(groupName)
    // The couple picker is empty until you search — filter to couple B, then select them.
    await pageA.getByRole('textbox', { name: 'Search couples' }).fill(B.togetherID)
    await pageA.getByRole('button', { name: new RegExp(B.togetherID) }).click()
    await pageA.getByRole('button', { name: 'Create' }).click()

    // The group opens and shows in the conversation list; A sends a message.
    await expect(pageA.getByRole('button', { name: new RegExp(groupName) })).toBeVisible()
    await sendMessage(pageA, 'welcome to the group')
    await expect(bubble(pageA, 'welcome to the group')).toBeVisible()

    // B sees the group and the message.
    await loginViaUi(pageB, B.husband.username)
    await pageB.goto('/messages')
    await pageB.getByRole('button', { name: new RegExp(groupName) }).click()
    await expect(bubble(pageB, 'welcome to the group')).toBeVisible()

    // B replies; A re-opens and sees it.
    await sendMessage(pageB, 'thanks for adding us')
    await pageA.reload()
    await pageA.getByRole('button', { name: new RegExp(groupName) }).click()
    await expect(bubble(pageA, 'thanks for adding us')).toBeVisible()

    await ctxA.close()
    await ctxB.close()
  })

  test('owner can rename and pin a group from settings', async ({ browser }) => {
    const api = await apiContext()
    const A = await seedCouple(api, 'SA')
    const B = await seedCouple(api, 'SB')
    await connectCouplesViaApi(api, A, B)
    const original = uniq('Squad')
    const groupId = await createGroupViaApi(api, A.husband.username, original, [B.coupleId])
    await api.dispose()

    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginViaUi(page, A.husband.username)
    await page.goto(`/messages/${groupId}`)
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible()

    // Rename and pin, both from the (single) settings dialog.
    const renamed = uniq('Renamed')
    await page.getByRole('button', { name: 'Conversation settings' }).click()
    await page.getByRole('textbox', { name: 'Rename' }).fill(renamed)
    await page.getByRole('button', { name: 'Save' }).click()
    await page.getByRole('button', { name: 'Pin', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Unpin', exact: true })).toBeVisible()
    // Scope Close to the dialog — a success toast also renders a Close button.
    await page.getByRole('dialog', { name: 'Conversation settings' }).getByRole('button', { name: 'Close' }).click()

    // The rename is reflected in the conversation list row.
    await expect(page.getByRole('button', { name: new RegExp(renamed) })).toBeVisible()

    await ctx.close()
  })

  test('the new-group couple picker can be filtered with the search box', async ({ browser }) => {
    const api = await apiContext()
    const A = await seedCouple(api, 'FA')
    const B = await seedCouple(api, 'FB')
    const C = await seedCouple(api, 'FC')
    await connectCouplesViaApi(api, A, B)
    await connectCouplesViaApi(api, A, C)
    await api.dispose()

    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginViaUi(page, A.husband.username)
    await page.goto('/messages')
    await page.getByRole('button', { name: 'New group chat' }).click()

    // No couples are listed until the user searches.
    await expect(page.getByText(/Search by name or Together ID/)).toBeVisible()
    await expect(page.getByRole('button', { name: new RegExp(B.togetherID) })).toBeHidden()
    await expect(page.getByRole('button', { name: new RegExp(C.togetherID) })).toBeHidden()

    // Searching reveals only the matching couple.
    await page.getByRole('textbox', { name: 'Search couples' }).fill(B.togetherID)
    await expect(page.getByRole('button', { name: new RegExp(B.togetherID) })).toBeVisible()
    await expect(page.getByRole('button', { name: new RegExp(C.togetherID) })).toBeHidden()

    // A non-matching query shows the empty state.
    await page.getByRole('textbox', { name: 'Search couples' }).fill('zzz-no-such-couple')
    await expect(page.getByText(/No couples match/)).toBeVisible()

    await ctx.close()
  })
})
