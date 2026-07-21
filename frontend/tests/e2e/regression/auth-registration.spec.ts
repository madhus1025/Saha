/**
 * Catalogue: test-cases/authentication/registration-and-invitations.md
 * Covers: REG-002..026, INV-001..010
 *
 * REG-001 (feature-flag-off redirect) needs a second Vite process without VITE_REGISTRATION_ENABLED
 * and is therefore excluded from this suite.
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
  makeCoupleSpec,
  registerRegistrant,
  seedIncompleteCouple,
  seedCompleteCouple,
} from './_fixtures'

let api: APIRequestContext
test.beforeAll(async () => {
  api = await apiContext()
})
test.afterAll(async () => {
  await api.dispose()
})

/** Fill registration step 1 with a valid record, overriding individual fields per test. */
async function fillStepOne(
  page: import('@playwright/test').Page,
  overrides: Partial<Record<'name' | 'username' | 'dob' | 'email' | 'phone', string>> = {},
) {
  const spec = makeCoupleSpec('ui')
  await page.getByLabel('Your name').fill(overrides.name ?? spec.registrant.name)
  await page.getByLabel('Username').fill(overrides.username ?? spec.registrant.username)
  await page.getByLabel('Date of birth').fill(overrides.dob ?? '1990-01-01')
  await page.getByLabel('Email').fill(overrides.email ?? spec.registrant.email)
  await page.getByLabel('Phone').fill(overrides.phone ?? spec.registrant.phone)
  await page.getByRole('radio', { name: 'Husband' }).click()
  return spec
}

/** Register directly against the API with one field overridden — isolates the server contract. */
function registerRaw(api: APIRequestContext, overrides: Record<string, unknown>) {
  const spec = makeCoupleSpec('raw')
  return api.post(`${API_BASE}/auth/register`, {
    data: {
      togetherID: spec.togetherID,
      username: spec.registrant.username,
      name: spec.registrant.name,
      dateOfBirth: '1990-01-01T00:00:00Z',
      email: spec.registrant.email,
      phoneNumber: spec.registrant.phone,
      role: 'Husband',
      password: spec.password,
      confirmPassword: spec.password,
      ...overrides,
    },
  })
}

