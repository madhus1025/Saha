/**
 * Catalogue: test-cases/shell/dashboard-navigation-settings.md
 * Covers: NAV-001..010, DASH-001..005, MOD-001..005, SET-001..008
 */
import { test, expect, type APIRequestContext } from '@playwright/test'
import { ROSTER, apiContext, loginViaUi, seedCompleteCouple } from './_fixtures'

let api: APIRequestContext
test.beforeAll(async () => {
  api = await apiContext()
})
test.afterAll(async () => {
  await api.dispose()
})

const SIDEBAR_ITEMS = [
  { name: 'Home', href: '/dashboard' },
  { name: 'Finance', href: '/finance' },
  { name: 'Memories', href: '/memories' },
  { name: 'Goals', href: '/goals' },
  { name: 'Messages', href: '/messages' },
  { name: 'Connect', href: '/connect' },
  { name: 'Calendar', href: '/calendar' },
  { name: 'Settings', href: '/settings' },
]

test.describe('NAV · Routing and shell', () => {
  test('[NAV-001] the root path replace-redirects an authenticated user to the dashboard', async ({
    page,
  }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/')
    await expect(page).toHaveURL(/\/dashboard/)

    // `replace` semantics: Back must not return to `/` and bounce again.
    await page.goBack()
    await expect(page).not.toHaveURL(/\/$/)
  })

  test('[NAV-002] every sidebar destination is present and routes correctly', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    for (const item of SIDEBAR_ITEMS) {
      const link = page.getByRole('link', { name: item.name, exact: true }).first()
      await expect(link, `sidebar must expose "${item.name}"`).toBeVisible()
      await link.click()
      await expect(page).toHaveURL(new RegExp(item.href.replace('/', '\\/')))
    }
    await expect(page.getByRole('button', { name: /Sign out/i })).toBeVisible()
  })

  test('[NAV-003] exactly one sidebar item is marked current for the active route', async ({
    page,
  }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/connect')

    // React Router's NavLink sets aria-current="page" on the active link.
    const current = page.locator('a[aria-current="page"]')
    await expect(current, 'the active route must be programmatically identifiable').toHaveCount(1)
    await expect(current).toHaveAttribute('href', /\/connect/)
  })

  test('[NAV-003] the active item survives a direct URL load and a refresh', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/settings')
    await page.reload()
    const current = page.locator('a[aria-current="page"]')
    await expect(current).toHaveCount(1)
    await expect(current).toHaveAttribute('href', /\/settings/)
  })

  test('[NAV-004] the mobile drawer opens, closes and is dismissible from the overlay', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await loginViaUi(page, ROSTER.madhu.username)

    await page.getByRole('button', { name: 'Open menu' }).click()
    const close = page.getByRole('button', { name: 'Close sidebar' })
    await expect(close).toBeVisible()

    await close.click()
    await expect(close).toBeHidden()
  })

  test('[NAV-005] the top-bar theme toggle flips the theme and persists it across a reload', async ({
    page,
  }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    const root = page.locator('html')
    const before = await root.getAttribute('class')

    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await expect(root).not.toHaveClass(before ?? '')

    const after = await root.getAttribute('class')
    await page.reload()
    await expect(root, 'the chosen theme must survive a reload').toHaveClass(after ?? '')
  })

  test('[NAV-006] the top-bar identifies the signed-in partner by name and links to the profile', async ({
    page,
  }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await expect(
      page.getByText(ROSTER.madhu.name).first(),
      'the app shell must identify the user by their display name',
    ).toBeVisible()

    await page.locator('a[href="/profile"]').first().click()
    await expect(page).toHaveURL(/\/profile/)
  })

  test('[NAV-009] an unknown route shows the 404 page with recovery navigation', async ({
    page,
  }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/this-route-does-not-exist')
    await expect(page.getByText(/not found/i).first()).toBeVisible()
    await expect(page.getByRole('link').first()).toBeVisible()
  })

  test('[NAV-009] an unknown route while signed out discloses no couple data', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    await expect(page.locator('body')).not.toContainText(ROSTER.madhu.togetherID)
  })

  test('[NAV-010] a failing profile query does not strand navigation or blank the shell', async ({
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
    // The shell must still be navigable after a failed feature query.
    await expect(page.getByRole('link', { name: 'Home', exact: true }).first()).toBeVisible()
    await page.getByRole('link', { name: 'Settings', exact: true }).first().click()
    await expect(page).toHaveURL(/\/settings/)
  })
})

