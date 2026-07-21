import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import {
  apiContext,
  seedCompleteCouple,
  connectCouplesViaApi,
  getPartnerConversationId,
  sendTextViaApi,
  loginViaUi,
} from './fixtures'

/** Messaging: the couple's partner chat (send / edit / delete / react), group creation, persistence. */

let api: APIRequestContext
test.beforeAll(async () => {
  api = await apiContext()
})
test.afterAll(async () => {
  await api.dispose()
})

/** The message bubble in the thread (a <span>), as opposed to the list-preview <p>. */
function bubble(page: Page, text: string | RegExp) {
  return page.locator('span').filter({ hasText: text }).last()
}

/** Navigate to /messages via the SPA and open the auto-created partner conversation. */
async function openPartnerConversation(page: Page) {
  await page.getByRole('link', { name: 'Messages', exact: true }).click()
  await expect(page).toHaveURL(/\/messages$/)
  // The list item's title differs by viewer ("You & <partner>"), so target it by its role, not text.
  await page.locator('button[aria-current]').first().click()
  await expect(page).toHaveURL(/\/messages\/.+/)
}

/** Type + send a message and wait for its bubble to render in the thread. */
async function sendMessage(page: Page, text: string) {
  const composer = page.getByPlaceholder(/Write a message/)
  await expect(composer).toBeVisible()
  await composer.fill(text)
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(bubble(page, text)).toBeVisible({ timeout: 15_000 })
}

/** Reveal the hover actions for the last message and open the "⋮" menu. */
async function openMessageActions(page: Page, text: string) {
  await bubble(page, text).hover()
  await page.getByRole('button', { name: 'Message actions' }).last().click()
}

test.describe('Partner chat', () => {
  test('a fresh conversation shows the empty-state prompt', async ({ page }) => {
    const c = await seedCompleteCouple(api, 'msgE')
    await loginViaUi(page, c.registrant.username)
    await openPartnerConversation(page)
    await expect(page.getByText('Say hello 👋')).toBeVisible()
  })

  test('a text message can be sent and appears in the thread', async ({ page }) => {
    const c = await seedCompleteCouple(api, 'msgS')
    await loginViaUi(page, c.registrant.username)
    await openPartnerConversation(page)
    const body = `hello there ${Date.now()}`
    await sendMessage(page, body)
    await expect(bubble(page, body)).toBeVisible()
  })

  test('a message can be edited and is marked "edited"', async ({ page }) => {
    const c = await seedCompleteCouple(api, 'msgEd')
    await loginViaUi(page, c.registrant.username)
    await openPartnerConversation(page)
    const original = `initial note ${Date.now()}`
    await sendMessage(page, original)

    await openMessageActions(page, original)
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    const edited = `revised note ${Date.now()}`
    const composer = page.getByPlaceholder(/Write a message/)
    await composer.fill(edited)
    await page.getByRole('button', { name: 'Send message' }).click()

    await expect(bubble(page, edited)).toBeVisible()
    await expect(page.getByText(/· edited/)).toBeVisible()
  })

  test('a message can be deleted, leaving a tombstone', async ({ page }) => {
    const c = await seedCompleteCouple(api, 'msgDel')
    await loginViaUi(page, c.registrant.username)
    await openPartnerConversation(page)
    const body = `passing thought ${Date.now()}`
    await sendMessage(page, body)

    await openMessageActions(page, body)
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByText('This message was deleted').first()).toBeVisible()
  })

  test('a message can be reacted to', async ({ page }) => {
    const c = await seedCompleteCouple(api, 'msgRx')
    await loginViaUi(page, c.registrant.username)
    await openPartnerConversation(page)
    const body = `cheerful hello ${Date.now()}`
    await sendMessage(page, body)

    await bubble(page, body).hover()
    await page.getByRole('button', { name: 'React', exact: true }).last().click()
    await page.getByRole('button', { name: 'Love', exact: true }).click()
    await expect(page.getByText('❤️')).toBeVisible()
  })
})

test.describe('Persistence & cross-account', () => {
  test('a message sent by one partner is visible to the other partner', async ({ page }) => {
    const c = await seedCompleteCouple(api, 'msgX')
    const convId = await getPartnerConversationId(api, c.registrant.username)
    const body = `from your partner ${Date.now()}`
    const res = await sendTextViaApi(api, c.registrant.username, convId, body)
    expect(res.status()).toBe(201)

    // The OTHER partner logs in and must see the message.
    await loginViaUi(page, c.partner.username)
    await openPartnerConversation(page)
    await expect(bubble(page, body)).toBeVisible()
  })
})

test.describe('Group conversations', () => {
  test('a group can be created from a connected couple', async ({ page }) => {
    const me = await seedCompleteCouple(api, 'grpA')
    const friend = await seedCompleteCouple(api, 'grpB')
    await connectCouplesViaApi(api, me, friend)

    await loginViaUi(page, me.registrant.username)
    await page.getByRole('link', { name: 'Messages', exact: true }).click()
    await page.getByRole('button', { name: 'New group chat' }).click()

    const dialog = page.getByRole('dialog', { name: 'New group chat' })
    await expect(dialog).toBeVisible()
    const groupName = `Weekend crew ${Date.now()}`
    await dialog.getByLabel('Group name').fill(groupName)
    await dialog.getByLabel('Search couples').fill(friend.togetherID)
    await dialog.getByRole('button', { name: new RegExp(friend.togetherID) }).click()
    await dialog.getByRole('button', { name: 'Create' }).click()

    // The new group opens; its name shows in the thread header and the conversation list.
    await expect(page.getByText(groupName).first()).toBeVisible({ timeout: 10_000 })
  })
})
