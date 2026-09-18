/**
 * Catalogue: test-cases/authentication/login-session-and-recovery.md
 * Covers: PWR-001..014
 *
 * The local environment has no browser-reachable mailbox, so the *successful* reset leg
 * (PWR-010/012/014) cannot be driven end-to-end here. Everything reachable without a delivered
 * code — validation, enumeration safety, and cross-feature password-policy consistency — is executed.
 */
import { test, expect, type APIRequestContext } from '@playwright/test'
import { API_BASE, SEED_PASSWORD, ROSTER, apiContext } from './_fixtures'

let api: APIRequestContext
test.beforeAll(async () => {
  api = await apiContext()
})
test.afterAll(async () => {
  await api.dispose()
})

/** POST a reset attempt with a deliberately wrong code — isolates validator behaviour from the code check. */
function resetAttempt(
  api: APIRequestContext,
  password: string,
  identifier = ROSTER.madhu.username,
) {
  return api.post(`${API_BASE}/auth/reset-password`, {
    data: {
      togetherIDOrUsername: identifier,
      code: '123456',
      newPassword: password,
      confirmPassword: password,
    },
  })
}

test.describe('PWR · Forgot password', () => {
  test('[PWR-001] recovery guidance uses neutral examples, never another couple identity', async ({
    page,
  }) => {
    for (const route of ['/forgot-password', '/reset-password']) {
      await page.goto(route)
      const identifier = page.getByLabel('Together ID or Username')
      await expect(identifier).toHaveAttribute('placeholder', 'YOUR-TOGETHER-ID or your_username')
      await expect(page.locator('body')).not.toContainText(/MADHU-PRIYA|\bmadhu\b/i)
    }
  })

  test('[PWR-001] a valid identifier moves the UI to the "check your email" state', async ({
    page,
  }) => {
    await page.goto('/forgot-password')
    await page.locator('#together-id-or-username').fill(ROSTER.madhu.username)
    await page.getByRole('button', { name: 'Send reset code' }).click()
    await expect(page.getByText('Check your emails')).toBeVisible({ timeout: 15_000 })
  })

  test('[PWR-002] an empty identifier is blocked before any request is sent', async ({ page }) => {
    let calls = 0
    await page.route('**/auth/forgot-password', (route) => {
      calls++
      return route.continue()
    })

    await page.goto('/forgot-password')
    await page.getByRole('button', { name: 'Send reset code' }).click()
    await expect(page.getByText('Please enter your Together ID or username')).toBeVisible()
    expect(calls).toBe(0)
  })

  test('[PWR-003] known and unknown identifiers are indistinguishable at the API', async () => {
    const known = await api.post(`${API_BASE}/auth/forgot-password`, {
      data: { togetherIDOrUsername: ROSTER.madhu.username },
    })
    const unknown = await api.post(`${API_BASE}/auth/forgot-password`, {
      data: { togetherIDOrUsername: 'no-such-account-anywhere' },
    })

    expect(known.status()).toBe(unknown.status())
    expect(await known.text()).toBe(await unknown.text())
  })
})

