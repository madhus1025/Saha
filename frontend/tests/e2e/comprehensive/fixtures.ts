/**
 * Comprehensive real-backend E2E fixtures.
 *
 * These helpers drive the ACTUAL Saha backend (ASPNETCORE_ENVIRONMENT=IntegrationTest). Unlike the
 * older tests/e2e/real fixtures, they use the CURRENT auth contract:
 *
 *   - Registration creates ONE partner (the registrant) and a couple in `AwaitingPartner`.
 *   - The second partner arrives by accepting an invitation (register → invite → accept).
 *   - Login label is "Your shared password" (Hearth redesign), not "Shared Password".
 *
 * A couple is "complete" only once the invitation has been accepted.
 */
import { request, type APIRequestContext, type Page, expect } from '@playwright/test'

/** Backend base — the same HTTPS endpoint Vite proxies /api to. */
export const API_BASE = process.env['SAHA_API_BASE'] ?? 'https://localhost:7001/api/v1'

/** Shared password that satisfies the register validator (>= 12 chars, <= 72 bytes). */
export const SEED_PASSWORD = 'Our quiet home by the sea 1!'

export type Role = 'Husband' | 'Wife'

export interface Person {
  username: string
  name: string
  email: string
  phone: string
  role: Role
}

export interface CoupleSpec {
  togetherID: string
  registrant: Person // the partner created at registration
  partner: Person // the partner who accepts the invitation
  password: string
}

export interface SeededCouple extends CoupleSpec {
  coupleId: string
  /** true once the invitation has been accepted (couple is Complete). */
  complete: boolean
}

