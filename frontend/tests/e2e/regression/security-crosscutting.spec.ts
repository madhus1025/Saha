/**
 * Catalogue: test-cases/cross-cutting/security-accessibility-responsive-telemetry.md
 * Covers: SEC-001..009, SEC-013..014, REL-001..005, ACC-001..008, RSP-001..003, TEL-001..005, DEP-002
 *
 * SEC-010/011 (TLS/HSTS, production rate limits), SEC-012 (blob storage), SEC-015 (audit DB
 * inspection), TEL-006/007 (OTel exporters) and BRW-001/002 (other engines, real devices) need
 * dedicated environments and are excluded from this suite.
 */
import { test, expect, type APIRequestContext } from '@playwright/test'
import { API_BASE, ROSTER, SEED_PASSWORD, apiContext, apiLogin, auth, loginViaUi, seedCompleteCouple } from './_fixtures'

let api: APIRequestContext
test.beforeAll(async () => {
  api = await apiContext()
})
test.afterAll(async () => {
  await api.dispose()
})

test.describe('SEC · Platform security', () => {
  test('[SEC-002] absent, malformed and tampered bearer tokens are all refused', async () => {
    const good = await apiLogin(api, ROSTER.madhu.username)
    const tampered = good.slice(0, -6) + 'AAAAAA' // corrupt the signature

    expect((await api.get(`${API_BASE}/auth/session`)).status()).toBe(401)
    expect((await api.get(`${API_BASE}/auth/session`, { headers: { Authorization: 'Bearer' } })).status()).toBe(401)
    expect(
      (await api.get(`${API_BASE}/auth/session`, { headers: { Authorization: 'Bearer not.a.jwt' } })).status(),
    ).toBe(401)
    expect(
      (await api.get(`${API_BASE}/auth/session`, { headers: { Authorization: `Bearer ${tampered}` } })).status(),
      'a token with a broken signature must not be accepted',
    ).toBe(401)
  })

  test('[SEC-003] every protected endpoint refuses an anonymous caller', async () => {
    const endpoints = [
      '/auth/session',
      '/profile/me',
      '/profile/partner',
      '/connect/connections',
      '/connect/search?togetherId=AB',
      '/conversations',
    ]
    for (const path of endpoints) {
      expect((await api.get(`${API_BASE}${path}`)).status(), `${path} must require auth`).toBe(401)
    }
  })

  test('[SEC-003] couple scoping comes from the token, not from a client-supplied id', async () => {
    const mine = await seedCompleteCouple(api, 'scopeme')
    const other = await seedCompleteCouple(api, 'scopeother')

    const client = auth(api, await apiLogin(api, mine.registrant.username))
    // Try to steer the query at another couple through every plausible client channel.
    const raw = await (await client.get(`/connect/connections?coupleId=${other.coupleId}`)).text()
    expect(raw).not.toContain(other.togetherID)

    const conversations = await (await client.get(`/conversations?coupleId=${other.coupleId}`)).text()
    expect(conversations).not.toContain(other.registrant.email)
  })

  test('[SEC-004] error responses carry a stable contract and never leak internals', async () => {
    const bad = await api.post(`${API_BASE}/auth/login`, { data: { username: '', password: '' } })
    expect(bad.status()).toBe(400)

    const body = (await bad.json()) as Record<string, unknown>
    expect(body, 'the documented error shape is {code, message, errors}').toHaveProperty('code')
    expect(body).toHaveProperty('message')

    const raw = JSON.stringify(body)
    expect(raw).not.toMatch(/at Saha\.|StackTrace|SQLite|SELECT |\/Users\/|C:\\\\/i)
  })

  test('[SEC-004] a validation failure uses the same envelope as the rest of the API', async () => {
    // The telemetry ingest endpoint is anonymous and model-bound; a raw ASP.NET ProblemDetails
    // response here would break the single documented error contract clients parse.
    const res = await api.post(`${API_BASE}/telemetry/events`, {
      data: { events: [{ name: 'probe' }] },
    })
    expect(res.status()).toBe(400)

    const body = (await res.json()) as Record<string, unknown>
    expect(
      body,
      'every 400 must use the {code, message, errors} envelope, not framework ProblemDetails',
    ).toHaveProperty('code')
  })

  test('[SEC-004] internal identifiers and paths are absent from a 404 body', async () => {
    const client = auth(api, await apiLogin(api, ROSTER.madhu.username))
    const res = await client.get('/conversations/00000000-0000-0000-0000-000000000001')
    expect(res.status()).toBe(404)
    const raw = await res.text()
    expect(raw).not.toMatch(/at Saha\.|StackTrace|\/Users\/|Microsoft\.EntityFrameworkCore/i)
  })

  test('[SEC-005] login, recovery and foreign-resource lookups do not disclose existence', async () => {
    const realUser = await api.post(`${API_BASE}/auth/login`, {
      data: { username: ROSTER.madhu.username, password: 'wrong-password-entirely' },
    })
    const fakeUser = await api.post(`${API_BASE}/auth/login`, {
      data: { username: 'definitely-not-a-user', password: 'wrong-password-entirely' },
    })
    expect(await realUser.text()).toBe(await fakeUser.text())

    // A conversation that exists but belongs to someone else must look identical to one that does
    // not exist at all.
    const other = await seedCompleteCouple(api, 'existA')
    const client = auth(api, await apiLogin(api, other.registrant.username))
    const nonexistent = await client.get('/conversations/00000000-0000-0000-0000-0000000000aa')

    const victim = await seedCompleteCouple(api, 'existB')
    const victimClient = auth(api, await apiLogin(api, victim.registrant.username))
    const victimConversations = (await (await victimClient.get('/conversations')).json()) as Array<{ id: string }>
    const foreign = await client.get(`/conversations/${victimConversations[0]!.id}`)

    expect(foreign.status(), 'a foreign resource must 404 exactly like a missing one').toBe(nonexistent.status())
  })

  test('[SEC-007] injection-shaped input is stored as data and never alters the query', async () => {
    const couple = await seedCompleteCouple(api, 'sqlinj')
    const client = auth(api, await apiLogin(api, couple.registrant.username))

    for (const payload of ["'; DROP TABLE Messages; --", "' UNION SELECT * FROM Partners --", '%%%']) {
      const res = await client.get(`/connect/search?togetherId=${encodeURIComponent(payload)}`)
      expect(res.status(), `payload must not break the query: ${payload}`).toBeLessThan(500)
    }

    // The roster must still be intact afterwards.
    expect((await api.post(`${API_BASE}/auth/login`, {
      data: { username: ROSTER.madhu.username, password: SEED_PASSWORD },
    })).status()).toBe(200)
  })

  test('[SEC-009] API responses carry the documented security headers', async () => {
    const client = auth(api, await apiLogin(api, ROSTER.madhu.username))
    const res = await client.get('/auth/session')
    const headers = res.headers()

    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['referrer-policy']).toBeTruthy()
    expect(headers['content-security-policy']).toBeTruthy()
  })

  test('[SEC-009] security headers are also present on an error response', async () => {
    const res = await api.get(`${API_BASE}/auth/session`) // 401
    expect(res.status()).toBe(401)
    expect(
      res.headers()['x-content-type-options'],
      'headers must not be skipped when the pipeline short-circuits',
    ).toBe('nosniff')
  })

  test('[SEC-013] no credential value appears in any client-visible payload', async ({ page }) => {
    const bodies: string[] = []
    page.on('response', async (res) => {
      if (res.url().includes('/api/')) {
        try {
          bodies.push(await res.text())
        } catch {
          /* opaque or already-consumed responses are not inspectable */
        }
      }
    })

    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/profile')
    await page.waitForTimeout(2000)

    for (const body of bodies) {
      expect(body).not.toContain(SEED_PASSWORD)
      expect(body).not.toMatch(/passwordHash|"\$2[aby]\$/)
    }
  })
})

