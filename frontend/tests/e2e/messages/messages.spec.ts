import { test, expect } from '@playwright/test'

const ME_PARTNER = '22222222-2222-2222-2222-222222222222'
const ME_COUPLE = '11111111-1111-1111-1111-111111111111'

const authState = JSON.stringify({
  state: {
    isAuthenticated: true,
    accessToken: 'test-token',
    username: 'madhu',
    partnerName: 'Priya Avinash',
    togetherID: 'MADHU-PRIYA',
    coupleId: ME_COUPLE,
    partnerId: ME_PARTNER,
    role: 'Husband',
    profilePictureUrl: null,
  },
  version: 0,
})

const partnerConversation = {
  id: 'partner-1',
  type: 'Partner',
  name: null,
  participants: [
    { partnerId: ME_PARTNER, coupleId: ME_COUPLE, name: 'Madhu', role: 'Husband', avatarUrl: null },
    { partnerId: 'partner-wife', coupleId: ME_COUPLE, name: 'Priya', role: 'Wife', avatarUrl: null },
  ],
  lastMessagePreview: 'See you tonight',
  lastMessageSenderPartnerId: 'partner-wife',
  lastActivityAt: '2026-07-08T10:00:00Z',
  isPinned: true,
  isOwner: false,
}

const groupConversation = {
  id: 'group-1',
  type: 'Group',
  name: 'Trip Crew',
  participants: partnerConversation.participants,
  lastMessagePreview: 'Who is driving?',
  lastMessageSenderPartnerId: 'partner-wife',
  lastActivityAt: '2026-07-08T09:00:00Z',
  isPinned: false,
  isOwner: true,
}

const messagePage = {
  items: [
    {
      id: 'm2',
      conversationId: 'partner-1',
      senderPartnerId: 'partner-wife',
      senderName: 'Priya',
      senderRole: 'Wife',
      senderAvatarUrl: null,
      contentType: 'Text',
      body: 'See you tonight',
      attachment: null,
      isEdited: false,
      editedAt: null,
      isDeleted: false,
      createdAt: '2026-07-08T10:00:00Z',
      reactions: [],
    },
    {
      id: 'm1',
      conversationId: 'partner-1',
      senderPartnerId: ME_PARTNER,
      senderName: 'Madhu',
      senderRole: 'Husband',
      senderAvatarUrl: null,
      contentType: 'Text',
      body: 'On my way',
      attachment: null,
      isEdited: false,
      editedAt: null,
      isDeleted: false,
      createdAt: '2026-07-08T09:59:00Z',
      reactions: [],
    },
  ],
  nextCursor: null,
}

// Scope every predicate to the `/conversations` API path so the app's own `/messages`
// document navigation (which also ends in `/messages`) is never intercepted.
const isConversationsList = (url: URL) => /\/conversations$/.test(url.pathname)
const isMessages = (url: URL) => /\/conversations\/[^/]+\/messages$/.test(url.pathname)
const isConversationDetail = (url: URL) => /\/conversations\/[^/]+$/.test(url.pathname)

test.describe('Messages', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript((stored) => {
      localStorage.setItem('saha-auth', stored)
    }, authState)

    await page.route(isConversationsList, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([partnerConversation, groupConversation]),
      }),
    )
    await page.route(isConversationDetail, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'partner-1',
          type: 'Partner',
          name: null,
          ownerCoupleId: null,
          isOwner: false,
          participants: partnerConversation.participants,
        }),
      }),
    )
    await page.route(isMessages, (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'm3',
            conversationId: 'partner-1',
            senderPartnerId: ME_PARTNER,
            senderName: 'Madhu',
            senderRole: 'Husband',
            senderAvatarUrl: null,
            contentType: 'Text',
            body: 'Hello there',
            attachment: null,
            isEdited: false,
            editedAt: null,
            isDeleted: false,
            createdAt: '2026-07-08T10:01:00Z',
            reactions: [],
          }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(messagePage),
      })
    })

    await page.goto('/messages')
  })

  test('renders the conversation list with partner and group chats', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible()
    await expect(page.getByText('You & Priya')).toBeVisible()
    await expect(page.getByText('Trip Crew')).toBeVisible()
  })

  test('opens a conversation thread and shows its messages', async ({ page }) => {
    await page.getByText('You & Priya').click()
    await expect(page).toHaveURL(/\/messages\/partner-1/)
    await expect(page.getByText('On my way')).toBeVisible()
    await expect(page.getByText('See you tonight').last()).toBeVisible()
  })

  test('can type and send a message', async ({ page }) => {
    await page.getByText('You & Priya').click()
    const composer = page.getByLabel('Message', { exact: true })
    await composer.fill('Hello there')
    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(composer).toHaveValue('')
  })

  test('mobile viewport shows list, then thread without overlap', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await expect(page.getByText('You & Priya')).toBeVisible()

    await page.getByText('You & Priya').click()
    // On mobile the list is hidden once a thread is open (no overlap).
    await expect(page.getByRole('button', { name: 'Back to conversations' })).toBeVisible()
  })

  test('unauthenticated access redirects to login', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto('/messages')
    await expect(page).toHaveURL('/login')
    await ctx.close()
  })
})