test.describe('PWR · Reset password', () => {
  test('[PWR-007] the code must be exactly six ASCII digits', async () => {
    const badCodes = ['12345', '1234567', 'abcdef', '12 456', '١٢٣٤٥٦'] // last is Arabic-Indic digits
    for (const code of badCodes) {
      const res = await api.post(`${API_BASE}/auth/reset-password`, {
        data: {
          togetherIDOrUsername: ROSTER.madhu.username,
          code,
          newPassword: 'ValidPass1!',
          confirmPassword: 'ValidPass1!',
        },
      })
      expect(res.status(), `code "${code}" must fail validation with 400`).toBe(400)
    }
  })

  test('[PWR-008] a mismatched confirmation is rejected', async () => {
    const res = await api.post(`${API_BASE}/auth/reset-password`, {
      data: {
        togetherIDOrUsername: ROSTER.madhu.username,
        code: '123456',
        newPassword: 'ValidPass1!',
        confirmPassword: 'DifferentPass1!',
      },
    })
    expect(res.status()).toBe(400)
    expect(await res.text()).toMatch(/do not match/i)
  })

  test('[PWR-008][REG-016] a password accepted at registration is also accepted at reset', async () => {
    // Registration and reset must share one policy, or a user can never reset back to a password
    // their own sign-up accepted. Failure here is a cross-feature contradiction, not a preference.
    const res = await resetAttempt(api, SEED_PASSWORD)
    const body = await res.text()

    expect(
      body,
      'a registration-legal password must not be refused by the reset validator',
    ).not.toMatch(/uppercase|lowercase|digit|special character|at least/i)
  })

  test('[PWR-008][REG-016] reset enforces the agreed 8-character minimum', async () => {
    // Exactly 8 with every class is the floor and must be accepted; 7 must not be.
    const atFloor = await resetAttempt(api, 'Sh0rt!xy')
    expect(
      await atFloor.text(),
      'the 8-character minimum is the agreed floor and must clear validation',
    ).not.toMatch(/at least/i)

    const belowFloor = await resetAttempt(api, 'Sh0rt!x')
    expect(belowFloor.status(), 'a 7-character password must be refused').toBe(400)
  })

  test('[PWR-008][REG-016] reset requires the same character classes as registration', async () => {
    for (const [missing, password] of [
      ['uppercase', 'sh0rt!xyz'],
      ['lowercase', 'SH0RT!XYZ'],
      ['a digit', 'Short!xyz'],
      ['a special character', 'Sh0rtxyzw'],
    ] as const) {
      const res = await resetAttempt(api, password)
      expect(res.status(), `a password with no ${missing} must be refused`).toBe(400)
    }
  })

  test('[PWR-008][REG-017] reset rejects passwords beyond the 72-byte BCrypt ceiling', async () => {
    // Registration explicitly caps at 72 UTF-8 bytes because BCrypt silently truncates there.
    // If reset accepts 128 characters, everything past byte 72 is ignored without telling anyone.
    const oversized = 'Aa1!'.repeat(25) // 100 chars / 100 bytes
    const res = await resetAttempt(api, oversized)

    expect(
      res.status(),
      'a >72-byte password must be refused at validation, not silently truncated by BCrypt',
    ).toBe(400)
  })

  test('[PWR-011] wrong, unknown-account and malformed codes share safe failure semantics', async () => {
    const wrongCode = await api.post(`${API_BASE}/auth/reset-password`, {
      data: {
        togetherIDOrUsername: ROSTER.madhu.username,
        code: '000000',
        newPassword: 'ValidPass1!',
        confirmPassword: 'ValidPass1!',
      },
    })
    const unknownAccount = await api.post(`${API_BASE}/auth/reset-password`, {
      data: {
        togetherIDOrUsername: 'no-such-account-anywhere',
        code: '000000',
        newPassword: 'ValidPass1!',
        confirmPassword: 'ValidPass1!',
      },
    })

    expect(wrongCode.status()).toBe(unknownAccount.status())
    expect(await wrongCode.text()).toBe(await unknownAccount.text())
    // and the original password must still work
    const stillValid = await api.post(`${API_BASE}/auth/login`, {
      data: { username: ROSTER.madhu.username, password: SEED_PASSWORD },
    })
    expect(stillValid.status()).toBe(200)
  })

  test('[PWR-009][ACC-003] the reset password visibility toggle has an accessible name', async ({
    page,
  }) => {
    await page.goto('/reset-password')
    // Login and the registration wizard both label this control `aria-label="Show password"` with
    // an `aria-pressed` state. The reset form must expose the same name, or screen-reader and
    // keyboard users get an unlabelled icon button.
    await expect(page.getByRole('button', { name: /Show password|Hide password/i })).toHaveCount(1)
  })

  test('[PWR-009] the visibility toggle reveals both password fields without discarding them', async ({
    page,
  }) => {
    await page.goto('/reset-password')
    const newPassword = page.locator('#new-password')
    const confirmPassword = page.locator('#confirm-password')
    await newPassword.fill('ValidPass1!')
    await confirmPassword.fill('ValidPass1!')
    await expect(newPassword).toHaveAttribute('type', 'password')

    await page.locator('form button[type="button"]').first().click()

    await expect(newPassword).toHaveAttribute('type', 'text')
    await expect(newPassword).toHaveValue('ValidPass1!')
    await expect(confirmPassword).toHaveValue('ValidPass1!')
  })

  test('[PWR-013] a 500 from the reset API keeps the identifier and allows retry', async ({
    page,
  }) => {
    await page.route('**/auth/reset-password', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Something went wrong.' }),
      }),
    )

    await page.goto('/reset-password')
    const identifier = page.locator('#together-id-or-username')
    await identifier.fill(ROSTER.madhu.username)
    await page.locator('[id="6-digit-code"]').fill('123456')
    await page.locator('#new-password').fill('ValidPass1!')
    await page.locator('#confirm-password').fill('ValidPass1!')
    await page.getByRole('button', { name: 'Reset password' }).click()
    await page.waitForTimeout(1500)

    // The non-secret identifier must survive the failure so the user can retry.
    await expect(identifier).toHaveValue(ROSTER.madhu.username)
    await expect(page.locator('body')).not.toContainText(/at Saha\.|Exception/i)
  })
})