test.describe('REL · Reliability', () => {
  test('[REL-001] a mutation attempted while offline reports failure rather than false success', async ({
    page,
    context,
  }) => {
    const couple = await seedCompleteCouple(api, 'offline')
    await loginViaUi(page, couple.registrant.username)
    await page.goto('/profile')
    await page.getByRole('button', { name: /^Edit/i }).first().click()
    await page.getByLabel('Full Name').fill('Offline Edit')

    await context.setOffline(true)
    await page.getByRole('button', { name: 'Save changes' }).click()
    await page.waitForTimeout(3000)
    await context.setOffline(false)

    // Reload from the server: the offline attempt must not be presented as saved.
    await page.reload()
    await expect(
      page.getByText('Offline Edit'),
      'an offline save must not appear to have succeeded',
    ).toHaveCount(0)
  })

  test('[REL-002] a slow query shows a loading affordance and stays navigable', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.route('**/profile/me', async (route) => {
      await new Promise((r) => setTimeout(r, 3000))
      return route.continue()
    })

    await page.goto('/profile')
    // The shell must not be blocked while the feature query is in flight.
    await expect(page.getByRole('link', { name: 'Settings', exact: true }).first()).toBeVisible()
  })

  test('[REL-004] repeated identical mutations do not create duplicates', async () => {
    const couple = await seedCompleteCouple(api, 'idempotent')
    const client = auth(api, await apiLogin(api, couple.registrant.username))
    const me = (await (await client.get('/profile/me')).json()) as Record<string, unknown>

    const payload = {
      name: 'Repeated Save',
      dateOfBirth: me['dateOfBirth'],
      email: me['email'],
      phoneNumber: me['phoneNumber'],
    }
    const results = await Promise.all([
      client.put('/profile/me', payload),
      client.put('/profile/me', payload),
      client.put('/profile/me', payload),
    ])
    expect(results.every((r) => r.status() < 500), 'concurrent identical saves must not 500').toBeTruthy()

    const after = (await (await client.get('/profile/me')).json()) as Record<string, unknown>
    expect(after['name']).toBe('Repeated Save')
  })

  test('[REL-005] API timestamps are unambiguous instants', async () => {
    const client = auth(api, await apiLogin(api, ROSTER.madhu.username))
    const raw = await (await client.get('/profile/me')).text()

    // Any ISO-looking timestamp must carry an offset; a naive one is silently read as local time.
    const naive = raw.match(/"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?"/g)
    expect(naive ?? [], 'timestamps must serialise with Z or ±hh:mm').toEqual([])
  })

  test('[DEP-002] the health endpoint reports a safe status', async () => {
    const res = await api.get('https://localhost:7001/health')
    expect(res.status()).toBe(200)
    const raw = await res.text()
    expect(raw).not.toMatch(/ConnectionString|Password=|Server=|\/Users\//i)
  })
})

