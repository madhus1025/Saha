import { test, expect, type APIRequestContext } from '@playwright/test'
import {
  apiContext,
  seedCompleteCouple,
  seedIncompleteCouple,
  loginViaUi,
  makeCoupleSpec,
  SEED_PASSWORD,
  type SeededCouple,
} from './fixtures'

/**
 * Authentication surface: login, logout, session guards, forgot/reset password, and the 3-step
 * registration wizard. Drives the real backend end to end.
 */

let api: APIRequestContext
let couple: SeededCouple

test.beforeAll(async () => {
  api = await apiContext()
  couple = await seedCompleteCouple(api, 'auth')
})
test.afterAll(async () => {
  await api.dispose()
})

test.describe('Login', () => {
  test('either username signs the couple in and lands on the dashboard', async ({ page }) => {
    await loginViaUi(page, couple.registrant.username)
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible()
    // The partner's username opens the same home.
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login/)
    await loginViaUi(page, couple.partner.username)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('wrong password is rejected with the real error message (BUG-005 regression)', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Username').fill(couple.registrant.username)
    await page.getByLabel('Your shared password').fill('definitely-not-the-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Login failed').first()).toBeVisible()
    // The interceptor must NOT mask the credential error with a refresh artifact.
    await expect(page.getByText('Invalid username or password.').first()).toBeVisible()
    await expect(page.getByText(/Refresh token not found/)).toHaveCount(0)
    await expect(page).toHaveURL(/\/login/)
  })

  test('unknown username is rejected', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Username').fill('nobody_here_xyz')
    await page.getByLabel('Your shared password').fill(SEED_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Login failed').first()).toBeVisible()
  })

  test('empty submit surfaces required-field validation and calls no API', async ({ page }) => {
    await page.goto('/login')
    let loginCalls = 0
    page.on('request', (r) => {
      if (r.url().includes('/auth/login')) loginCalls++
    })
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Username is required')).toBeVisible()
    await expect(page.getByText('Password is required')).toBeVisible()
    expect(loginCalls).toBe(0)
  })

  test('password visibility can be toggled', async ({ page }) => {
    await page.goto('/login')
    const pw = page.getByLabel('Your shared password')
    await pw.fill('peekaboo')
    await expect(pw).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: 'Show password' }).click()
    await expect(pw).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Hide password' }).click()
    await expect(pw).toHaveAttribute('type', 'password')
  })
})

test.describe('Session guards', () => {
  test('a signed-out visitor to a protected route is redirected to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('an authenticated visitor to /login is bounced to the dashboard', async ({ page }) => {
    await loginViaUi(page, couple.registrant.username)
    await page.goto('/login')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('sign out clears the session so /dashboard is no longer reachable', async ({ page }) => {
    await loginViaUi(page, couple.registrant.username)
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login/)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Awaiting-partner threshold', () => {
  test('a registrant whose partner has not accepted lands on /waiting, not a module', async ({ page }) => {
    const solo = await seedIncompleteCouple(api, 'solo')
    await page.goto('/login')
    await page.getByLabel('Username').fill(solo.registrant.username)
    await page.getByLabel('Your shared password').fill(SEED_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/waiting/)
    await expect(page.getByRole('heading', { name: /Waiting for your person/ })).toBeVisible()
    // Trying to jump straight into a module bounces back to the threshold.
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/waiting/)
  })
})

test.describe('Forgot / reset password', () => {
  test('forgot-password always reports success (enumeration-safe) for a real account', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.getByLabel(/Together ID or Username/).fill(couple.togetherID)
    await page.getByRole('button', { name: 'Send reset code' }).click()
    await expect(page.getByText('Check your emails')).toBeVisible()
  })

  test('forgot-password reports the same success for an unknown account', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.getByLabel(/Together ID or Username/).fill('NO-SUCH-COUPLE')
    await page.getByRole('button', { name: 'Send reset code' }).click()
    await expect(page.getByText('Check your emails')).toBeVisible()
  })

  test('reset-password enforces the 6-digit code and password rules client-side', async ({ page }) => {
    await page.goto('/reset-password')
    await page.getByLabel(/Together ID or Username/).fill(couple.togetherID)
    await page.getByLabel('6-Digit Code').fill('12')
    await page.getByLabel('New Password').fill('weak')
    await page.getByLabel('Confirm Password').fill('different')
    await page.getByRole('button', { name: 'Reset password' }).click()
    await expect(page.getByText('Code must be exactly 6 digits')).toBeVisible()
    await expect(page.getByText('Passwords do not match')).toBeVisible()
  })
})

test.describe('Registration wizard', () => {
  test('a couple can be created through all three steps and reaches the invite screen', async ({ page }) => {
    const spec = makeCoupleSpec('WIZ')
    await page.goto('/register')

    // Step 1 — Your half
    await page.getByLabel('Your name').fill(spec.registrant.name)
    await page.getByLabel('Username').fill(spec.registrant.username)
    await page.getByLabel('Date of birth').fill('1995-06-15')
    await page.getByRole('radio', { name: 'Wife' }).click()
    await page.getByLabel('Email').fill(spec.registrant.email)
    await page.getByLabel('Phone').fill('+12025559123')
    await page.getByRole('button', { name: 'Continue' }).click()

    // Step 2 — One key
    await expect(page.getByRole('heading', { name: /One key/ })).toBeVisible()
    await page.getByLabel('Password', { exact: true }).fill(SEED_PASSWORD)
    await page.getByLabel('Once more').fill(SEED_PASSWORD)
    await page.getByRole('button', { name: 'Continue' }).click()

    // Step 3 — Your door
    await expect(page.getByRole('heading', { name: /name on your door/ })).toBeVisible()
    await page.getByLabel('TogetherID').fill(spec.togetherID)
    await expect(page.getByTestId('togetherid-availability')).toContainText(/Available/, {
      timeout: 10_000,
    })
    await page.getByRole('button', { name: 'Open our home' }).click()

    await expect(page).toHaveURL(/\/invite/)
    await expect(page.getByRole('heading', { name: /Invite your person/ })).toBeVisible()
  })

  test('step 1 rejects an under-16 date of birth and a malformed username', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Your name').fill('Too Young')
    await page.getByLabel('Username').fill('Bad Name!') // spaces + capital + punctuation
    await page.getByLabel('Date of birth').fill('2020-01-01') // under 16
    await page.getByLabel('Email').fill('young@saha.local')
    await page.getByLabel('Phone').fill('+12025559123')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByText(/at least 16/)).toBeVisible()
    await expect(page.getByText(/Start with a letter/)).toBeVisible()
  })

  test('step 1 flags an already-taken username on submit and stays on step 1', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Your name').fill('Clashing Name')
    await page.getByLabel('Username').fill(couple.registrant.username) // already registered
    await page.getByLabel('Date of birth').fill('1990-03-03')
    await page.getByRole('radio', { name: 'Husband' }).click()
    await page.getByLabel('Email').fill('clash@saha.local')
    await page.getByLabel('Phone').fill('+12025559124')
    // Let the debounced availability check resolve to "taken" before submitting.
    await page.waitForTimeout(1200)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByText(/taken/i)).toBeVisible({ timeout: 10_000 })
    // Still on step 1 — no advance to "One key".
    await expect(page.getByText(/Step 1 of 3/)).toBeVisible()
  })
})
