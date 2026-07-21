/**
 * Real-backend E2E fixtures.
 *
 * Unlike tests/e2e/messages + tests/e2e/connect (which mock the API with page.route),
 * these helpers drive the ACTUAL Saha backend running under ASPNETCORE_ENVIRONMENT=IntegrationTest.
 * Couples are seeded through the real /auth/register endpoint, then tests log in through the real
 * UI and exercise connect + messaging end to end.
 */
import { request, type APIRequestContext, type Page, expect } from '@playwright/test'

/** Backend base — the same HTTPS endpoint Vite proxies /api to. */
export const API_BASE =
  process.env['SAHA_API_BASE'] ?? 'https://localhost:7001/api/v1'

/** Shared password that satisfies the register validator for every seeded couple. */
export const SEED_PASSWORD = 'Our quiet home by the sea 1!'

export interface Partner {
  username: string
  name: string
  email: string
  phone: string
}

export interface CoupleSpec {
  togetherID: string
  husband: Partner
  wife: Partner
  password: string
}

export interface SeededCouple extends CoupleSpec {
  coupleId: string
}

/** Uppercase alphanumeric token, safe for TogetherID (^[A-Z0-9][A-Z0-9-]{2,48}[A-Z0-9]$). */
function token(len = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

/**
 * Build a unique couple spec. `tag` is a short human hint (e.g. "A"); every field is randomized so
 * repeated test runs never collide on TogetherID / username / email uniqueness constraints.
 */
export function makeCoupleSpec(tag: string): CoupleSpec {
  const r = token()
  const t = tag.toLowerCase().replace(/[^a-z0-9]/g, '') || 'x'
  return {
    togetherID: `E2E-${tag.toUpperCase()}-${r}`,
    husband: {
      username: `h${t}${r}`.toLowerCase().slice(0, 30),
      name: `Husband ${tag} ${r}`,
      email: `h.${t}.${r}@e2e.local`.toLowerCase(),
      phone: '+12025550101',
    },
    wife: {
      username: `w${t}${r}`.toLowerCase().slice(0, 30),
      name: `Wife ${tag} ${r}`,
      email: `w.${t}.${r}@e2e.local`.toLowerCase(),
      phone: '+12025550102',
    },
    password: SEED_PASSWORD,
  }
}

/** APIRequestContext that trusts the local dev HTTPS cert. Remember to dispose() it. */
export function apiContext(): Promise<APIRequestContext> {
  return request.newContext({ ignoreHTTPSErrors: true })
}

/** Register one couple through the real API. Returns the spec plus the server-assigned coupleId. */
export async function registerCouple(
  api: APIRequestContext,
  spec: CoupleSpec,
): Promise<SeededCouple> {
  const res = await api.post(`${API_BASE}/auth/register`, {
    data: {
      togetherID: spec.togetherID,
      husbandUsername: spec.husband.username,
      husbandName: spec.husband.name,
      husbandDateOfBirth: '1990-01-01T00:00:00Z',
      husbandEmail: spec.husband.email,
      husbandPhoneNumber: spec.husband.phone,
      wifeUsername: spec.wife.username,
      wifeName: spec.wife.name,
      wifeDateOfBirth: '1992-01-01T00:00:00Z',
      wifeEmail: spec.wife.email,
      wifePhoneNumber: spec.wife.phone,
      password: spec.password,
      confirmPassword: spec.password,
    },
  })
  if (res.status() !== 201) {
    throw new Error(
      `register failed for ${spec.togetherID}: HTTP ${res.status()} ${await res.text()}`,
    )
  }
  const body = (await res.json()) as { coupleId: string; togetherID: string }
  return { ...spec, coupleId: body.coupleId }
}

/** Convenience: seed a fresh unique couple in one call. */
export async function seedCouple(api: APIRequestContext, tag: string): Promise<SeededCouple> {
  return registerCouple(api, makeCoupleSpec(tag))
}

/** Log in via the API and return the access token (for API-only setup steps). */
export async function apiLogin(api: APIRequestContext, username: string): Promise<string> {
  const res = await api.post(`${API_BASE}/auth/login`, {
    data: { username, password: SEED_PASSWORD },
  })
  if (!res.ok()) throw new Error(`api login ${username} failed: HTTP ${res.status()}`)
  return ((await res.json()) as { accessToken: string }).accessToken
}

/**
 * Establish an Accepted connection between two seeded couples through the API, so messaging tests
 * can start from a "already connected" state without driving the connect UI every time.
 */
export async function connectCouplesViaApi(
  api: APIRequestContext,
  initiator: SeededCouple,
  target: SeededCouple,
): Promise<void> {
  const initToken = await apiLogin(api, initiator.husband.username)
  const reqRes = await api.post(`${API_BASE}/connect/request`, {
    headers: { Authorization: `Bearer ${initToken}` },
    data: { targetTogetherID: target.togetherID },
  })
  if (reqRes.status() !== 201) {
    throw new Error(`connect request failed: HTTP ${reqRes.status()} ${await reqRes.text()}`)
  }
  const targetToken = await apiLogin(api, target.husband.username)
  const pendRes = await api.get(`${API_BASE}/connect/connections?status=Pending`, {
    headers: { Authorization: `Bearer ${targetToken}` },
  })
  const pending = (await pendRes.json()) as Array<{ connectionId: string; togetherID: string }>
  const match = pending.find((p) => p.togetherID === initiator.togetherID)
  if (!match) throw new Error('no pending request found on target side')
  const accRes = await api.put(`${API_BASE}/connect/request/${match.connectionId}/accept`, {
    headers: { Authorization: `Bearer ${targetToken}` },
  })
  if (accRes.status() !== 204) throw new Error(`accept failed: HTTP ${accRes.status()}`)
}

/** Create a group conversation through the API and return its id (owner = ownerUsername's couple). */
export async function createGroupViaApi(
  api: APIRequestContext,
  ownerUsername: string,
  name: string,
  targetCoupleIds: string[],
): Promise<string> {
  const token = await apiLogin(api, ownerUsername)
  const res = await api.post(`${API_BASE}/conversations/group`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, targetCoupleIds },
  })
  if (res.status() !== 201) {
    throw new Error(`create group failed: HTTP ${res.status()} ${await res.text()}`)
  }
  return ((await res.json()) as { conversationId: string }).conversationId
}

/** Log in through the real login form and wait for the authenticated app shell. */
export async function loginViaUi(page: Page, username: string, password = SEED_PASSWORD): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Shared Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  // useLogin navigates to /dashboard on success.
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
}
