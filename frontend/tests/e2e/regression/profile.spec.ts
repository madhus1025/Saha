/**
 * Catalogue: test-cases/profile/profile-and-partner-view.md
 * Covers: PRF-001..013, PRF-018..023
 *
 * PRF-014..017 (avatar upload) require blob-backed storage and are excluded from this suite.
 */
import { test, expect, type APIRequestContext } from '@playwright/test'
import { ROSTER, apiContext, apiLogin, auth, loginViaUi, seedCompleteCouple } from './_fixtures'

let api: APIRequestContext
test.beforeAll(async () => {
  api = await apiContext()
})
test.afterAll(async () => {
  await api.dispose()
})

/** Open the Partner tab (its label is "<partner name>'s Profile", never "My Profile"). */
async function openPartnerTab(page: import('@playwright/test').Page) {
  await expect(page.getByRole('tab', { name: 'My Profile' })).toBeVisible({ timeout: 15_000 })
  await page
    .getByRole('tab')
    .filter({ hasNotText: 'My Profile' })
    .first()
    .click()
}

/** Enter partner-view mode from the Partner tab and wait for the banner. */
async function enterPartnerView(page: import('@playwright/test').Page) {
  await openPartnerTab(page)
  const viewAs = page.getByRole('button', { name: 'View as partner' })
  await expect(viewAs).toBeVisible({ timeout: 15_000 })
  await viewAs.click()
  await expect(page.getByText(/Viewing .+’s profile/i).first()).toBeVisible({ timeout: 15_000 })
}

/** PUT /profile/me with one field overridden from a valid baseline. */
async function updateProfile(
  api: APIRequestContext,
  username: string,
  overrides: Record<string, unknown>,
) {
  const bearer = await apiLogin(api, username)
  const client = auth(api, bearer)
  const me = (await (await client.get('/profile/me')).json()) as Record<string, unknown>
  return client.put('/profile/me', {
    name: me['name'],
    dateOfBirth: me['dateOfBirth'],
    email: me['email'],
    phoneNumber: me['phoneNumber'],
    ...overrides,
  })
}

test.describe('PRF · Profile display', () => {
  test('[PRF-001] My Profile shows the signed-in partner’s own record', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/profile')

    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()
    await expect(page.getByText(ROSTER.madhu.togetherID).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^Edit/i }).first()).toBeVisible()
  })

  test('[PRF-002] the partner tab is read-only — no Edit and no photo control', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/profile')

    await openPartnerTab(page)
    await expect(page.getByRole('button', { name: 'Change profile picture' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Edit/i })).toHaveCount(0)
  })

  test('[PRF-003][ACC-003] the profile tabs expose tab semantics and a selected state', async ({
    page,
  }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/profile')

    // Two mutually exclusive views of the same panel is the WAI-ARIA tabs pattern. Without
    // role=tab/aria-selected (or an equivalent), a screen-reader user cannot tell which of the two
    // is active — the current state is carried only by background colour.
    const tabs = page.getByRole('tab')
    await expect(tabs, 'the profile tabs must be exposed as tabs').toHaveCount(2)
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1)
  })

  test('[PRF-004] a 500 on the profile query renders a recoverable state, not a blank page', async ({
    page,
  }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.route('**/profile/me', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Something went wrong.' }),
      }),
    )

    await page.goto('/profile')
    // Something must be rendered for the user — heading, error or retry — never an empty main.
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()
    const bodyText = (await page.locator('body').innerText()).trim()
    expect(bodyText.length, 'a failed profile load must not leave a blank screen').toBeGreaterThan(20)
  })
})