/** Uppercase alphanumeric token, safe for a TogetherID segment (^[A-Z0-9][A-Z0-9-]{2,48}[A-Z0-9]$). */
function token(len = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

/** Build a unique couple spec. Every field is randomized so repeated runs never collide. */
export function makeCoupleSpec(tag: string): CoupleSpec {
  const r = token()
  const t = tag.toLowerCase().replace(/[^a-z0-9]/g, '') || 'x'
  return {
    togetherID: `E2E-${tag.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${r}`,
    registrant: {
      username: `h${t}${r}`.toLowerCase().slice(0, 30),
      name: `Reg ${tag} ${r}`,
      email: `h.${t}.${r}@e2e.local`.toLowerCase(),
      phone: '+12025550101',
      role: 'Husband',
    },
    partner: {
      username: `w${t}${r}`.toLowerCase().slice(0, 30),
      name: `Partner ${tag} ${r}`,
      email: `w.${t}.${r}@e2e.local`.toLowerCase(),
      phone: '+12025550102',
      role: 'Wife',
    },
    password: SEED_PASSWORD,
  }
}

/** APIRequestContext that trusts the local dev HTTPS cert. Remember to dispose() it. */
export function apiContext(): Promise<APIRequestContext> {
  return request.newContext({ ignoreHTTPSErrors: true })
}

interface RegisterResult {
  accessToken: string
  coupleId: string
  togetherID: string
  coupleState: string
}

/** Register the registrant only. Leaves the couple in `AwaitingPartner`. */
export async function registerRegistrant(
  api: APIRequestContext,
  spec: CoupleSpec,
): Promise<RegisterResult> {
  const res = await api.post(`${API_BASE}/auth/register`, {
    data: {
      togetherID: spec.togetherID,
      username: spec.registrant.username,
      name: spec.registrant.name,
      dateOfBirth: '1990-01-01T00:00:00Z',
      email: spec.registrant.email,
      phoneNumber: spec.registrant.phone,
      role: spec.registrant.role,
      password: spec.password,
      confirmPassword: spec.password,
    },
  })
  if (res.status() !== 201) {
    throw new Error(`register failed for ${spec.togetherID}: HTTP ${res.status()} ${await res.text()}`)
  }
  return (await res.json()) as RegisterResult
}

/** Full seed: register the registrant AND accept the invitation, producing a Complete couple. */
export async function seedCompleteCouple(api: APIRequestContext, tag: string): Promise<SeededCouple> {
  const spec = makeCoupleSpec(tag)
  const reg = await registerRegistrant(api, spec)

  // Registrant issues an invitation for their partner.
  const invRes = await api.post(`${API_BASE}/auth/invitations`, {
    headers: { Authorization: `Bearer ${reg.accessToken}` },
    data: { inviteeName: spec.partner.name, inviteeEmail: spec.partner.email },
  })
  if (invRes.status() !== 201) {
    throw new Error(`invite failed for ${spec.togetherID}: HTTP ${invRes.status()} ${await invRes.text()}`)
  }
  const { token: inviteToken } = (await invRes.json()) as { token: string }

  // Partner accepts, supplying their own half.
  const accRes = await api.post(`${API_BASE}/auth/invitations/accept`, {
    data: {
      token: inviteToken,
      username: spec.partner.username,
      name: spec.partner.name,
      dateOfBirth: '1992-01-01T00:00:00Z',
      email: spec.partner.email,
      phoneNumber: spec.partner.phone,
    },
  })
  if (!accRes.ok()) {
    throw new Error(`accept failed for ${spec.togetherID}: HTTP ${accRes.status()} ${await accRes.text()}`)
  }

  return { ...spec, coupleId: reg.coupleId, complete: true }
}

/** Seed a couple that is still `AwaitingPartner` (registrant only, no acceptance). */
export async function seedIncompleteCouple(api: APIRequestContext, tag: string): Promise<SeededCouple> {
  const spec = makeCoupleSpec(tag)
  const reg = await registerRegistrant(api, spec)
  return { ...spec, coupleId: reg.coupleId, complete: false }
}

/** Log in via the API and return the access token (for API-only setup + assertions). */
export async function apiLogin(api: APIRequestContext, username: string): Promise<string> {
  const res = await api.post(`${API_BASE}/auth/login`, {
    data: { username, password: SEED_PASSWORD },
  })
  if (!res.ok()) throw new Error(`api login ${username} failed: HTTP ${res.status()}`)
  return ((await res.json()) as { accessToken: string }).accessToken
}

/** Send a connection request from `initiator` to `target`. Returns the raw response for status checks. */
export async function sendConnectRequest(
  api: APIRequestContext,
  initiatorUsername: string,
  targetTogetherID: string,
) {
  const tokenValue = await apiLogin(api, initiatorUsername)
  return api.post(`${API_BASE}/connect/request`, {
    headers: { Authorization: `Bearer ${tokenValue}` },
    data: { targetTogetherID },
  })
}

/** Establish an Accepted connection between two complete couples entirely via the API. */
export async function connectCouplesViaApi(
  api: APIRequestContext,
  initiator: SeededCouple,
  target: SeededCouple,
): Promise<void> {
  const reqRes = await sendConnectRequest(api, initiator.registrant.username, target.togetherID)
  if (reqRes.status() !== 201) {
    throw new Error(`connect request failed: HTTP ${reqRes.status()} ${await reqRes.text()}`)
  }
  const targetToken = await apiLogin(api, target.registrant.username)
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

interface ConversationSummary {
  id: string
  type: 'Partner' | 'Group'
  lastActivityAt: string
}

/** The auto-created Partner conversation id for a couple (registrant's view). */
export async function getPartnerConversationId(
  api: APIRequestContext,
  registrantUsername: string,
): Promise<string> {
  const tokenValue = await apiLogin(api, registrantUsername)
  const res = await api.get(`${API_BASE}/conversations`, {
    headers: { Authorization: `Bearer ${tokenValue}` },
  })
  const list = (await res.json()) as ConversationSummary[]
  const partner = list.find((c) => c.type === 'Partner')
  if (!partner) throw new Error('no Partner conversation found')
  return partner.id
}

/** Send a text message through the API. Returns the raw POST response. */
export async function sendTextViaApi(
  api: APIRequestContext,
  registrantUsername: string,
  conversationId: string,
  body: string,
) {
  const tokenValue = await apiLogin(api, registrantUsername)
  return api.post(`${API_BASE}/conversations/${conversationId}/messages`, {
    headers: { Authorization: `Bearer ${tokenValue}` },
    data: { body },
  })
}

/** Matches an ISO-8601 instant that carries an explicit UTC offset (`Z` or ±hh:mm). */
export const HAS_TZ_OFFSET = /(?:Z|[+-]\d\d:\d\d)$/

/** Log in through the real login form and wait for the authenticated app shell (/dashboard). */
export async function loginViaUi(page: Page, username: string, password = SEED_PASSWORD): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Your shared password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/(dashboard|waiting)/, { timeout: 15_000 })
}