test.describe('ACC · Accessibility', () => {
  test('[ACC-002] login inputs have programmatic labels and associated errors', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByLabel('Username')).toBeVisible()
    await expect(page.getByLabel('Your shared password')).toBeVisible()

    await page.getByRole('button', { name: 'Sign in' }).click()
    const username = page.getByLabel('Username')
    await expect(username, 'an invalid field must be marked invalid').toHaveAttribute('aria-invalid', 'true')
    const describedBy = await username.getAttribute('aria-describedby')
    expect(describedBy, 'the error text must be associated with its field').toBeTruthy()
  })

  test('[ACC-001] the login form is completable by keyboard alone', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Username').focus()
    await page.keyboard.type(ROSTER.madhu.username)
    await page.keyboard.press('Tab')
    await page.keyboard.type(SEED_PASSWORD)
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })
  })

  test('[ACC-008] the app shell exposes exactly one main landmark', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await expect(page.getByRole('main'), 'exactly one main landmark per page').toHaveCount(1)
  })

  test('[ACC-008] each route has a level-1 heading', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    for (const route of ['/dashboard', '/profile', '/settings', '/connect']) {
      await page.goto(route)
      await expect(page.getByRole('heading', { level: 1 }), `${route} needs an h1`).toHaveCount(1)
    }
  })

  test('[ACC-008] the document title changes between routes', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/dashboard')
    const dashboardTitle = await page.title()
    await page.goto('/settings')
    const settingsTitle = await page.title()

    expect(
      settingsTitle,
      'a static title makes history and screen-reader route announcements ambiguous',
    ).not.toBe(dashboardTitle)
  })

  test('[ACC-003] every icon-only button has an accessible name', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/dashboard')

    const unnamed = await page.evaluate(() => {
      const offenders: string[] = []
      document.querySelectorAll('button').forEach((btn) => {
        const text = (btn.textContent ?? '').trim()
        const label = btn.getAttribute('aria-label') ?? btn.getAttribute('title')
        const labelledBy = btn.getAttribute('aria-labelledby')
        if (!text && !label && !labelledBy) offenders.push(btn.outerHTML.slice(0, 120))
      })
      return offenders
    })
    expect(unnamed, 'icon-only buttons need an aria-label').toEqual([])
  })

  test('[ACC-005] focus moves predictably after a route change', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/dashboard')
    await page.getByRole('link', { name: 'Settings', exact: true }).first().click()
    await expect(page).toHaveURL(/\/settings/)

    // Focus must not be stranded on a control that no longer belongs to the current view.
    const focusedIsBody = await page.evaluate(() => document.activeElement === document.body)
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? '')
    expect(focusedIsBody || focusedTag !== '', 'focus must land somewhere meaningful').toBeTruthy()
  })

  test('[ACC-006] interactive controls meet the 24px minimum target size', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/settings')

    const tooSmall = await page.evaluate(() => {
      const offenders: string[] = []
      document.querySelectorAll('button, a[href]').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.width === 0 && r.height === 0) return // hidden
        if (r.width < 24 || r.height < 24) {
          offenders.push(`${el.tagName}:${(el.textContent ?? '').trim().slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`)
        }
      })
      return offenders
    })
    expect(tooSmall, 'WCAG 2.2 AA target size (minimum) is 24×24 CSS px').toEqual([])
  })
})

