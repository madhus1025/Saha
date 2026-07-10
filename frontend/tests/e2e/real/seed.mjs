#!/usr/bin/env node
/**
 * Seed real couple accounts into the running Saha backend so you can log in and test by hand.
 *
 *   Backend must be running first, e.g.:
 *     cd backend/src/Saha.API
 *     ASPNETCORE_ENVIRONMENT=IntegrationTest ASPNETCORE_URLS="https://localhost:7001;http://localhost:5001" dotnet run --no-launch-profile
 *
 *   Then:
 *     node frontend/tests/e2e/real/seed.mjs            # register the roster (idempotent)
 *     node frontend/tests/e2e/real/seed.mjs --connect  # also connect couple 1 <-> couple 2
 *
 * Every account shares the password below. Log in at http://localhost:5173/login with any username.
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0' // trust the local self-signed dev cert

const API = process.env.SAHA_API_BASE ?? 'https://localhost:7001/api/v1'
const PASSWORD = 'our quiet home by the sea' // >= 12 chars; no character-class rules
const CONNECT = process.argv.includes('--connect')

/** Stable, memorable roster. Re-running is safe: already-registered couples are skipped. */
const ROSTER = [
  {
    togetherID: 'MADHU-PRIYA',
    husband: { username: 'madhu', name: 'Madhu A', email: 'madhu@saha.local', phone: '+12025550101' },
    wife: { username: 'priya', name: 'Priya A', email: 'priya@saha.local', phone: '+12025550102' },
  },
  {
    togetherID: 'RAVI-KAVYA',
    husband: { username: 'ravi', name: 'Ravi K', email: 'ravi@saha.local', phone: '+12025550201' },
    wife: { username: 'kavya', name: 'Kavya K', email: 'kavya@saha.local', phone: '+12025550202' },
  },
  {
    togetherID: 'ARJUN-MEERA',
    husband: { username: 'arjun', name: 'Arjun M', email: 'arjun@saha.local', phone: '+12025550301' },
    wife: { username: 'meera', name: 'Meera M', email: 'meera@saha.local', phone: '+12025550302' },
  },
]

const j = (r) => r.json().catch(() => ({}))

async function ping() {
  try {
    const r = await fetch(API.replace('/api/v1', '/health'))
    if (!r.ok) throw new Error()
  } catch {
    console.error(`\n❌ Backend not reachable at ${API}. Start it first (see header of this file).\n`)
    process.exit(1)
  }
}

/**
 * Registration now creates the husband only; the wife arrives by accepting an invitation.
 * Seeding therefore takes three calls: register -> invite -> accept.
 */
async function register(c) {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      togetherID: c.togetherID,
      username: c.husband.username,
      name: c.husband.name,
      dateOfBirth: '1990-01-01T00:00:00Z',
      email: c.husband.email,
      phoneNumber: c.husband.phone,
      role: 'Husband',
      password: PASSWORD,
      confirmPassword: PASSWORD,
    }),
  })
  if (res.status === 409) return { status: 'exists' }
  if (res.status !== 201) return { status: 'error', code: res.status, body: await res.text() }

  const registrant = await j(res)

  const inviteRes = await fetch(`${API}/auth/invitations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${registrant.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteeName: c.wife.name, inviteeEmail: c.wife.email }),
  })
  if (inviteRes.status !== 201) return { status: 'error', code: inviteRes.status, body: await inviteRes.text() }

  const { token } = await j(inviteRes)

  const acceptRes = await fetch(`${API}/auth/invitations/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      username: c.wife.username,
      name: c.wife.name,
      dateOfBirth: '1992-01-01T00:00:00Z',
      email: c.wife.email,
      phoneNumber: c.wife.phone,
    }),
  })
  if (!acceptRes.ok) return { status: 'error', code: acceptRes.status, body: await acceptRes.text() }

  return { status: 'created', ...registrant }
}

async function login(username) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`login ${username} failed: ${res.status}`)
  return j(res)
}

async function connect(fromUser, targetTogetherID) {
  const from = await login(fromUser)
  const auth = { Authorization: `Bearer ${from.accessToken}`, 'Content-Type': 'application/json' }
  const reqRes = await fetch(`${API}/connect/request`, {
    method: 'POST', headers: auth, body: JSON.stringify({ targetTogetherID }),
  })
  if (reqRes.status === 409) return console.log(`   ↔ ${from.togetherID} ⇄ ${targetTogetherID}: already requested/connected`)
  if (reqRes.status !== 201) return console.log(`   ⚠ request failed: ${reqRes.status} ${await reqRes.text()}`)
  // Accept from the target side (log in as that couple's husband username).
  const target = ROSTER.find((c) => c.togetherID === targetTogetherID)
  const to = await login(target.husband.username)
  const toAuth = { Authorization: `Bearer ${to.accessToken}` }
  const pending = await (await fetch(`${API}/connect/connections?status=Pending`, { headers: toAuth })).json()
  const match = pending.find((p) => p.togetherID === from.togetherID)
  if (!match) return console.log(`   ⚠ no pending request found on ${targetTogetherID} side`)
  const acc = await fetch(`${API}/connect/request/${match.connectionId}/accept`, { method: 'PUT', headers: toAuth })
  console.log(`   ↔ ${from.togetherID} ⇄ ${targetTogetherID}: ${acc.ok ? 'connected ✅' : `accept failed ${acc.status}`}`)
}

async function main() {
  await ping()
  console.log(`\nSeeding ${ROSTER.length} couples into ${API}\n`)
  for (const c of ROSTER) {
    const r = await register(c)
    const mark = r.status === 'created' ? '✅ created' : r.status === 'exists' ? '• already exists' : `❌ ${r.code} ${r.body}`
    console.log(`  ${c.togetherID.padEnd(14)} ${mark}`)
  }

  if (CONNECT) {
    console.log('\nConnecting couples:')
    await connect('madhu', 'RAVI-KAVYA')
    await connect('madhu', 'ARJUN-MEERA')
  }

  console.log('\n─── Credentials (password for all: ' + PASSWORD + ') ───')
  for (const c of ROSTER) {
    console.log(`  ${c.togetherID.padEnd(14)}  husband: ${c.husband.username.padEnd(8)} wife: ${c.wife.username}`)
  }
  console.log('\nLog in at http://localhost:5173/login with any username above.\n')
}

main().catch((e) => { console.error(e); process.exit(1) })