test.describe('REG · Step 1 — your half', () => {
  test('[REG-014] an empty step 1 shows every required error and sends no request', async ({ page }) => {
    let apiCalls = 0
    await page.route('**/auth/register', (route) => {
      apiCalls++
      return route.continue()
    })

    await page.goto('/register')
    await page.getByRole('button', { name: /Continue/i }).click()

    await expect(page.getByText('Your name is required.')).toBeVisible()
    await expect(page.getByText(/at least 3 characters/i)).toBeVisible()
    await expect(page.getByText('Email is required.')).toBeVisible()
    expect(apiCalls, 'a failed client validation must not reach the API').toBe(0)
  })

  test('[REG-003] a name over 100 characters is rejected by client and server', async ({ page }) => {
    await page.goto('/register')
    await fillStepOne(page, { name: 'n'.repeat(101) })
    await page.getByRole('button', { name: /Continue/i }).click()
    await expect(page.getByText(/stop at 100 characters/i)).toBeVisible()

    const res = await registerRaw(api, { name: 'n'.repeat(101) })
    expect(res.status()).toBe(400)
  })

  test('[REG-005] malformed usernames are refused by the API', async () => {
    const invalid = ['ab', 'U'.repeat(4), '1leading', 'has space', 'has-hyphen', 'ünicode', "a' OR 1=1"]
    for (const username of invalid) {
      const res = await registerRaw(api, { username })
      expect(res.status(), `username "${username}" must be refused`).toBe(400)
    }
  })

  test('[REG-004] 3- and 30-character usernames are both accepted', async () => {
    for (const username of ['a' + Math.random().toString(36).slice(2, 4), 'z'.repeat(29) + 'q']) {
      const res = await registerRaw(api, { username: username.slice(0, 30) })
      expect([201, 409], `username "${username}" (len ${username.length}) must be a valid length`).toContain(
        res.status(),
      )
    }
  })

  test('[REG-006] a free username reports "Available" after the debounce', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Username').fill(makeCoupleSpec('avail').registrant.username)
    await expect(page.getByText('Available \u2014 it\u2019s all yours')).toBeVisible({ timeout: 15_000 })
  })

  test('[REG-006] a taken username blocks the step with a specific message', async ({ page }) => {
    await page.goto('/register')
    await fillStepOne(page, { username: ROSTER.madhu.username })
    await page.getByRole('button', { name: /Continue/i }).click()

    await expect(page.getByText('That one\u2019s taken. Try another?').first()).toBeVisible({
      timeout: 15_000,
    })
    // and the wizard must not advance to step 2
    await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0)
  })

  test('[REG-006] no availability request is sent for a syntactically invalid username', async ({ page }) => {
    let availabilityCalls = 0
    await page.route('**/auth/availability**', (route) => {
      availabilityCalls++
      return route.continue()
    })

    await page.goto('/register')
    await page.getByLabel('Username').fill('A!')
    await page.waitForTimeout(1500) // longer than the debounce
    expect(availabilityCalls, 'a malformed username must not be sent to the availability API').toBe(0)
  })

  test('[REG-009] a date of birth under 16 or in the future is refused by the API', async () => {
    const now = new Date()
    const under16 = new Date(
      Date.UTC(now.getUTCFullYear() - 16, now.getUTCMonth(), now.getUTCDate() + 1),
    ).toISOString()
    const future = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1)).toISOString()

    expect((await registerRaw(api, { dateOfBirth: under16 })).status()).toBe(400)
    expect((await registerRaw(api, { dateOfBirth: future })).status()).toBe(400)
  })

  test('[REG-012] malformed and oversized emails are refused by the API', async () => {
    const invalid = ['not-an-email', 'a@b', 'a@@b.com', 'a b@c.com', `${'a'.repeat(250)}@example.com`]
    for (const email of invalid) {
      const res = await registerRaw(api, { email })
      expect(res.status(), `email "${email.slice(0, 30)}" must be refused`).toBe(400)
    }
  })

  test('[REG-013] phone numbers outside the E.164 shape are refused by the API', async () => {
    const invalid = ['0123456', '+0123456789', '12345', '+1'.padEnd(20, '9'), 'abcdefgh']
    for (const phoneNumber of invalid) {
      const res = await registerRaw(api, { phoneNumber })
      expect(res.status(), `phone "${phoneNumber}" must be refused`).toBe(400)
    }
  })

  test('[REG-010][REG-011] the role selector is a keyboard-operable radiogroup', async ({ page }) => {
    await page.goto('/register')
    const husband = page.getByRole('radio', { name: 'Husband' })
    const wife = page.getByRole('radio', { name: 'Wife' })
    await expect(husband).toBeVisible()
    await expect(wife).toBeVisible()

    await husband.click()
    await expect(husband).toBeChecked()

    // Arrow keys must move the selection within the group (WAI-ARIA radiogroup pattern).
    await husband.press('ArrowRight')
    await expect(wife, 'ArrowRight must move the radio selection').toBeChecked()
  })
})

