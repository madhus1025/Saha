import { test, expect, request as playwrightRequest } from '@playwright/test'

const MAILPIT_API = 'http://localhost:8025/api/v1'
const BACKEND_API = 'https://localhost:7001/api/v1'

// Unique per run — stays stable across all steps since it's module-level and
// this file loads once (all steps run in a single test so no module reload)
const run = Date.now().toString().slice(-6)
const couple = {
  togetherID: `FLOW${run}`,
  husbandUsername: `husband${run}`,
  husbandName: 'Test Husband',
  husbandEmail: `husband.${run}@saha-test.local`,
  wifeUsername: `wife${run}`,
  wifeName: 'Test Wife',
  wifeEmail: `wife.${run}@saha-test.local`,
  originalPassword: 'Original@Pass1',
  newPassword: 'NewSecure@Pass9',
}

// ── Mailpit helpers ──────────────────────────────────────────────────────────

async function clearMailpit() {
  await fetch(`${MAILPIT_API}/messages`, { method: 'DELETE' })
}

async function waitForResetEmail(toAddress: string, timeoutMs = 15000): Promise<string> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT_API}/messages`)
    const data = await res.json() as {
      messages?: Array<{ ID: string; To: Array<{ Address: string }>; Subject: string }>
    }
    const msg = data.messages?.find(
      (m) => m.To.some((t) => t.Address === toAddress) && m.Subject.includes('Reset'),
    )
    if (msg) {
      const detail = await fetch(`${MAILPIT_API}/message/${msg.ID}`)
      const body = await detail.json() as { Text?: string }
      const match = body.Text?.match(/reset code is[:\s]+(\d{6})/i)
      if (match) return match[1]
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`No reset email arrived at ${toAddress} within ${timeoutMs}ms`)
}

// ── Single sequential test covering the entire flow ──────────────────────────

test('full password reset flow — forgot → email → reset → login', async ({ page }) => {
  const apiCtx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true })

  // ── Step 1: Register a fresh test couple ─────────────────────────────────
  await test.step('register test couple', async () => {
    const res = await apiCtx.post(`${BACKEND_API}/auth/register`, {
      data: {
        togetherID: couple.togetherID,
        husbandUsername: couple.husbandUsername,
        husbandName: couple.husbandName,
        husbandDateOfBirth: '1990-01-01T00:00:00Z',
        husbandEmail: couple.husbandEmail,
        husbandPhoneNumber: '+911234567890',
        wifeUsername: couple.wifeUsername,
        wifeName: couple.wifeName,
        wifeDateOfBirth: '1992-06-15T00:00:00Z',
        wifeEmail: couple.wifeEmail,
        wifePhoneNumber: '+911234567891',
        password: couple.originalPassword,
        confirmPassword: couple.originalPassword,
      },
    })
    expect(res.status(), `Registration failed: ${await res.text()}`).toBe(201)
  })

  // ── Step 2: Forgot password sends email to both partners ─────────────────
  let resetCode: string
  await test.step('forgot password sends email to both partners', async () => {
    await clearMailpit()

    await page.goto('/forgot-password')
    await page.getByLabel('Together ID or Username').fill(couple.togetherID)
    await page.getByRole('button', { name: /send/i }).click()
    await expect(page.getByText(/check/i)).toBeVisible({ timeout: 10000 })

    // Both partners receive the code — grab it from the husband email
    resetCode = await waitForResetEmail(couple.husbandEmail)
    const wifeCode = await waitForResetEmail(couple.wifeEmail)

    expect(resetCode).toMatch(/^\d{6}$/)
    expect(wifeCode).toBe(resetCode)
  })

  // ── Step 3: Reset password with the correct code ──────────────────────────
  await test.step('reset password with correct code succeeds', async () => {
    await page.goto('/reset-password')
    await page.getByLabel('Together ID or Username').fill(couple.togetherID)
    await page.getByLabel('6-Digit Code').fill(resetCode)
    await page.getByLabel('New Password').fill(couple.newPassword)
    await page.getByLabel('Confirm Password').fill(couple.newPassword)
    await page.getByRole('button', { name: /reset password/i }).click()

    await expect(page.getByText('Password updated!', { exact: true }).first()).toBeVisible({ timeout: 10000 })
    await expect(page).toHaveURL('/login')
  })

  // ── Step 4: Login with new password works ────────────────────────────────
  await test.step('login with new password succeeds', async () => {
    await page.goto('/login')
    await page.getByLabel('Username').fill(couple.husbandUsername)
    await page.getByLabel('Shared Password').fill(couple.newPassword)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 })
  })

  // ── Step 5: Old password no longer works (test via API — avoids auth redirect) ──
  await test.step('login with old password fails', async () => {
    const res = await apiCtx.post(`${BACKEND_API}/auth/login`, {
      data: { username: couple.husbandUsername, password: couple.originalPassword },
    })
    expect(res.status(), 'Old password should be rejected').toBe(401)
  })

  // ── Step 6: Used reset code cannot be reused ─────────────────────────────
  await test.step('used reset code cannot be reused', async () => {
    await page.evaluate(() => localStorage.removeItem('saha-auth'))
    await page.goto('/reset-password')
    await page.getByLabel('Together ID or Username').fill(couple.togetherID)
    await page.getByLabel('6-Digit Code').fill(resetCode)
    await page.getByLabel('New Password').fill('AnotherPass@1')
    await page.getByLabel('Confirm Password').fill('AnotherPass@1')
    await page.getByRole('button', { name: /reset password/i }).click()
    await expect(page.getByText('Reset failed')).toBeVisible({ timeout: 5000 })
  })

  await apiCtx.dispose()
})
