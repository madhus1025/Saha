import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import {
  authState,
  defaultState,
  setupMessagingApi,
  ME_COUPLE,
  B_COUPLE,
  type MessagingState,
} from './messaging-fixtures'

async function boot(page: Page, context: BrowserContext, state: MessagingState) {
  await context.addInitScript((s: string) => localStorage.setItem('saha-auth', s), authState)
  await setupMessagingApi(page, state)
}

// Convenience: locate the message bubble container (has the `group` class) by its text.
const bubble = (page: Page, text: string) => page.locator('div.group', { hasText: text })

test.describe('Messages — list & navigation', () => {
  let state: MessagingState
  test.beforeEach(async ({ page, context }) => {
    state = defaultState()
    await boot(page, context, state)
    await page.goto('/messages')
  })

  test('is reachable from the sidebar', async ({ page }) => {
    // Desktop layout: the sidebar nav is always visible (on mobile it collapses behind a menu).
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(page.getByRole('link', { name: 'Messages' })).toBeVisible()
  })

  test('renders the conversation list with partner and group chats', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible()
    await expect(page.getByText('You & Priya')).toBeVisible()
    await expect(page.getByText('Trip Crew')).toBeVisible()
  })

  test('shows the partner conversation first and pinned', async ({ page }) => {
    const items = page.locator('button[aria-current]')
    await expect(items.first()).toContainText('You & Priya')
    // The pin icon lives inside the partner list item.
    await expect(items.first().locator('svg.text-gold-500')).toBeVisible()
  })

  test('opens a conversation thread and shows its messages', async ({ page }) => {
    await page.getByText('You & Priya').click()
    await expect(page).toHaveURL(/\/messages\/partner-1/)
    await expect(page.getByText('On my way')).toBeVisible()
    await expect(page.getByText('See you tonight').last()).toBeVisible()
  })

  test('can type and send a text message', async ({ page }) => {
    await page.getByText('You & Priya').click()
    const composer = page.getByLabel('Message', { exact: true })
    await composer.fill('Hello there')
    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(composer).toHaveValue('')
    // Appears in the thread (and the list preview) — assert the thread bubble.
    await expect(bubble(page, 'Hello there')).toBeVisible()
  })

  test('mobile viewport shows list, then thread without overlap', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await expect(page.getByText('You & Priya')).toBeVisible()
    await page.getByText('You & Priya').click()
    await expect(page.getByRole('button', { name: 'Back to conversations' })).toBeVisible()
    // On mobile the list is hidden once a thread is open (no overlap).
    await expect(page.getByText('Trip Crew')).toBeHidden()
  })

  test('unauthenticated access redirects to login', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto('/messages')
    await expect(page).toHaveURL('/login')
    await ctx.close()
  })
})

test.describe('Messages — group creation', () => {
  let state: MessagingState
  test.beforeEach(async ({ page, context }) => {
    state = defaultState()
    await boot(page, context, state)
    await page.goto('/messages')
  })

  test('New group dialog lists only connected couples (unconnected are unavailable)', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'New group chat' }).click()
    const dialog = page.getByRole('dialog')
    const search = dialog.getByLabel('Search couples')
    // The picker reveals couples only once you search (empty query lists nothing).
    await search.fill('RAVI')
    await expect(dialog.getByText('RAVI-KAVYA')).toBeVisible()
    await search.fill('ALEX')
    await expect(dialog.getByText('ALEX-MIA')).toBeVisible()
    // A couple we are NOT connected to never appears, even when searched for.
    await search.fill('STRANGER')
    await expect(dialog.getByText('STRANGER-COUPLE')).toHaveCount(0)
  })

  test('creates a group with a connected couple and opens it', async ({ page }) => {
    await page.getByRole('button', { name: 'New group chat' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Search couples').fill('RAVI')
    await dialog.getByText('RAVI-KAVYA').click()
    await dialog.getByLabel('Group name').fill('Beach Weekend')
    await dialog.getByRole('button', { name: 'Create' }).click()

    await expect(page).toHaveURL(/\/messages\/group-\d+/)
    // The thread header (last match; the list item may be hidden on mobile) shows the new name.
    await expect(page.getByText('Beach Weekend').last()).toBeVisible()
  })

  test('a 2-couple group has all four individuals as participants', async ({ page }) => {
    await page.getByText('Trip Crew').click()
    // Header participant summary lists every partner of both couples.
    await expect(page.getByText('Madhu, Priya, Ravi, Kavya')).toBeVisible()
  })
})