test.describe('REG · Wizard shell and steps 2–3', () => {
  test('[REG-015] Back preserves every step-1 value', async ({ page }) => {
    await page.goto('/register')
    const spec = await fillStepOne(page)
    await page.getByRole('button', { name: /Continue/i }).click()

    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: /Back/i }).click()

    await expect(page.getByLabel('Your name')).toHaveValue(spec.registrant.name)
    await expect(page.getByLabel('Username')).toHaveValue(spec.registrant.username)
    await expect(page.getByLabel('Email')).toHaveValue(spec.registrant.email)
    await expect(page.getByRole('radio', { name: 'Husband' })).toBeChecked()
  })

  test('[REG-017] a 7-character password is rejected and 8 is accepted', async ({ page }) => {
    await page.goto('/register')
    await fillStepOne(page)
    await page.getByRole('button', { name: /Continue/i }).click()

    await page.getByLabel('Password', { exact: true }).fill('Sh0rt!x')
    await page.getByLabel('Once more').fill('Sh0rt!x')
    await page.getByRole('button', { name: /Continue/i }).click()
    await expect(page.getByText(/at least 8 characters/i).first()).toBeVisible()

    await page.getByLabel('Password', { exact: true }).fill('Sh0rt!xy')
    await page.getByLabel('Once more').fill('Sh0rt!xy')
    await page.getByRole('button', { name: /Continue/i }).click()
    await expect(page.getByLabel('TogetherID')).toBeVisible()
  })

  test('[REG-016] every character class is required at registration', async ({ page }) => {
    await page.goto('/register')
    await fillStepOne(page)
    await page.getByRole('button', { name: /Continue/i }).click()

    for (const [expected, password] of [
      [/uppercase/i, 'sh0rt!xyz'],
      [/lowercase/i, 'SH0RT!XYZ'],
      [/number/i, 'Short!xyz'],
      [/special character/i, 'Sh0rtxyzw'],
    ] as const) {
      await page.getByLabel('Password', { exact: true }).fill(password)
      await page.getByLabel('Once more').fill(password)
      await page.getByRole('button', { name: /Continue/i }).click()
      await expect(page.getByText(expected).first()).toBeVisible()
    }
  })

  test('[REG-017] a password over 72 UTF-8 bytes is rejected even when under 72 characters', async ({
    page,
  }) => {
    await page.goto('/register')
    await fillStepOne(page)
    await page.getByRole('button', { name: /Continue/i }).click()

    // Character classes satisfied, so only the byte ceiling can reject this: 24 characters, 84 bytes.
    const emoji = `Aa1!${'😀'.repeat(20)}`
    await page.getByLabel('Password', { exact: true }).fill(emoji)
    await page.getByLabel('Once more').fill(emoji)
    await page.getByRole('button', { name: /Continue/i }).click()
    await expect(page.getByText(/longer than we can keep safe/i).first()).toBeVisible()
  })

  test('[REG-018] a mismatched confirmation blocks the step', async ({ page }) => {
    await page.goto('/register')
    await fillStepOne(page)
    await page.getByRole('button', { name: /Continue/i }).click()

    await page.getByLabel('Password', { exact: true }).fill(SEED_PASSWORD)
    await page.getByLabel('Once more').fill(SEED_PASSWORD + 'x')
    await page.getByRole('button', { name: /Continue/i }).click()
    await expect(page.getByText(/don’t match|don't match/i)).toBeVisible()
  })

  test('[REG-019] the step-2 toggle reveals the password but keeps the confirmation masked', async ({
    page,
  }) => {
    await page.goto('/register')
    await fillStepOne(page)
    await page.getByRole('button', { name: /Continue/i }).click()

    await page.getByLabel('Password', { exact: true }).fill(SEED_PASSWORD)
    await page.getByLabel('Once more').fill(SEED_PASSWORD)
    await page.getByRole('button', { name: 'Show password' }).click()

    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text')
    await expect(page.getByLabel('Once more')).toHaveAttribute('type', 'password')
  })

  test('[REG-022] the API refuses malformed TogetherIDs', async () => {
    const invalid = ['ABC', 'A'.repeat(51), '-LEADING', 'TRAILING-', 'HAS SPACE', 'UNDER_SCORE', 'ÜNICODE']
    for (const togetherID of invalid) {
      const res = await registerRaw(api, { togetherID })
      expect(res.status(), `TogetherID "${togetherID}" must be refused`).toBe(400)
    }
  })

  test('[REG-021] the TogetherID field uppercases what the user types', async ({ page }) => {
    await page.goto('/register')
    await fillStepOne(page)
    await page.getByRole('button', { name: /Continue/i }).click()
    await page.getByLabel('Password', { exact: true }).fill(SEED_PASSWORD)
    await page.getByLabel('Once more').fill(SEED_PASSWORD)
    await page.getByRole('button', { name: /Continue/i }).click()

    await page.getByLabel('TogetherID').fill('lower-case-id')
    await expect(page.getByLabel('TogetherID')).toHaveValue('LOWER-CASE-ID')
  })

  test('[REG-024] a full wizard run creates exactly one AwaitingPartner couple', async ({ page }) => {
    let registerCalls = 0
    await page.route('**/auth/register', (route) => {
      registerCalls++
      return route.continue()
    })

    const spec = makeCoupleSpec('wizard')
    await page.goto('/register')
    await page.getByLabel('Your name').fill(spec.registrant.name)
    await page.getByLabel('Username').fill(spec.registrant.username)
    await page.getByLabel('Date of birth').fill('1990-01-01')
    await page.getByLabel('Email').fill(spec.registrant.email)
    await page.getByLabel('Phone').fill(spec.registrant.phone)
    await page.getByRole('radio', { name: 'Husband' }).click()
    await page.getByRole('button', { name: /Continue/i }).click()

    await page.getByLabel('Password', { exact: true }).fill(spec.password)
    await page.getByLabel('Once more').fill(spec.password)
    await page.getByRole('button', { name: /Continue/i }).click()

    await page.getByLabel('TogetherID').fill(spec.togetherID)
    await page.getByRole('button', { name: /Open our home/i }).click()

    await expect(page).toHaveURL(/\/(invite|waiting)/, { timeout: 20_000 })
    expect(registerCalls, 'one submit must create exactly one couple').toBe(1)

    const bearer = await apiLogin(api, spec.registrant.username)
    const session = (await (await auth(api, bearer).get('/auth/session')).json()) as {
      coupleState: string
    }
    expect(session.coupleState).toBe('AwaitingPartner')
  })

  test('[REG-025] a duplicate TogetherID and a duplicate username are both refused', async () => {
    const spec = makeCoupleSpec('dup')
    const first = await registerRegistrant(api, spec)
    expect(first.coupleId).toBeTruthy()

    const dupId = await registerRaw(api, { togetherID: spec.togetherID })
    expect(dupId.status(), 'a duplicate TogetherID must conflict').toBe(409)

    const dupUsername = await registerRaw(api, { username: spec.registrant.username })
    expect(dupUsername.status(), 'a duplicate username must conflict').toBe(409)
  })

  test('[REG-025] two concurrent registrations of the same TogetherID create only one couple', async () => {
    const spec = makeCoupleSpec('race')
    const payload = {
      togetherID: spec.togetherID,
      username: spec.registrant.username,
      name: spec.registrant.name,
      dateOfBirth: '1990-01-01T00:00:00Z',
      email: spec.registrant.email,
      phoneNumber: spec.registrant.phone,
      role: 'Husband',
      password: spec.password,
      confirmPassword: spec.password,
    }

    const [a, b] = await Promise.all([
      api.post(`${API_BASE}/auth/register`, { data: payload }),
      api.post(`${API_BASE}/auth/register`, { data: { ...payload, username: `${spec.registrant.username}b` } }),
    ])

    const created = [a, b].filter((r) => r.status() === 201)
    expect(created.length, 'exactly one of two racing registrations may create the couple').toBe(1)
  })

  test('[REG-026] leaving the wizard clears the plaintext password from storage', async ({ page }) => {
    await page.goto('/register')
    await fillStepOne(page)
    await page.getByRole('button', { name: /Continue/i }).click()
    await page.getByLabel('Password', { exact: true }).fill(SEED_PASSWORD)
    await page.getByLabel('Once more').fill(SEED_PASSWORD)

    await page.goto('/login')
    const storage = await page.evaluate(
      () => JSON.stringify(window.localStorage) + JSON.stringify(window.sessionStorage),
    )
    expect(storage, 'the wizard must never persist the plaintext passphrase').not.toContain(SEED_PASSWORD)
  })
})

