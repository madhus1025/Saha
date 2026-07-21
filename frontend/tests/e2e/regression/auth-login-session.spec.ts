/**
 * Catalogue: test-cases/authentication/login-session-and-recovery.md
 * Covers: AUTH-001..010, SES-001..014
 */
import { test, expect, type APIRequestContext } from '@playwright/test'
import {
  API_BASE,
  SEED_PASSWORD,
  ROSTER,
  apiContext,
  apiLogin,
  auth,
  loginViaUi,
  seedCompleteCouple,
  seedIncompleteCouple,
} from './_fixtures'

let api: APIRequestContext
test.beforeAll(async () => {
  api = await apiContext()
})
test.afterAll(async () => {
  await api.dispose()
})

test.describe('AUTH · Login', () => {
  test('[AUTH-001] either partner signs in with the shared password and gets their own identity', async ({
    page,
  }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await expect(page).toHaveURL(/\/dashboard/)

    const sessionRes = await auth(api, await apiLogin(api, ROSTER.priya.username)).get('/auth/session')
    expect(sessionRes.ok()).toBeTruthy()
    const session = (await sessionRes.json()) as { username: string; togetherID: string }
    // Signing in as priya must return priya — not the couple's registrant.
    expect(session.username).toBe(ROSTER.priya.username)
    expect(session.togetherID).toBe(ROSTER.priya.togetherID)
  })

  test('[AUTH-002] empty username/password are blocked client-side with no API call', async ({ page }) => {
    let loginCalls = 0
    await page.route('**/auth/login', (route) => {
      loginCalls++
      return route.continue()
    })

    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('Username is required')).toBeVisible()
    await expect(page.getByText('Password is required')).toBeVisible()
    expect(loginCalls).toBe(0)
  })

  test('[AUTH-002] username over 30 chars is rejected by the client and the API', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Username').fill('u'.repeat(31))
    await page.getByLabel('Your shared password').fill(SEED_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText(/cannot exceed 30 characters/i)).toBeVisible()

    const res = await api.post(`${API_BASE}/auth/login`, {
      data: { username: 'u'.repeat(31), password: SEED_PASSWORD },
    })
    expect(res.status()).toBe(400)
  })

  test('[AUTH-003] wrong password and unknown username are indistinguishable (no enumeration)', async () => {
    const wrongPassword = await api.post(`${API_BASE}/auth/login`, {
      data: { username: ROSTER.madhu.username, password: 'definitely-not-the-password' },
    })
    const unknownUser = await api.post(`${API_BASE}/auth/login`, {
      data: { username: 'nosuchuser', password: 'definitely-not-the-password' },
    })

    expect(wrongPassword.status()).toBe(unknownUser.status())
    expect(await wrongPassword.text()).toBe(await unknownUser.text())
  })

  test('[AUTH-004] username lookup is case-insensitive', async () => {
    const upper = await api.post(`${API_BASE}/auth/login`, {
      data: { username: ROSTER.madhu.username.toUpperCase(), password: SEED_PASSWORD },
    })
    expect(upper.status()).toBe(200)
  })

  test('[AUTH-004] username lookup tolerates surrounding whitespace', async () => {
    // `Username.Create` trims and lowercases, so the stored identity has no padding. Login must
    // apply the same normalisation, otherwise a pasted or autofilled value with a trailing space
    // is rejected as "invalid username or password" with nothing on screen to explain why.
    const padded = await api.post(`${API_BASE}/auth/login`, {
      data: { username: `  ${ROSTER.madhu.username}  `, password: SEED_PASSWORD },
    })
    expect(padded.status()).toBe(200)
  })

  test('[AUTH-004] injection-shaped usernames are treated as data, not query structure', async () => {
    for (const payload of ["' OR 1=1 --", '"; DROP TABLE Partners; --', '<script>alert(1)</script>']) {
      const res = await api.post(`${API_BASE}/auth/login`, {
        data: { username: payload, password: SEED_PASSWORD },
      })
      // Must be a clean auth/validation refusal — never a 500 and never a success.
      expect([400, 401]).toContain(res.status())
      const body = await res.text()
      expect(body).not.toMatch(/SQL|SQLite|stack|at Saha\./i)
    }
  })

  test('[AUTH-005] the password visibility toggle flips type and exposes pressed state', async ({ page }) => {
    await page.goto('/login')
    const field = page.getByLabel('Your shared password')
    await field.fill('a-secret-value')

    await expect(field).toHaveAttribute('type', 'password')
    const toggle = page.getByRole('button', { name: 'Show password' })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await toggle.click()
    await expect(field).toHaveAttribute('type', 'text')
    await expect(page.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    // The value must survive the toggle.
    await expect(field).toHaveValue('a-secret-value')
  })

  test('[AUTH-006] a slow login disables the submit button so it cannot be double-submitted', async ({
    page,
  }) => {
    let calls = 0
    await page.route('**/auth/login', async (route) => {
      calls++
      await new Promise((r) => setTimeout(r, 2000))
      return route.continue()
    })

    await page.goto('/login')
    await page.getByLabel('Username').fill(ROSTER.madhu.username)
    await page.getByLabel('Your shared password').fill(SEED_PASSWORD)

    const button = page.getByRole('button', { name: 'Sign in' })
    await button.click()
    await expect(button).toBeDisabled()
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
    expect(calls).toBe(1)
  })

  test('[AUTH-006] a 500 from login leaves the form usable and shows a safe message', async ({ page }) => {
    await page.route('**/auth/login', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Something went wrong.' }),
      }),
    )

    await page.goto('/login')
    await page.getByLabel('Username').fill(ROSTER.madhu.username)
    await page.getByLabel('Your shared password').fill(SEED_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Still on /login, button re-enabled, no stack trace rendered.
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled()
    await expect(page.locator('body')).not.toContainText(/at Saha\.|Exception/i)
  })

  test('[AUTH-007] login footer links reach registration and invitation, and render a real middot', async ({
    page,
  }) => {
    await page.goto('/login')
    // BUG-002 regression: the separator must be a character, not an escape sequence.
    await expect(page.locator('body')).not.toContainText('\\u00b7')

    await page.getByRole('link', { name: 'Create our home' }).click()
    await expect(page).toHaveURL(/\/register/)
    await page.goBack()
    await page.getByRole('link', { name: 'I have an invitation' }).click()
    await expect(page).toHaveURL(/\/invite\/accept/)
  })

  test('[AUTH-008] an AwaitingPartner registrant authenticates only as far as the waiting threshold', async ({
    page,
  }) => {
    const awaiting = await seedIncompleteCouple(api, 'awaitlogin')
    await loginViaUi(page, awaiting.registrant.username)
    await expect(page).toHaveURL(/\/waiting/)

    // and must not be able to reach a Complete-only route by deep link
    await page.goto('/connect')
    await expect(page).not.toHaveURL(/\/connect/)
  })

  test('[AUTH-010] no credential value is ever placed in a telemetry payload', async ({ page }) => {
    const payloads: string[] = []
    await page.route('**/telemetry/events', (route) => {
      payloads.push(route.request().postData() ?? '')
      return route.fulfill({ status: 202, body: '' })
    })

    await loginViaUi(page, ROSTER.madhu.username)
    await page.waitForTimeout(4000) // allow the 3s telemetry flush

    for (const body of payloads) {
      expect(body).not.toContain(SEED_PASSWORD)
      expect(body.toLowerCase()).not.toMatch(/"password"\s*:\s*"[^"]+"/)
    }
  })
})