test.describe('Messages — rename, ownership & add couple', () => {
  test('owner can rename a group', async ({ page, context }) => {
    const state = defaultState()
    await boot(page, context, state)
    await page.goto('/messages/group-1')

    await page.getByRole('button', { name: 'Conversation settings' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Rename').fill('Beach Trip')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await dialog.getByRole('button', { name: 'Close' }).click()

    // The new name propagates to the thread header (last match; list item may be hidden on mobile).
    await expect(page.getByText('Beach Trip').last()).toBeVisible()
  })

  test('non-owner cannot rename (control is hidden)', async ({ page, context }) => {
    const state = defaultState()
    // A group we participate in but do NOT own.
    state.conversations.push({
      id: 'group-b',
      type: 'Group',
      name: 'Ravi’s Crew',
      ownerCoupleId: B_COUPLE,
      participantCoupleIds: [ME_COUPLE, B_COUPLE],
      isPinned: false,
      isHidden: false,
      lastMessagePreview: null,
      lastActivityAt: '2026-07-08T08:00:00Z',
      messages: [],
    })
    await boot(page, context, state)
    await page.goto('/messages/group-b')

    await page.getByRole('button', { name: 'Conversation settings' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel('Rename')).toHaveCount(0)
  })

  test('a participant can add an eligible connected couple', async ({ page, context }) => {
    const state = defaultState()
    await boot(page, context, state)
    await page.goto('/messages/group-1')

    await page.getByRole('button', { name: 'Conversation settings' }).click()
    const dialog = page.getByRole('dialog')
    // ALEX-MIA is connected and not yet in the group → offered as addable.
    await expect(dialog.getByText('ALEX-MIA')).toBeVisible()
    await dialog.getByRole('button', { name: 'Add' }).click()
    // After adding, that couple is no longer offered.
    await expect(dialog.getByText('ALEX-MIA')).toHaveCount(0)
  })
})

test.describe('Messages — message actions', () => {
  let state: MessagingState
  test.beforeEach(async ({ page, context }) => {
    state = defaultState()
    await boot(page, context, state)
    await page.goto('/messages/partner-1')
    await expect(page.getByText('On my way')).toBeVisible()
  })

  test('sender can edit their own message', async ({ page }) => {
    const own = bubble(page, 'On my way')
    await own.getByRole('button', { name: 'Message actions' }).click({ force: true })
    await page.getByRole('button', { name: 'Edit' }).click()

    const composer = page.getByLabel('Message', { exact: true })
    await expect(composer).toHaveValue('On my way')
    await composer.fill('On my way now')
    await page.getByRole('button', { name: 'Send message' }).click()

    await expect(page.getByText('On my way now')).toBeVisible()
    await expect(page.getByText('· edited')).toBeVisible()
  })

  test('sender can delete their own message (tombstone)', async ({ page }) => {
    const own = bubble(page, 'On my way')
    await own.getByRole('button', { name: 'Message actions' }).click({ force: true })
    await page.getByRole('button', { name: 'Delete' }).click()

    await expect(page.getByText('This message was deleted')).toBeVisible()
  })

  test('a non-sender message offers no edit/delete controls', async ({ page }) => {
    // m2 ("See you tonight") was sent by the wife — not the authenticated partner.
    const others = bubble(page, 'See you tonight')
    await others.hover()
    await expect(others.getByRole('button', { name: 'Message actions' })).toHaveCount(0)
  })

  test('can react, change the reaction, then remove it', async ({ page }) => {
    const target = bubble(page, 'On my way')

    await target.getByRole('button', { name: 'React' }).click({ force: true })
    await page.getByRole('button', { name: 'Love' }).click()
    await expect(target.getByText('❤️')).toBeVisible()

    // Change reaction — still one per person.
    await target.getByRole('button', { name: 'React' }).click({ force: true })
    await page.getByRole('button', { name: 'Haha' }).click()
    await expect(target.getByText('😂')).toBeVisible()
    await expect(target.getByText('❤️')).toHaveCount(0)

    // Remove by clicking own reaction chip.
    await target.getByText('😂').click()
    await expect(target.getByText('😂')).toHaveCount(0)
  })
})

test.describe('Messages — pin, hide & media', () => {
  let state: MessagingState
  test.beforeEach(async ({ page, context }) => {
    state = defaultState()
    await boot(page, context, state)
  })

  test('pins and unpins a group conversation', async ({ page }) => {
    await page.goto('/messages/group-1')
    await page.getByRole('button', { name: 'Conversation settings' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Pin' }).click()
    await expect(dialog.getByRole('button', { name: 'Unpin' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Unpin' }).click()
    await expect(dialog.getByRole('button', { name: 'Pin' })).toBeVisible()
  })

  test('hides a conversation for the current couple', async ({ page }) => {
    await page.goto('/messages/group-1')
    await page.getByRole('button', { name: 'Conversation settings' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Hide' }).click()

    // Returns to the list and the hidden group is gone.
    await expect(page).toHaveURL(/\/messages$/)
    await expect(page.getByText('Trip Crew')).toHaveCount(0)
    await expect(page.getByText('You & Priya')).toBeVisible()
  })

  test('sends a photo message that renders in the thread', async ({ page }) => {
    await page.goto('/messages/partner-1')
    await page.locator('input[type="file"]').setInputFiles({
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([1, 2, 3, 4]),
    })
    await expect(page.locator('img[alt="attachment"]')).toBeVisible()
  })
})
