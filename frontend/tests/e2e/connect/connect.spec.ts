import { test, expect } from '@playwright/test'

const authState = JSON.stringify({
  state: {
    isAuthenticated: true,
    username: 'madhu',
    partnerName: 'Madhu Avinash',
    togetherID: 'MADHU-PRIYA',
    coupleId: '11111111-1111-1111-1111-111111111111',
    partnerId: '22222222-2222-2222-2222-222222222222',
    role: 'Husband',
    profilePictureUrl: null,
  },
  version: 0,
})

// Shared mock data
const acceptedConnection = {
  connectionId: 'aaaa-1111',
  togetherID: 'RAVI-KAVYA',
  husbandName: 'Ravi Kumar',
  wifeName: 'Kavya Kumar',
  husbandProfilePictureUrl: null,
  wifeProfilePictureUrl: null,
  status: 'Accepted',
  isInitiator: true,
  createdAt: '2026-06-29T10:00:00Z',
  acceptedAt: '2026-06-29T11:00:00Z',
}

const pendingOutgoing = {
  connectionId: 'bbbb-2222',
  togetherID: 'JOHN-JANE',
  husbandName: 'John Smith',
  wifeName: 'Jane Smith',
  husbandProfilePictureUrl: null,
  wifeProfilePictureUrl: null,
  status: 'Pending',
  isInitiator: true,
  createdAt: '2026-06-29T10:00:00Z',
  acceptedAt: null,
}

const pendingIncoming = {
  connectionId: 'cccc-3333',
  togetherID: 'ALEX-MIA',
  husbandName: 'Alex Brown',
  wifeName: 'Mia Brown',
  husbandProfilePictureUrl: null,
  wifeProfilePictureUrl: null,
  status: 'Pending',
  isInitiator: false,
  createdAt: '2026-06-29T09:00:00Z',
  acceptedAt: null,
}

const searchResult = {
  togetherID: 'RAVI-KAVYA',
  husbandName: 'Ravi Kumar',
  wifeName: 'Kavya Kumar',
  husbandProfilePictureUrl: null,
  wifeProfilePictureUrl: null,
  existingConnectionStatus: null,
}

// URL function matchers — avoids ? glob ambiguity
const isAcceptedConnections = (url: URL) =>
  url.pathname.includes('/connect/connections') && url.searchParams.get('status') === 'Accepted'

const isPendingConnections = (url: URL) =>
  url.pathname.includes('/connect/connections') && url.searchParams.get('status') === 'Pending'

const isSearchRequest = (url: URL) =>
  url.pathname.includes('/connect/search')