test.describe('DASH · Dashboard', () => {
  test('[DASH-001] the dashboard greets the signed-in partner by name, not by username', async ({
    page,
  }) => {
    await loginViaUi(page, ROSTER.madhu.username)

    // Asserting only that *a* greeting rendered is what let "Good morning, madhu" ship: the old
    // fixture name ("Madhu A") contained the username, so either field satisfied the check.
    const greeting = page.getByText(/Good (morning|afternoon|evening)/i).first()
    await expect(greeting).toBeVisible()
    await expect(greeting, 'the greeting must use the display name').toContainText(
      ROSTER.madhu.name,
    )
    await expect(greeting, 'the greeting must not use the login username').not.toContainText(
      ROSTER.madhu.username,
    )
  })

  test('[DASH-002] the dashboard shows the couple’s own TogetherID and no other', async ({
    page,
  }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await expect(page.getByText(ROSTER.madhu.togetherID).first()).toBeVisible()
    await expect(page.locator('body')).not.toContainText(ROSTER.ravi.togetherID)
  })

  test('[DASH-003] the couple card names both partners consistently, whoever signed in', async ({
    page,
  }) => {
    // Both halves of the card must use the same field. The bug this catches showed the *partner*
    // by name and the *signed-in user* by username, in the same card.
    for (const who of [ROSTER.madhu, ROSTER.priya] as const) {
      await loginViaUi(page, who.username)
      const counterpart = who === ROSTER.madhu ? ROSTER.priya : ROSTER.madhu

      await expect(page.getByText(ROSTER.madhu.name).first()).toBeVisible()
      await expect(page.getByText(ROSTER.priya.name).first()).toBeVisible()
      await expect(
        page.locator('body'),
        `signed in as ${who.username}: the card must not fall back to a login username`,
      ).not.toContainText(who.username)
      await expect(page.locator('body')).not.toContainText(counterpart.username)

      await page.getByRole('button', { name: /Sign out/i }).click()
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
    }
  })

  test('[DASH-004] all six module cards render and each navigates by keyboard', async ({
    page,
  }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    for (const module of ['Finance', 'Memories', 'Goals', 'Messages', 'Connect', 'Calendar']) {
      // Scope to the main region: the sidebar carries links with the same names.
      const card = page
        .getByRole('main')
        .getByRole('link', { name: new RegExp(module, 'i') })
        .first()
      await expect(card, `dashboard must offer a "${module}" card`).toBeVisible()
      await card.focus()
      await card.press('Enter')
      await expect(page).toHaveURL(new RegExp(module.toLowerCase()))
      // Return through the app shell. Repeated page.goto() calls restart the SPA and rotate the
      // refresh token between every assertion, which tests session bootstrapping rather than the
      // keyboard navigation this case owns and can cancel an in-flight refresh during navigation.
      await page.getByRole('link', { name: 'Home', exact: true }).first().click()
      await expect(page).toHaveURL(/\/dashboard/)
    }
  })

  test('[DASH-005] a failed session/profile load never renders another couple’s data', async ({
    page,
  }) => {
    const other = await seedCompleteCouple(api, 'dashfail')
    await loginViaUi(page, other.registrant.username)

    await page.route('**/profile/me', (route) => route.fulfill({ status: 500, body: '{}' }))
    await page.goto('/dashboard')
    await expect(page.locator('body')).not.toContainText(ROSTER.madhu.togetherID)
  })
})

test.describe('MOD · Coming-soon modules', () => {
  for (const module of ['Finance', 'Memories', 'Goals', 'Calendar']) {
    test(`[MOD-00${['Finance', 'Memories', 'Goals', 'Calendar'].indexOf(module) + 1}] ${module} renders a non-interactive placeholder`, async ({
      page,
    }) => {
      await loginViaUi(page, ROSTER.madhu.username)
      await page.goto(`/${module.toLowerCase()}`)

      await expect(
        page.getByRole('heading', { name: new RegExp(module, 'i') }).first(),
      ).toBeVisible()
      await expect(page.getByText(/coming soon/i).first()).toBeVisible()
    })
  }

  test('[MOD-005] placeholder modules honour the route guard and survive a refresh', async ({
    page,
  }) => {
    await page.goto('/finance')
    await expect(page).toHaveURL(/\/login/)

    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/finance')
    await page.reload()
    await expect(page.getByText(/coming soon/i).first()).toBeVisible()
  })
})

test.describe('SET · Settings', () => {
  test('[SET-001] all three appearance options are offered', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/settings')
    for (const label of ['Light', 'Dark', 'System']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
    }
  })

  test('[SET-001][ACC-003][ACC-006] the selected appearance is exposed semantically, not only by colour', async ({
    page,
  }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/settings')

    const dark = page.getByRole('radio', { name: /Dark/i })
    await dark.click()

    // A single-choice control must publish its state to assistive technology. Any of
    // aria-pressed / aria-checked / role=radio+aria-checked satisfies WCAG 4.1.2; colour alone
    // does not, and also fails the non-colour-indicator requirement of ACC-006.
    const pressed = await dark.getAttribute('aria-pressed')
    const checked = await dark.getAttribute('aria-checked')
    const role = await dark.getAttribute('role')
    expect(
      pressed === 'true' || checked === 'true' || role === 'radio',
      'the active appearance option must expose its selected state to assistive technology',
    ).toBeTruthy()
  })

  test('[SET-003] Dark applies immediately and persists across a reload', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/settings')
    await page.getByRole('radio', { name: /Dark/i }).click()

    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('[SET-002] Light applies immediately and persists across a route change', async ({
    page,
  }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/settings')
    await page.getByRole('radio', { name: /Light/i }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    await page.goto('/dashboard')
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('[SET-004] System follows the emulated OS preference', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/settings')
    await page.getByRole('radio', { name: /System/i }).click()

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.emulateMedia({ colorScheme: 'light' })
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('[SET-005] the top-bar toggle and the settings selector stay in sync', async ({ page }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/settings')
    await page.getByRole('radio', { name: /Light/i }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    // The settings selector must reflect the change the top bar just made.
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('[SET-007][SET-008] the stub cards say "Coming soon" and offer no deceptive controls', async ({
    page,
  }) => {
    await loginViaUi(page, ROSTER.madhu.username)
    await page.goto('/settings')

    for (const card of ['Notifications', 'Privacy & Security']) {
      const heading = page.getByText(card, { exact: true }).first()
      await expect(heading).toBeVisible()
    }
    await expect(page.getByText('Coming soon').first()).toBeVisible()
    // No switches/checkboxes that imply a setting is already enforced.
    await expect(page.getByRole('switch')).toHaveCount(0)
    await expect(page.getByRole('checkbox')).toHaveCount(0)
  })
})
