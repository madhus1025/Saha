import { test, expect } from '@playwright/test'

const authStorageState = JSON.stringify({
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

const profileMeResponse = {
  partnerId: '22222222-2222-2222-2222-222222222222',
  username: 'madhu',
  name: 'Madhu Avinash',
  dateOfBirth: '1990-05-15',
  email: 'madhu@saha.test',
  phoneNumber: '+911234567890',
  profilePictureUrl: null,
  role: 'Husband',
  coupleInfo: {
    coupleId: '11111111-1111-1111-1111-111111111111',
    togetherID: 'MADHU-PRIYA',
    partner: {
      partnerId: '33333333-3333-3333-3333-333333333333',
      username: 'priya',
      name: 'Priya Avinash',
      profilePictureUrl: null,
      role: 'Wife',
    },
  },
}

test.describe('Dashboard (authenticated)', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript((stored) => {
      localStorage.setItem('saha-auth', stored)
    }, authStorageState)

    // Mock the profile API so the dashboard doesn't re-render from 401s
    await page.route((url) => url.pathname.endsWith('/profile/me'), (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(profileMeResponse) }),
    )

    await page.goto('/dashboard')
    await expect(page.getByText(/good (morning|afternoon|evening), madhu/i)).toBeVisible({ timeout: 5000 })
  })

  test('shows dashboard with greeting and together ID', async ({ page }) => {
    await expect(page.getByText('MADHU-PRIYA').first()).toBeVisible()
  })

  test('shows all module navigation links', async ({ page }) => {
    const modules = ['Home', 'Finance', 'Memories', 'Goals', 'Messages', 'Connect', 'Calendar']
    for (const module of modules) {
      await expect(page.getByRole('link', { name: module }).first()).toBeVisible()
    }
  })

  test('shows module cards on dashboard', async ({ page }) => {
    // Module cards appear in main content — use first() since modules also appear in sidebar
    await expect(page.getByText('Finance').first()).toBeVisible()
    await expect(page.getByText('Memories').first()).toBeVisible()
    await expect(page.getByText('Goals').first()).toBeVisible()
  })

  test('navigates to finance page', async ({ page }) => {
    await page.getByRole('link', { name: 'Finance' }).first().click()
    await expect(page).toHaveURL('/finance')
    // Check the page h1 title (no animation delay) then the animated "Coming Soon" h2
    await expect(page.getByRole('heading', { name: 'Finance', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Coming Soon' })).toBeVisible({ timeout: 5000 })
  })

  test('shows user avatar in top bar', async ({ page }) => {
    await expect(page.getByText('madhu').first()).toBeVisible()
  })

  test('unauthenticated users are redirected to login @smoke', async ({ browser }) => {
    // Use a fresh browser context (no addInitScript) to test unauthenticated access
    const freshContext = await browser.newContext()
    const freshPage = await freshContext.newPage()
    try {
      await freshPage.goto('/dashboard')
      await expect(freshPage).toHaveURL('/login')
    } finally {
      await freshContext.close()
    }
  })
})

test.describe('Navigation', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript((stored) => {
      localStorage.setItem('saha-auth', stored)
    }, authStorageState)
    await page.route((url) => url.pathname.endsWith('/profile/me'), (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(profileMeResponse) }),
    )
    await page.goto('/dashboard')
  })

  test('navigates between modules', async ({ page }) => {
    const routes = ['/connect', '/settings', '/profile', '/calendar', '/goals', '/memories', '/messages', '/finance', '/dashboard']

    for (const route of routes) {
      await page.goto(route)
      await expect(page).toHaveURL(route)
    }
  })

  test('404 page for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    await expect(page.getByText('404')).toBeVisible()
    await expect(page.getByRole('link', { name: /go home/i })).toBeVisible()
  })
})
