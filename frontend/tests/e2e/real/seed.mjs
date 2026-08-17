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
const PASSWORD = 'Our quiet home by the sea 1!' // matches PasswordRules: >= 8 chars, upper + lower + digit + special, <= 72 bytes
const CONNECT = process.argv.includes('--connect')

/**
 * Stable, memorable roster. Re-running is safe: already-registered couples are skipped.
 *
 * Usernames stay short and memorable so a human can sign in by hand. Display names are chosen to
 * share NO substring with the username, the email local part, or the TogetherID — deliberately.
 *
 * The previous roster paired `username: 'madhu'` with `name: 'Madhu A'`. Any assertion loose enough
 * to be practical (`/madhu/i`) matched both, so a screen rendering the *username* where it should
 * render the *name* looked identical to a correct one. That is exactly how the dashboard shipped
 * greeting people by their login handle without a single test noticing. Confusable fixtures cannot
 * detect wrong-field bugs, no matter how many cases you write.
 */
const ROSTER = [
  {
    togetherID: 'MADHU-PRIYA',
    husband: { username: 'madhu', name: 'Bartholomew Quintero', email: 'wex4901@saha.local', phone: '+12025550101' },
    wife: { username: 'priya', name: 'Genevieve Okonkwo', email: 'vyn7233@saha.local', phone: '+12025550102' },
  },
  {
    togetherID: 'RAVI-KAVYA',
    husband: { username: 'ravi', name: 'Thorvald Bergqvist', email: 'zub8514@saha.local', phone: '+12025550201' },
    wife: { username: 'kavya', name: 'Anneliese Fontaine', email: 'jom2670@saha.local', phone: '+12025550202' },
  },
  {
    togetherID: 'ARJUN-MEERA',
    husband: { username: 'arjun', name: 'Fitzgerald Adebayo', email: 'qip3948@saha.local', phone: '+12025550301' },
    wife: { username: 'meera', name: 'Wilhelmina Vasquez', email: 'hax5162@saha.local', phone: '+12025550302' },
  },
]

/**
 * Refuses to seed data in which one field could be mistaken for another.
 *
 * This is the guard that keeps the property above from rotting: the moment someone "tidies up" a
 * fixture to `name: 'Madhu A'`, seeding fails loudly instead of silently blinding the suite.
 */
function assertDistinguishable(person, togetherID) {
  const fields = {
    username: person.username,
    name: person.name,
    email: person.email.split('@')[0],
    phone: person.phone,
  }
  const parts = Object.entries(fields).flatMap(([field, value]) =>
    // Names are compared word by word: "Bartholomew Quintero" must not contain the username, but
    // neither should either of its words.
    String(value).toLowerCase().split(/\s+/).map((word) => ({ field, word })),
  )

  for (const a of parts) {
    for (const b of parts) {
      if (a.field === b.field || a.word.length < 3 || b.word.length < 3) continue
      if (a.word.includes(b.word)) {
        throw new Error(
          `Fixture fields are confusable: ${a.field} "${a.word}" contains ${b.field} "${b.word}". ` +
            `A screen rendering the wrong one would look correct. Pick unrelated values.`,
        )
      }
    }
  }

  const id = togetherID.toLowerCase()
  for (const [field, value] of Object.entries(fields)) {
    for (const word of String(value).toLowerCase().split(/\s+/)) {
      if (word.length >= 3 && id.includes(word)) {
        throw new Error(
          `Fixture ${field} "${word}" appears inside TogetherID "${togetherID}". ` +
            `Assertions could not tell them apart. Pick an unrelated value.`,
        )
      }
    }
  }
}

for (const couple of ROSTER) {
  // Usernames intentionally echo the TogetherID (madhu → MADHU-PRIYA) so humans can sign in, so the
  // username is exempt from the ID check — but names and emails must stay clearly distinct.
  assertDistinguishable({ ...couple.husband, username: 'x'.repeat(40) }, couple.togetherID)
  assertDistinguishable({ ...couple.wife, username: 'x'.repeat(40) }, couple.togetherID)
  assertDistinguishable(couple.husband, 'ZZZZ')
  assertDistinguishable(couple.wife, 'ZZZZ')
}

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
