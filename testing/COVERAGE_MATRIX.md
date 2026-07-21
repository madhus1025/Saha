# Coverage Matrix

Comprehensive real-backend suite: `frontend/tests/e2e/comprehensive/`. **60 tests, 60 passing**,
stable across 3 consecutive full runs.

| Feature | Spec | Tests | Pass | Bugs found | Coverage | Risk |
|---------|------|------:|-----:|-----------|----------|------|
| Authentication | `auth.spec.ts` | 15 | 15 | BUG-005 | High | Low |
| Navigation / shell | `navigation.spec.ts` | 16 | 16 | — | High | Low |
| Connect | `connect.spec.ts` | 6 | 6 | BUG-006 | High | Low |
| Messaging | `messaging.spec.ts` | 7 | 7 | — | High | Low |
| Profile | `profile.spec.ts` | 5 | 5 | — | High | Low |
| Dashboard + Settings | `dashboard-settings.spec.ts` | 6 | 6 | — | High | Low |
| Regression (BUG-001..004) | `regression.spec.ts` | 5 | 5 | BUG-001..004 | — | Low |
| **Total** | | **60** | **60** | **6** | | |

## Cross-cutting concern coverage

| Concern | Where covered |
|---------|--------------|
| Loading states | messaging list skeleton, profile spinner (observed) |
| Empty states | connect (Connected/Pending), messaging ("Say hello") |
| Validation | login, register step 1, reset password, profile edit |
| Error toasts | login (BUG-005), connect request |
| Auth guards | navigation (6 protected routes), auth (guards, sign-out) |
| Couple-scoping / awaiting-partner | auth threshold; regression BUG-003 (backend enforcement) |
| Cross-account | messaging (partner reads the other's message) |
| Timestamps / timezone | regression BUG-001 (API + UI, pinned +05:30) |
| Accessibility | connect decline button name (BUG-006); toast aria-live; role-based selectors throughout |
| Reliability | 3 consecutive clean full runs; each test self-seeds |

## Supporting suites (unchanged/verified)

| Suite | Count | Result |
|-------|------:|--------|
| Backend unit/integration (`dotnet test Saha.sln`) | 270 | ✅ all pass (post-fix) |
| Frontend unit (`vitest`) | 77 | ✅ all pass |
| Type-check (`tsc --noEmit`) | — | ✅ clean |
| Lint (`eslint`) | — | ✅ clean |

## Known coverage gaps (documented, not blocking)

Media/image upload (needs Azurite), profile-picture upload (needs blob storage), password reset with a
real emailed code (needs a mailbox), mobile/tablet viewport passes, RoleToggle keyboard navigation,
group conversation settings dialog (rename/add/pin/hide) full drive, and the `/invite` +
`/invite/accept` placeholder screens (no approved design yet).