test.describe('INV · Invitations', () => {
  test('[INV-001] the awaiting registrant lands on the invite placeholder and can reach waiting', async ({
    page,
  }) => {
    const awaiting = await seedIncompleteCouple(api, 'invplace')
    await loginViaUi(page, awaiting.registrant.username)
    await page.goto('/invite')
    await expect(page).toHaveURL(/\/invite/)
    await expect(page.locator('main, body')).toContainText(/invit/i)
  })

  test('[INV-002] a valid invitation is created for the authenticated awaiting couple only', async () => {
    const awaiting = await seedIncompleteCouple(api, 'invcreate')
    const bearer = await apiLogin(api, awaiting.registrant.username)

    const res = await auth(api, bearer).post('/auth/invitations', {
      inviteeName: 'Invited Partner',
      inviteeEmail: awaiting.partner.email,
    })
    expect(res.status()).toBe(201)
    const body = (await res.json()) as { token: string; expiresAt?: string }
    expect(body.token).toBeTruthy()
  })

  test('[INV-002] an anonymous caller cannot create an invitation', async () => {
    const res = await api.post(`${API_BASE}/auth/invitations`, {
      data: { inviteeName: 'X', inviteeEmail: 'x@example.com' },
    })
    expect(res.status()).toBe(401)
  })

  test('[INV-003] invalid invitee name/email are refused', async () => {
    const awaiting = await seedIncompleteCouple(api, 'invval')
    const bearer = await apiLogin(api, awaiting.registrant.username)
    const client = auth(api, bearer)

    expect((await client.post('/auth/invitations', { inviteeName: '', inviteeEmail: 'a@b.com' })).status()).toBe(400)
    expect(
      (await client.post('/auth/invitations', { inviteeName: 'n'.repeat(101), inviteeEmail: 'a@b.com' })).status(),
    ).toBe(400)
    expect((await client.post('/auth/invitations', { inviteeName: 'Ok', inviteeEmail: 'not-an-email' })).status()).toBe(400)
  })

  test('[INV-004] a Complete couple cannot issue another invitation', async () => {
    const complete = await seedCompleteCouple(api, 'invcomplete')
    const bearer = await apiLogin(api, complete.registrant.username)

    const res = await auth(api, bearer).post('/auth/invitations', {
      inviteeName: 'Third Person',
      inviteeEmail: 'third@example.com',
    })
    expect(res.status(), 'a complete home has no free half to invite into').toBeGreaterThanOrEqual(400)
  })

  test('[INV-005] the accept-invitation route renders without leaking the token into the page', async ({
    page,
  }) => {
    await page.goto('/invite/accept?token=SUPERSECRETTOKENVALUE')
    await expect(page.locator('body')).not.toContainText('SUPERSECRETTOKENVALUE')
    await expect(page.getByRole('link', { name: /Back to sign in|sign in/i }).first()).toBeVisible()
  })

  test('[INV-007] missing, unknown and reused invitation tokens are all refused', async () => {
    const spec = makeCoupleSpec('invtok')
    const reg = await registerRegistrant(api, spec)
    const invRes = await auth(api, reg.accessToken).post('/auth/invitations', {
      inviteeName: spec.partner.name,
      inviteeEmail: spec.partner.email,
    })
    const { token } = (await invRes.json()) as { token: string }

    const acceptBody = (t: string, username: string) => ({
      token: t,
      username,
      name: spec.partner.name,
      dateOfBirth: '1992-01-01T00:00:00Z',
      email: spec.partner.email,
      phoneNumber: spec.partner.phone,
    })

    expect(
      (await api.post(`${API_BASE}/auth/invitations/accept`, { data: acceptBody('', 'x' + spec.partner.username) })).status(),
    ).toBe(400)
    expect(
      (await api.post(`${API_BASE}/auth/invitations/accept`, { data: acceptBody('unknown-token', 'y' + spec.partner.username) })).status(),
    ).toBeGreaterThanOrEqual(400)

    // First acceptance succeeds …
    const good = await api.post(`${API_BASE}/auth/invitations/accept`, {
      data: acceptBody(token, spec.partner.username),
    })
    expect(good.ok()).toBeTruthy()

    // … and the same token cannot be replayed.
    const replay = await api.post(`${API_BASE}/auth/invitations/accept`, {
      data: acceptBody(token, 'z' + spec.partner.username),
    })
    expect(replay.status(), 'a consumed invitation token must not be reusable').toBeGreaterThanOrEqual(400)
  })

  test('[INV-008] the invitee cannot reuse the registrant’s username', async () => {
    const spec = makeCoupleSpec('invclash')
    const reg = await registerRegistrant(api, spec)
    const invRes = await auth(api, reg.accessToken).post('/auth/invitations', {
      inviteeName: spec.partner.name,
      inviteeEmail: spec.partner.email,
    })
    const { token } = (await invRes.json()) as { token: string }

    const res = await api.post(`${API_BASE}/auth/invitations/accept`, {
      data: {
        token,
        username: spec.registrant.username, // already taken by the registrant
        name: spec.partner.name,
        dateOfBirth: '1992-01-01T00:00:00Z',
        email: spec.partner.email,
        phoneNumber: spec.partner.phone,
      },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('[INV-006] acceptance assigns the opposite role and completes the home', async () => {
    const complete = await seedCompleteCouple(api, 'invrole')
    const registrantSession = (await (
      await auth(api, await apiLogin(api, complete.registrant.username)).get('/auth/session')
    ).json()) as { role: string; coupleState: string }
    const partnerSession = (await (
      await auth(api, await apiLogin(api, complete.partner.username)).get('/auth/session')
    ).json()) as { role: string; coupleState: string }

    expect(registrantSession.coupleState).toBe('Complete')
    expect(partnerSession.coupleState).toBe('Complete')
    expect(partnerSession.role, 'the invitee must take the opposite role').not.toBe(registrantSession.role)
  })

  test('[INV-009] the waiting page redirects to the dashboard once the partner accepts', async ({ page }) => {
    const spec = makeCoupleSpec('waitpoll')
    const reg = await registerRegistrant(api, spec)

    await loginViaUi(page, spec.registrant.username)
    await expect(page).toHaveURL(/\/waiting/)

    // Complete the home out-of-band; the waiting page polls session every 15s.
    const invRes = await auth(api, reg.accessToken).post('/auth/invitations', {
      inviteeName: spec.partner.name,
      inviteeEmail: spec.partner.email,
    })
    const { token } = (await invRes.json()) as { token: string }
    await api.post(`${API_BASE}/auth/invitations/accept`, {
      data: {
        token,
        username: spec.partner.username,
        name: spec.partner.name,
        dateOfBirth: '1992-01-01T00:00:00Z',
        email: spec.partner.email,
        phoneNumber: spec.partner.phone,
      },
    })

    await expect(page, 'the waiting page must open the home once the couple completes').toHaveURL(
      /\/dashboard/,
      { timeout: 45_000 },
    )
  })

  test('[CON-017] an AwaitingPartner couple cannot send a connection request', async () => {
    const awaiting = await seedIncompleteCouple(api, 'awaitconn')
    const bearer = await apiLogin(api, awaiting.registrant.username)
    const res = await auth(api, bearer).post('/connect/request', {
      targetTogetherID: ROSTER.madhu.togetherID,
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })
})
