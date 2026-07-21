# Test Users & Test Data

Saha has **no role/permission tiers** — every authenticated user is a "partner" inside exactly one
couple. The meaningful account states are therefore about **couple lifecycle** and **relationships
between couples**, not roles.

## How test data is created (safe & repeatable)

- **Environment:** the backend runs under `ASPNETCORE_ENVIRONMENT=IntegrationTest`, which uses an
  isolated SQLite file (`saha-integration-test.db`) and relaxes the auth rate limiter. **Never** run
  against a production database.
- **Creation path:** all accounts are created through the **real** API — `POST /auth/register` →
  `POST /auth/invitations` → `POST /auth/invitations/accept` — never by direct DB writes. This
  exercises the real registration contract and password hashing.
- **Isolation & idempotency:** the comprehensive suite's fixtures (`tests/e2e/comprehensive/fixtures.ts`)
  mint a **fresh, randomized** couple per test (`makeCoupleSpec`), so runs never collide on the
  unique `TogetherID`/username/email constraints and tests never share mutable state.
- **Manual roster:** `npm run seed:e2e[:connect]` (`tests/e2e/real/seed.mjs`) creates a stable,
  memorable roster for hand-testing.

## Shared secret (local/test only)

All seeded accounts share the password **`our quiet home by the sea`** (≥12 chars, ≤72 bytes — the
only rules the validator enforces). This is a throwaway local/test credential; no real secret appears
in this repo or the report.

## Personas

| Persona | Couple state | Data state | Represents | Used by |
|---------|-------------|-----------|-----------|---------|
| **Complete couple (registrant)** | Complete | connected + messaging | The primary happy-path user; either username signs in | auth, navigation, connect, messaging, profile, dashboard, regression |
| **Complete couple (partner)** | Complete | inherits the couple | The invited second partner; verifies cross-account reads within a couple | auth (both-usernames), messaging (cross-account) |
| **Incomplete couple (`AwaitingPartner`)** | Awaiting partner | none | Registrant whose partner hasn't accepted; lands on `/waiting`; must be refused from Connect | auth (threshold), regression (BUG-003) |
| **Connected couples (A ⇄ B)** | Both complete | Accepted connection | Two couples linked; enables group chat + connected list | connect, messaging (group), regression (BUG-001) |
| **Requesting couple** | Complete | outbound Pending request | Sends a request the target must accept/decline | connect (accept/decline), regression (BUG-004) |
| **Lonely couple** | Complete | no connections | Empty-state coverage (Connected/Pending) | connect (empty states) |

### Stable manual roster (`seed:e2e`)

| TogetherID | Partner A (username) | Partner B (username) |
|-----------|----------------------|----------------------|
| MADHU-PRIYA | madhu | priya |
| RAVI-KAVYA | ravi | kavya |
| ARJUN-MEERA | arjun | meera |

`--connect` also links MADHU-PRIYA ⇄ RAVI-KAVYA and MADHU-PRIYA ⇄ ARJUN-MEERA.

## Reset

Stop the backend and delete `backend/src/Saha.API/saha-integration-test.db*`; the schema is recreated
on next start. The comprehensive suite does **not** require a reset — every test self-seeds unique data.