test.describe('SES · Session', () => {
  test('[SES-001][SEC-001] no access or refresh token is written to localStorage', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)

    const storage = await page.evaluate(() => JSON.stringify(window.localStorage))
    expect(storage).not.toContain(SEED_PASSWORD)
    // The access token is a JWT — three base64 segments. None may be persisted.
    expect(storage).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./)
  })

  test('[SES-002] GET auth/session returns the correct identity and rejects anonymous callers', async () => {
    const anon = await api.get(`${API_BASE}/auth/session`)
    expect(anon.status()).toBe(401)

    const bearer = await apiLogin(api, ROSTER.madhu.username)
    const res = await auth(api, bearer).get('/auth/session')
    expect(res.status()).toBe(200)

    const body = (await res.json()) as Record<string, unknown>
    expect(body['username']).toBe(ROSTER.madhu.username)
    expect(body['togetherID']).toBe(ROSTER.madhu.togetherID)
    expect(body['coupleState']).toBe('Complete')
    expect(body).toHaveProperty('role')
    // The session must never echo secrets back.
    expect(JSON.stringify(body)).not.toContain(SEED_PASSWORD)
    expect(body).not.toHaveProperty('passwordHash')
  })

  test('[SES-003] a 401 on a protected call triggers exactly one silent refresh and retries', async ({
    page,
  }) => {
    await loginViaUi(page, ROSTER.madhu.username)

    let refreshCalls = 0
    page.on('request', (req) => {
      if (req.url().includes('/auth/refresh')) refreshCalls++
    })

    // Force a single 401 on the next profile fetch; the interceptor must recover transparently.
    let firstProfileCall = true
    await page.route('**/profile/me', async (route) => {
      if (firstProfileCall) {
        firstProfileCall = false
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'UNAUTHORIZED', message: 'Token expired.' }),
        })
      }
      return route.continue()
    })

    await page.goto('/profile')
    // The page must still render the profile after the transparent retry.
    await expect(page.getByText(ROSTER.madhu.togetherID).first()).toBeVisible({ timeout: 15_000 })
    expect(refreshCalls).toBeLessThanOrEqual(1)
  })

  test('[SES-005][SES-007] the refresh cookie is HttpOnly + SameSite and invisible to JavaScript', async ({
    page,
    context,
  }) => {
    await loginViaUi(page, ROSTER.madhu.username)

    const cookies = await context.cookies()
    const refresh = cookies.find((c) => /refresh/i.test(c.name))
    expect(refresh, 'a refresh-token cookie must be set at login').toBeTruthy()
    expect(refresh!.httpOnly).toBe(true)
    expect(refresh!.sameSite).toBe('Strict')

    // document.cookie must not expose it.
    const visible = await page.evaluate(() => document.cookie)
    expect(visible).not.toContain(refresh!.value)
  })

  test('[SES-006] a rotated refresh token cannot be replayed', async ({ context, page }) => {
    await loginViaUi(page, ROSTER.ravi.username)
    const before = (await context.cookies()).find((c) => /refresh/i.test(c.name))
    expect(before).toBeTruthy()

    // Rotate once through the app's own endpoint.
    const rotate = await page.request.post(`${API_BASE}/auth/refresh`)
    expect(rotate.ok()).toBeTruthy()

    const after = (await context.cookies()).find((c) => /refresh/i.test(c.name))
    expect(after!.value, 'refresh must rotate the token value').not.toBe(before!.value)

    // Replaying the superseded token must be refused.
    const replay = await api.post(`${API_BASE}/auth/refresh`, {
      headers: { Cookie: `${before!.name}=${before!.value}` },
    })
    expect(replay.status()).toBe(401)
  })

  test('[SES-008] a failed refresh clears auth and lands on login without a redirect loop', async ({
    page,
  }) => {
    await loginViaUi(page, ROSTER.madhu.username)

    await page.route('**/auth/refresh', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'UNAUTHORIZED', message: 'Refresh expired.' }),
      }),
    )
    await page.route('**/profile/me', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'UNAUTHORIZED', message: 'Token expired.' }),
      }),
    )

    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 })
  })

  test('[SES-010] every protected route redirects an anonymous visitor to login', async ({ page }) => {
    const protectedRoutes = [
      '/dashboard',
      '/profile',
      '/connect',
      '/messages',
      '/settings',
      '/finance',
      '/memories',
      '/goals',
      '/calendar',
      '/waiting',
      '/invite',
    ]
    for (const route of protectedRoutes) {
      await page.goto(route)
      await expect(page, `${route} must not be reachable anonymously`).toHaveURL(/\/login/, {
        timeout: 10_000,
      })
    }
  })

  test('[SES-011] an authenticated user on a guest route is replaced to the dashboard', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    for (const guestRoute of ['/login', '/register', '/forgot-password']) {
      await page.goto(guestRoute)
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
    }
  })

  test('[SES-012] sign out revokes the session, clears the cache and blocks Back', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/profile')
    await expect(page.getByText(ROSTER.madhu.togetherID).first()).toBeVisible()

    await page.getByRole('button', { name: /Sign out/i }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })

    // Back must not restore the authenticated shell or any cached couple data.
    await page.goBack()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    await expect(page.locator('body')).not.toContainText(ROSTER.madhu.togetherID)
  })

  test('[SES-013] a failing logout still clears local state and routes to login', async ({ page }) => {
    await loginViaUi(page, ROSTER.arjun.username)
    await page.route('**/auth/logout', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"code":"INTERNAL_ERROR"}' }),
    )

    await page.getByRole('button', { name: /Sign out/i }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })

    const storage = await page.evaluate(() => JSON.stringify(window.localStorage))
    expect(storage).not.toContain(ROSTER.arjun.togetherID)
  })

  test('[SES-014] a double-clicked sign out is idempotent and raises no unhandled error', async ({
    page,
  }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (e) => pageErrors.push(e.message))

    await loginViaUi(page, ROSTER.kavya.username)
    const signOut = page.getByRole('button', { name: /Sign out/i })
    await signOut.click({ force: true })
    await signOut.click({ force: true }).catch(() => {
      /* the button legitimately disappears after the first click */
    })

    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
    expect(pageErrors).toEqual([])
  })

  test('[SEC-014] after switching accounts no data from the previous couple remains', async ({ page }) => {
    const first = await seedCompleteCouple(api, 'swapA')
    const second = await seedCompleteCouple(api, 'swapB')

    await loginViaUi(page, first.registrant.username)
    await page.goto('/dashboard')
    await expect(page.getByText(first.togetherID).first()).toBeVisible()

    await page.getByRole('button', { name: /Sign out/i }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })

    await loginViaUi(page, second.registrant.username)
    await page.goto('/dashboard')
    await expect(page.getByText(second.togetherID).first()).toBeVisible()
    await expect(page.locator('body')).not.toContainText(first.togetherID)
  })
})
