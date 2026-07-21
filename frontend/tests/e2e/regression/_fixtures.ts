/**
 * Regression-suite fixtures.
 *
 * Re-exports the comprehensive real-backend helpers and adds the extras the catalogue-traceable
 * cases need: raw authenticated API calls, seeded couples with an established connection, group
 * provisioning, and message helpers used by the boundary/authorization cases.
 */
import { request, type APIRequestContext, type Page, expect } from '@playwright/test'

export const API_BASE = process.env['SAHA_API_BASE'] ?? 'https://localhost:7001/api/v1'
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
  registrant: Person
  partner: Person
  password: string
}

export interface SeededCouple extends CoupleSpec {
  coupleId: string
  complete: boolean
}

function token(len = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

export function makeCoupleSpec(tag: string): CoupleSpec {
  const r = token()
  const t = tag.toLowerCase().replace(/[^a-z0-9]/g, '') || 'x'
  return {
    togetherID: `RGN-${tag.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${r}`,
    registrant: {
      username: `h${t}${r}`.toLowerCase().slice(0, 30),
      name: `Reg ${tag} ${r}`,
      email: `h.${t}.${r}@rgn.local`.toLowerCase(),
      phone: '+12025550101',
      role: 'Husband',
    },
    partner: {
      username: `w${t}${r}`.toLowerCase().slice(0, 30),
      name: `Partner ${tag} ${r}`,
      email: `w.${t}.${r}@rgn.local`.toLowerCase(),
      phone: '+12025550102',
      role: 'Wife',
    },
    password: SEED_PASSWORD,
  }
}

export function apiContext(): Promise<APIRequestContext> {
  return request.newContext({ ignoreHTTPSErrors: true })
}

interface RegisterResult {
  accessToken: string
  coupleId: string
  togetherID: string
  coupleState: string
}

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

export async function seedCompleteCouple(api: APIRequestContext, tag: string): Promise<SeededCouple> {
  const spec = makeCoupleSpec(tag)
  const reg = await registerRegistrant(api, spec)

  const invRes = await api.post(`${API_BASE}/auth/invitations`, {
    headers: { Authorization: `Bearer ${reg.accessToken}` },
    data: { inviteeName: spec.partner.name, inviteeEmail: spec.partner.email },
  })
  if (invRes.status() !== 201) {
    throw new Error(`invite failed for ${spec.togetherID}: HTTP ${invRes.status()} ${await invRes.text()}`)
  }
  const { token: inviteToken } = (await invRes.json()) as { token: string }

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

export async function seedIncompleteCouple(api: APIRequestContext, tag: string): Promise<SeededCouple> {
  const spec = makeCoupleSpec(tag)
  const reg = await registerRegistrant(api, spec)
  return { ...spec, coupleId: reg.coupleId, complete: false }
}

export async function apiLogin(api: APIRequestContext, username: string): Promise<string> {
  const res = await api.post(`${API_BASE}/auth/login`, {
    data: { username, password: SEED_PASSWORD },
  })
  if (!res.ok()) throw new Error(`api login ${username} failed: HTTP ${res.status()}`)
  return ((await res.json()) as { accessToken: string }).accessToken
}

/** Convenience wrapper: authenticated JSON call returning the raw response. */
export function auth(api: APIRequestContext, bearer: string) {
  const headers = { Authorization: `Bearer ${bearer}` }
  return {
    get: (path: string) => api.get(`${API_BASE}${path}`, { headers }),
    post: (path: string, data?: unknown) => api.post(`${API_BASE}${path}`, { headers, data }),
    put: (path: string, data?: unknown) => api.put(`${API_BASE}${path}`, { headers, data }),
    del: (path: string) => api.delete(`${API_BASE}${path}`, { headers }),
  }
}

export async function sendConnectRequest(
  api: APIRequestContext,
  initiatorUsername: string,
  targetTogetherID: string,
) {
  const tokenValue = await apiLogin(api, initiatorUsername)
  return auth(api, tokenValue).post('/connect/request', { targetTogetherID })
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
  const pendRes = await auth(api, targetToken).get('/connect/connections?status=Pending')
  const pending = (await pendRes.json()) as Array<{ connectionId: string; togetherID: string }>
  const match = pending.find((p) => p.togetherID === initiator.togetherID)
  if (!match) throw new Error('no pending request found on target side')
  const accRes = await auth(api, targetToken).put(`/connect/request/${match.connectionId}/accept`)
  if (accRes.status() !== 204) throw new Error(`accept failed: HTTP ${accRes.status()}`)
}

/** Leave a connection request in the Rejected terminal state (for reconnect-policy cases). */
export async function rejectConnectionViaApi(
  api: APIRequestContext,
  initiator: SeededCouple,
  target: SeededCouple,
): Promise<void> {
  const reqRes = await sendConnectRequest(api, initiator.registrant.username, target.togetherID)
  if (reqRes.status() !== 201) {
    throw new Error(`connect request failed: HTTP ${reqRes.status()} ${await reqRes.text()}`)
  }
  const targetToken = await apiLogin(api, target.registrant.username)
  const pendRes = await auth(api, targetToken).get('/connect/connections?status=Pending')
  const pending = (await pendRes.json()) as Array<{ connectionId: string; togetherID: string }>
  const match = pending.find((p) => p.togetherID === initiator.togetherID)
  if (!match) throw new Error('no pending request found on target side')
  const rejRes = await auth(api, targetToken).put(`/connect/request/${match.connectionId}/reject`)
  if (rejRes.status() !== 204) throw new Error(`reject failed: HTTP ${rejRes.status()}`)
}

export interface ConversationSummary {
  id: string
  type: 'Partner' | 'Group'
  title: string
  isPinned: boolean
  lastActivityAt: string
}

export async function getPartnerConversationId(
  api: APIRequestContext,
  registrantUsername: string,
): Promise<string> {
  const tokenValue = await apiLogin(api, registrantUsername)
  const res = await auth(api, tokenValue).get('/conversations')
  const list = (await res.json()) as ConversationSummary[]
  const partner = list.find((c) => c.type === 'Partner')
  if (!partner) throw new Error('no Partner conversation found')
  return partner.id
}

/** Create a group owned by `owner` containing `targets`. Returns the conversation id. */
export async function createGroupViaApi(
  api: APIRequestContext,
  ownerUsername: string,
  name: string,
  targetCoupleIds: string[],
): Promise<string> {
  const tokenValue = await apiLogin(api, ownerUsername)
  const res = await auth(api, tokenValue).post('/conversations/group', { name, targetCoupleIds })
  if (res.status() !== 201) {
    throw new Error(`create group failed: HTTP ${res.status()} ${await res.text()}`)
  }
  // The create-group endpoint returns `conversationId`, not `id`.
  return ((await res.json()) as { conversationId: string }).conversationId
}

/** Couple search. The query parameter is `togetherId`. */
export async function searchCouples(
  api: APIRequestContext,
  username: string,
  query: string,
): Promise<Array<{ togetherID: string }>> {
  const bearer = await apiLogin(api, username)
  const res = await auth(api, bearer).get(`/connect/search?togetherId=${encodeURIComponent(query)}`)
  if (!res.ok()) return []
  return (await res.json()) as Array<{ togetherID: string }>
}

export async function sendTextViaApi(
  api: APIRequestContext,
  username: string,
  conversationId: string,
  body: string,
) {
  const tokenValue = await apiLogin(api, username)
  return auth(api, tokenValue).post(`/conversations/${conversationId}/messages`, { body })
}

/** Send a message and return its id (throws unless the send succeeded). */
export async function sendTextAndGetId(
  api: APIRequestContext,
  username: string,
  conversationId: string,
  body: string,
): Promise<string> {
  const res = await sendTextViaApi(api, username, conversationId, body)
  if (!res.ok()) throw new Error(`send failed: HTTP ${res.status()} ${await res.text()}`)
  return ((await res.json()) as { id: string }).id
}

/** Matches an ISO-8601 instant that carries an explicit UTC offset (`Z` or ±hh:mm). */
export const HAS_TZ_OFFSET = /(?:Z|[+-]\d\d:\d\d)$/

/** A random, syntactically valid GUID that belongs to nothing. */
export const ORPHAN_GUID = '00000000-0000-0000-0000-0000000000ff'

export async function loginViaUi(page: Page, username: string, password = SEED_PASSWORD): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Your shared password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/(dashboard|waiting)/, { timeout: 15_000 })
}

/** The stable seeded roster from `npm run seed:e2e` (MADHU-PRIYA ⇄ RAVI-KAVYA are connected). */
export const ROSTER = {
  madhu: { username: 'madhu', togetherID: 'MADHU-PRIYA', partner: 'priya' },
  priya: { username: 'priya', togetherID: 'MADHU-PRIYA', partner: 'madhu' },
  ravi: { username: 'ravi', togetherID: 'RAVI-KAVYA', partner: 'kavya' },
  kavya: { username: 'kavya', togetherID: 'RAVI-KAVYA', partner: 'ravi' },
  arjun: { username: 'arjun', togetherID: 'ARJUN-MEERA', partner: 'meera' },
} as const