test.describe('Connect', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript((stored) => {
      localStorage.setItem('saha-auth', stored)
    }, authState)

    await page.route(isAcceptedConnections, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
    )
    await page.route(isPendingConnections, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
    )
    await page.route(isSearchRequest, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
    )

    await page.goto('/connect')
  })

  test('renders connect page heading', async ({ page }) => {
    // Use exact: true to avoid matching <h2>Connected Couples</h2>
    await expect(page.getByRole('heading', { name: 'Connect', exact: true })).toBeVisible()
    await expect(page.getByText('Find other couples')).toBeVisible()
  })

  test('shows own Together ID', async ({ page }) => {
    await expect(page.getByText('MADHU-PRIYA').first()).toBeVisible()
    await expect(page.getByText('Your Together ID')).toBeVisible()
  })

  test('shows three tabs', async ({ page }) => {
    // Use tab-bar container to scope away from empty-state "Find Couples" button
    const tabBar = page.locator('.flex.gap-1.p-1')
    await expect(tabBar.getByRole('button', { name: 'Connected' })).toBeVisible()
    await expect(tabBar.getByRole('button', { name: 'Pending' })).toBeVisible()
    await expect(tabBar.getByRole('button', { name: 'Find Couples' })).toBeVisible()
  })

  test('Connected tab is active by default and shows empty state', async ({ page }) => {
    await expect(page.getByText('No connections yet')).toBeVisible()
  })

  test('Pending tab shows empty state when no requests', async ({ page }) => {
    await page.locator('.flex.gap-1.p-1 button', { hasText: 'Pending' }).click()
    await expect(page.getByText('No pending requests')).toBeVisible()
  })

  test('Find Couples tab shows search input', async ({ page }) => {
    await page.locator('.flex.gap-1.p-1 button', { hasText: 'Find Couples' }).click()
    await expect(page.getByPlaceholder(/search by together id/i)).toBeVisible()
  })

  test('shows hint when search query is less than 2 characters', async ({ page }) => {
    await page.locator('.flex.gap-1.p-1 button', { hasText: 'Find Couples' }).click()
    await expect(page.getByText('Enter at least 2 characters')).toBeVisible()
    await page.getByPlaceholder(/search by together id/i).fill('R')
    await expect(page.getByText('Enter at least 2 characters')).toBeVisible()
  })

  test('search input auto-uppercases input', async ({ page }) => {
    await page.locator('.flex.gap-1.p-1 button', { hasText: 'Find Couples' }).click()
    const input = page.getByPlaceholder(/search by together id/i)
    await input.fill('ravi')
    await expect(input).toHaveValue('RAVI')
  })

  test('shows search results when typing 2+ characters', async ({ page }) => {
    await page.route(isSearchRequest, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([searchResult]) }),
    )
    await page.locator('.flex.gap-1.p-1 button', { hasText: 'Find Couples' }).click()
    await page.getByPlaceholder(/search by together id/i).fill('RA')
    await expect(page.getByText('RAVI-KAVYA')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Ravi Kumar & Kavya Kumar')).toBeVisible()
    await expect(page.getByRole('button', { name: /connect/i }).last()).toBeVisible()
  })

  test('shows no results message when search returns empty', async ({ page }) => {
    await page.locator('.flex.gap-1.p-1 button', { hasText: 'Find Couples' }).click()
    await page.getByPlaceholder(/search by together id/i).fill('ZZ')
    await expect(page.getByText(/no couples found/i)).toBeVisible({ timeout: 5000 })
  })

  test('shows Connected list with connections', async ({ page }) => {
    await page.route(isAcceptedConnections, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([acceptedConnection]) }),
    )
    await page.reload()
    await expect(page.getByText('RAVI-KAVYA')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Ravi Kumar & Kavya Kumar')).toBeVisible()
    await expect(page.getByText('Connected').first()).toBeVisible()
  })

  test('shows outgoing pending request with sent label', async ({ page }) => {
    await page.route(isPendingConnections, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([pendingOutgoing]) }),
    )
    await page.locator('.flex.gap-1.p-1 button', { hasText: 'Pending' }).click()
    await expect(page.getByText('JOHN-JANE')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Request sent by you')).toBeVisible()
    await expect(page.getByRole('button', { name: /accept/i })).not.toBeVisible()
  })

  test('shows incoming pending request with Accept and Reject buttons', async ({ page }) => {
    await page.route(isPendingConnections, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([pendingIncoming]) }),
    )
    await page.locator('.flex.gap-1.p-1 button', { hasText: 'Pending' }).click()
    await expect(page.getByText('ALEX-MIA')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Request received')).toBeVisible()
    await expect(page.getByRole('button', { name: /accept/i })).toBeVisible()
  })

  test('shows pending badge count on tab', async ({ page }) => {
    await page.route(isPendingConnections, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([pendingIncoming]) }),
    )
    await page.locator('.flex.gap-1.p-1 button', { hasText: 'Pending' }).click()
    await page.waitForTimeout(500)
    await expect(page.locator('span.bg-gold-500')).toBeVisible()
  })

  test('search result shows Pending badge when request already sent', async ({ page }) => {
    const alreadySent = { ...searchResult, existingConnectionStatus: 'Pending' }
    await page.route(isSearchRequest, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([alreadySent]) }),
    )
    await page.locator('.flex.gap-1.p-1 button', { hasText: 'Find Couples' }).click()
    await page.getByPlaceholder(/search by together id/i).fill('RA')
    await expect(page.getByText('Pending').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /^connect$/i })).not.toBeVisible()
  })

  test('search result shows Connected badge when already connected', async ({ page }) => {
    const alreadyConnected = { ...searchResult, existingConnectionStatus: 'Accepted' }
    await page.route(isSearchRequest, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([alreadyConnected]) }),
    )
    await page.locator('.flex.gap-1.p-1 button', { hasText: 'Find Couples' }).click()
    await page.getByPlaceholder(/search by together id/i).fill('RA')
    await expect(page.getByText('Connected').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /^connect$/i })).not.toBeVisible()
  })

  test('unauthenticated access redirects to login', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto('/connect')
    await expect(page).toHaveURL('/login')
    await ctx.close()
  })
})