test.describe('PRF · Editing', () => {
  test('[PRF-005] Edit opens a prepopulated form', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/profile')
    await page.getByRole('button', { name: /^Edit/i }).first().click()

    await expect(page.getByLabel('Full Name')).not.toHaveValue('')
    await expect(page.getByLabel('Email')).not.toHaveValue('')
    await expect(page.getByLabel('Date of Birth')).not.toHaveValue('')
  })

  test('[PRF-010] a valid name change persists across a reload', async ({ page }) => {
    const couple = await seedCompleteCouple(api, 'prfpersist')
    await loginViaUi(page, couple.registrant.username)
    await page.goto('/profile')

    const newName = `Renamed ${Date.now()}`
    await page.getByRole('button', { name: /^Edit/i }).first().click()
    await page.getByLabel('Full Name').fill(newName)
    await page.getByRole('button', { name: 'Save changes' }).click()

    await expect(page.getByText(newName).first()).toBeVisible({ timeout: 15_000 })
    await page.reload()
    await expect(page.getByText(newName).first()).toBeVisible()
  })

  test('[PRF-012] Cancel discards the pending edits', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/profile')
    await page.getByRole('button', { name: /^Edit/i }).first().click()

    const original = await page.getByLabel('Full Name').inputValue()
    await page.getByLabel('Full Name').fill('Discard me')
    await page.getByRole('button', { name: /Cancel/i }).click()

    await page.getByRole('button', { name: /^Edit/i }).first().click()
    await expect(page.getByLabel('Full Name')).toHaveValue(original)
  })

  test('[PRF-006] an empty and an over-long name are refused by the API', async () => {
    const couple = await seedCompleteCouple(api, 'prfname')
    expect((await updateProfile(api, couple.registrant.username, { name: '' })).status()).toBe(400)
    expect((await updateProfile(api, couple.registrant.username, { name: 'n'.repeat(101) })).status()).toBe(400)
  })

  test('[PRF-006] a whitespace-only name is refused', async () => {
    const couple = await seedCompleteCouple(api, 'prfws')
    const res = await updateProfile(api, couple.registrant.username, { name: '   ' })
    expect(res.status(), 'a whitespace-only name must not be accepted as a display name').toBe(400)
  })

  test('[PRF-007] a future and an under-16 date of birth are refused', async () => {
    const couple = await seedCompleteCouple(api, 'prfdob')
    const now = new Date()
    const future = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1)).toISOString()
    const under16 = new Date(
      Date.UTC(now.getUTCFullYear() - 15, now.getUTCMonth(), now.getUTCDate()),
    ).toISOString()

    expect((await updateProfile(api, couple.registrant.username, { dateOfBirth: future })).status()).toBe(400)
    expect((await updateProfile(api, couple.registrant.username, { dateOfBirth: under16 })).status()).toBe(400)
  })

  test('[PRF-008] malformed and over-long emails are refused', async () => {
    const couple = await seedCompleteCouple(api, 'prfmail')
    for (const email of ['not-an-email', 'a b@c.com', `${'a'.repeat(250)}@example.com`]) {
      expect(
        (await updateProfile(api, couple.registrant.username, { email })).status(),
        `email "${email.slice(0, 24)}" must be refused`,
      ).toBe(400)
    }
  })

  test('[PRF-008] a partner cannot take an email that already belongs to another account', async () => {
    const a = await seedCompleteCouple(api, 'prfconA')
    const b = await seedCompleteCouple(api, 'prfconB')

    const res = await updateProfile(api, a.registrant.username, { email: b.registrant.email })
    expect(
      res.status(),
      'email uniqueness must be enforced across accounts, not only at registration',
    ).toBeGreaterThanOrEqual(400)
  })

  test('[PRF-009] malformed phone numbers are refused', async () => {
    const couple = await seedCompleteCouple(api, 'prfphone')
    for (const phoneNumber of ['0123456', '12345', 'abcdefgh', '+0123456789']) {
      expect(
        (await updateProfile(api, couple.registrant.username, { phoneNumber })).status(),
        `phone "${phoneNumber}" must be refused`,
      ).toBe(400)
    }
  })

  test('[PRF-006][SEC-006] a script-shaped name is stored and rendered as literal text', async ({
    page,
  }) => {
    const couple = await seedCompleteCouple(api, 'prfxss')
    const payload = '<img src=x onerror=alert(1)>'

    const dialogs: string[] = []
    page.on('dialog', (d) => {
      dialogs.push(d.message())
      return d.dismiss()
    })

    const res = await updateProfile(api, couple.registrant.username, { name: payload })
    if (res.ok()) {
      await loginViaUi(page, couple.registrant.username)
      await page.goto('/profile')
      await expect(page.getByText(payload).first()).toBeVisible({ timeout: 15_000 })
      // The injected <img> must never become a real element.
      expect(await page.locator('img[src="x"]').count()).toBe(0)
      expect(dialogs).toEqual([])
    }
  })

  test('[PRF-011] a 500 on save keeps the user’s edits on screen for retry', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/profile')
    await page.getByRole('button', { name: /^Edit/i }).first().click()

    await page.route('**/profile/me', async (route) => {
      if (route.request().method() === 'PUT') {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Something went wrong.' }),
        })
      }
      return route.continue()
    })

    await page.getByLabel('Full Name').fill('Retry Me Please')
    await page.getByRole('button', { name: 'Save changes' }).click()

    await expect(
      page.getByLabel('Full Name'),
      'a failed save must not silently discard the edit',
    ).toHaveValue('Retry Me Please')
  })
})