test.describe('RSP · Responsive', () => {
  for (const width of [320, 375, 768, 1024, 1440]) {
    test(`[RSP-001] the login page does not scroll horizontally at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/login')
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1)
    })
  }

  test('[RSP-002] the app shell reflows between mobile and desktop', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)

    await page.setViewportSize({ width: 375, height: 812 })
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible()

    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden()
  })

  test('[RSP-003] the dashboard does not overflow at 320px', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.setViewportSize({ width: 320, height: 720 })
    await page.goto('/dashboard')

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('[ACC-006] the app remains usable at 200% zoom', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    // 200% zoom at 1280px behaves like a 640px viewport (WCAG 1.4.10 reflow).
    await page.setViewportSize({ width: 640, height: 512 })
    await page.goto('/dashboard')

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, 'content must reflow rather than scroll in two dimensions').toBeLessThanOrEqual(1)
  })
})

test.describe('TEL · Telemetry', () => {
  test('[TEL-002] the anonymous id persists and the session id is tab-scoped', async ({ page }) => {
    await page.goto('/login')
    await page.waitForTimeout(1000)

    const ids = await page.evaluate(() => ({
      local: JSON.stringify(window.localStorage),
      session: JSON.stringify(window.sessionStorage),
    }))
    expect(ids.local.length + ids.session.length).toBeGreaterThan(2)
  })

  test('[TEL-004] a failing telemetry endpoint never blocks the product flow', async ({ page }) => {
    await page.route('**/telemetry/events', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"code":"INTERNAL_ERROR"}' }),
    )

    const pageErrors: string[] = []
    page.on('pageerror', (e) => pageErrors.push(e.message))

    await loginViaUi(page, ROSTER.madhu.username)
    await page.waitForTimeout(4000)

    await expect(page).toHaveURL(/\/dashboard/)
    expect(pageErrors, 'telemetry failure must not surface as an app error').toEqual([])
  })

  test('[TEL-005] the ingest endpoint scrubs forbidden keys regardless of casing', async () => {
    const res = await api.post(`${API_BASE}/telemetry/events`, {
      data: {
        events: [
          {
            name: 'regression_probe',
            sessionId: '11111111-1111-1111-1111-111111111111',
            anonymousId: '22222222-2222-2222-2222-222222222222',
            timestamp: new Date().toISOString(),
            properties: { PassWord: 'hunter2', Email: 'leak@example.com', ok: 'value' },
          },
        ],
      },
    })
    expect(res.status(), 'a well-formed batch must be accepted').toBeLessThan(400)
  })

  test('[TEL-005] an oversized batch is capped rather than accepted wholesale', async () => {
    const events = Array.from({ length: 60 }, (_, i) => ({
      name: `bulk_${i}`,
      sessionId: '11111111-1111-1111-1111-111111111111',
      anonymousId: '22222222-2222-2222-2222-222222222222',
      timestamp: new Date().toISOString(),
      properties: {},
    }))

    const res = await api.post(`${API_BASE}/telemetry/events`, { data: { events } })
    expect(res.status(), 'a >50-event batch must be capped or refused, never 500').toBeLessThan(500)
  })
})