test.describe('PRF · Authorization', () => {
  test('[PRF-013] the update payload cannot change identity fields', async () => {
    const victim = await seedCompleteCouple(api, 'prfidA')
    const attacker = await seedCompleteCouple(api, 'prfidB')

    const bearer = await apiLogin(api, attacker.registrant.username)
    const client = auth(api, bearer)
    const me = (await (await client.get('/profile/me')).json()) as Record<string, unknown>

    // Attempt to smuggle identity fields the caller must never control.
    await client.put('/profile/me', {
      name: 'Escalated',
      dateOfBirth: me['dateOfBirth'],
      email: me['email'],
      phoneNumber: me['phoneNumber'],
      partnerId: victim.coupleId,
      coupleId: victim.coupleId,
      username: victim.registrant.username,
      role: 'Wife',
      togetherID: victim.togetherID,
    })

    const after = (await (await client.get('/profile/me')).json()) as Record<string, unknown>
    expect(after['username'], 'username must not be settable through the profile update').toBe(
      me['username'],
    )
    expect(after['role'], 'role must not be settable through the profile update').toBe(me['role'])

    // The victim's record must be untouched.
    const victimClient = auth(api, await apiLogin(api, victim.registrant.username))
    const victimProfile = (await (await victimClient.get('/profile/me')).json()) as Record<string, unknown>
    expect(victimProfile['name']).not.toBe('Escalated')
  })

  test('[PRF-013][SEC-003] profile endpoints reject anonymous callers', async () => {
    expect((await api.get('https://localhost:7001/api/v1/profile/me')).status()).toBe(401)
    expect((await api.get('https://localhost:7001/api/v1/profile/partner')).status()).toBe(401)
  })

  test('[PRF-002] the partner endpoint returns only the caller’s own partner', async () => {
    const mine = await seedCompleteCouple(api, 'prfpart')
    const other = await seedCompleteCouple(api, 'prfoth')

    const client = auth(api, await apiLogin(api, mine.registrant.username))
    const partner = (await (await client.get('/profile/partner')).json()) as Record<string, unknown>

    expect(partner['username']).toBe(mine.partner.username)
    expect(JSON.stringify(partner)).not.toContain(other.registrant.username)
  })
})

test.describe('PRF · Partner view mode', () => {
  test('[PRF-019][PRF-021] partner view shows a banner naming the partner and can be exited', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/profile')

    await openPartnerTab(page)
    await page.getByRole('button', { name: 'View as partner' }).click()

    await expect(page.getByText(/Viewing .+’s profile/i).first()).toBeVisible()
    const exit = page.getByRole('button', { name: 'Exit partner view' })
    await expect(exit).toBeVisible()

    await exit.click()
    await expect(page.getByText(/Viewing .+’s profile/i)).toHaveCount(0)
  })

  test('[PRF-020][NAV-007] the partner-view banner persists across in-app navigation', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/profile')
    await enterPartnerView(page)

    await page.getByRole('link', { name: 'Settings', exact: true }).first().click()
    await expect(page, 'the banner must follow the user across routes').toHaveURL(/\/settings/)
    await expect(page.getByText(/Viewing .+’s profile/i).first()).toBeVisible()
  })

  test('[PRF-020] a full reload clears partner view (it is non-persisted state)', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/profile')
    await enterPartnerView(page)

    await page.reload()
    await expect(page.getByText(/Viewing .+’s profile/i)).toHaveCount(0)
  })

  test('[PRF-022][NAV-008] the banner describes the mode without claiming a read-only guarantee', async ({
    page,
  }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/profile')
    await enterPartnerView(page)

    // Partner view is local presentation state, not server-side impersonation, and it suppresses
    // only the Profile edit controls. The banner must therefore not promise a read-only session it
    // does not enforce — Settings still writes the theme beneath it (SAHA-D16).
    // Navigate in-app: the mode is deliberately non-persisted, so a full page load clears it.
    await page.getByRole('link', { name: 'Settings', exact: true }).first().click()
    await expect(page).toHaveURL(/\/settings/)
    await expect(page.getByText(/Viewing .+’s profile/i).first()).toBeVisible()

    await expect(
      page.getByText(/read only/i),
      'the banner must not claim a read-only guarantee the app does not enforce',
    ).toHaveCount(0)
  })
})
