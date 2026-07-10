# Feature: Login & Registration — "Hearth" Redesign

**Slug:** `auth-login-registration`
**Status:** In Progress — **Chunks 1 and 2 of 3 complete**
**Brief:** [./auth-login-registration-brief.md](./auth-login-registration-brief.md)
**Started:** 2026-07-10
**Last Updated:** 2026-07-10
**AI Session:** claude-opus-4-8

## Clarifications & Key Decisions

- [2026-07-10] **OQ-1 resolved** — build `GET /auth/availability` for both username and TogetherID. Rationale: FR-12's UX (no late bounce) outweighs the username enumeration oracle, mitigated by a 30/min limiter, boolean-only responses, and audit logging. Knowingly deviates from spec **A3**.
- [2026-07-10] **Scope: Chunk 1 only.** Chunk 2 (UI) not authorised this session; Chunk 3 blocked on missing design (**A6**).
- [2026-07-10] **DL-1** — `Couple.Husband`/`Wife` became `Partner?` via `SingleOrDefault`. The compiler then listed every fault site. **Confirmed: 13 sites, exactly as the TDD predicted.**
- [2026-07-10] **D-1** — `POST /auth/register` now issues tokens + refresh cookie (previously a bare `201`).
- [2026-07-10] **D-3** — Password capped at **72 UTF-8 bytes**, not characters (BCrypt truncates on bytes).
- [2026-07-10] **DL-3** — Partner-conversation provisioning moved from `CoupleRegisteredEvent` to the new `CoupleCompletedEvent`. The event now carries `HusbandId`/`WifeId`, so `ProvisionPartnerConversationHandler` no longer needs `ICoupleRepository`.
- [2026-07-10] **Deviation from TDD §5.4** — `CoupleInvitation.TokenHash` uses `ITokenService.HashToken` (deterministic SHA-256), **not** `IPasswordHasher`. BCrypt is salted, so a hash lookup (`GetByInvitationTokenHashAsync`) is impossible with it. Mirrors how `RefreshToken` is stored.
- [2026-07-10] **New: `JsonStringEnumConverter` registered** in `ServiceCollectionExtensions`. `role: "Husband"` would not otherwise bind. Outbound DTOs already stringify enums by hand, so no response shape changed.
- [2026-07-10] **Migration trap avoided** — `HasDefaultValue(CoupleState.Complete)` was removed from `CoupleConfiguration`. `AwaitingPartner` is the CLR default (0), so EF would have treated it as "unset", skipped writing it, and **every new couple would have silently persisted as `Complete`**. Existing rows are backfilled in the migration instead.
- [2026-07-10] **Migration provider trap avoided** — `dotnet ef migrations add` scaffolded against the local **SQLite** connection string and rewrote every SQL Server column (`nvarchar`→`TEXT`). Regenerated with `ConnectionStrings__DefaultConnection` pointing at SQL Server. Also: `dotnet ef migrations remove` deleted `AddMessaging` rather than the new migration; restored via `git checkout`.

## Steps & Checklist

- [x] Reviewed spec & TDD (brief approved for Chunk 1)
- [x] Created this progress file + brief
- [x] Ran full test suite to capture green BASELINE (pre-change)
- [x] 1a — Extracted `IAuthTokenIssuer`; login, register, refresh, and accept all issue tokens through it
- [x] 1b — Domain: `CoupleState`, nullable `Husband`/`Wife`, `Register`(1 partner), `AcceptPartner`, 3 reshaped events — **tests written first, failed for the intended reason (52 compile errors naming exactly the missing members)**
- [x] 1c — Repaired all 13 fault sites
- [x] 1d — `CoupleInvitation` entity + EF config + SQL Server migration + repository
- [x] 1e — Commands/queries, `AuthResponseDto`, controller, `availability` limiter, TOCTOU catch
- [x] 1f — Rewrote fixtures + `AwaitingPartnerCoupleTests` regression sweep
- [x] Verification loop — all NEW + existing tests green (270 backend)
- [x] **Sweep proven non-vacuous** — reverting the site-#8 guard fails exactly 2 tests
- [x] Drove the real API end-to-end (register → invite → accept → partner chat)
- [x] Captured evidence below
- [x] **Chunk 2 — login + 3-step wizard UI, guards, waiting threshold**
- [x] Corrected the two stale spec statements (`couple-messaging.spec`, source spec's "safety net" claim)
- [ ] **Chunk 3 (invite + acceptance screens) — BLOCKED on design (A6)**
- [ ] Feature NOT moved to completed/ — Chunk 3 remains

## Current Focus / Next Step

**Chunks 1 and 2 are done. Everything is green. Nothing is committed.**

The next step is **Chunk 3: the invite and invitation-acceptance screens**, which is **blocked on
design** (spec **A6**). Until they exist, `/register` stays behind `VITE_REGISTRATION_ENABLED`
(**R-4**): a couple that registers today cannot complete itself and would be stranded at the
threshold forever.

Placeholders exist at `frontend/src/modules/auth/pages/InvitePage.tsx` and `AcceptInvitationPage.tsx`.
The backend contract they will call already exists and is covered by tests:

```
POST /auth/invitations         { inviteeName, inviteeEmail } -> { token, expiresAt }
POST /auth/invitations/accept  { token, ...the invitee's own half } -> auth response
```

To run the app locally with registration on:

```bash
cd backend/src/Saha.API && rm -f saha-dev.db   # EnsureCreated never adds the new State column
ASPNETCORE_ENVIRONMENT=IntegrationTest ASPNETCORE_URLS="http://localhost:5099" \
  Cors__AllowedOrigins__0="http://localhost:5173" dotnet run --no-launch-profile

cd frontend && VITE_API_URL=http://localhost:5099/api/v1 VITE_REGISTRATION_ENABLED=true npm run dev
```

## Test Evidence

### Green baseline, pre-change (2026-07-10)

```
$ cd backend && dotnet test
Domain 91 · Application 42 · Infrastructure 36 · API 30   = 199 passed, 0 failed
$ cd frontend && npm run type-check && npm run lint && npm run test
tsc clean · eslint clean · 6 files, 25 tests passed
```

### After Chunk 1 (2026-07-10)

```
$ cd backend && dotnet test
Passed! - Failed: 0, Passed: 109, Total: 109  — Saha.Domain.Tests.dll
Passed! - Failed: 0, Passed:  60, Total:  60  — Saha.Application.Tests.dll
Passed! - Failed: 0, Passed:  36, Total:  36  — Saha.Infrastructure.Tests.dll
Passed! - Failed: 0, Passed:  65, Total:  65  — Saha.API.Tests.dll
                                       TOTAL: 270 passed, 0 failed   (+71 vs baseline)

$ cd frontend && npm run type-check && npm run lint && npm run test
tsc clean · eslint clean · 25 tests passed   (frontend untouched this chunk)
```

### The regression sweep is not vacuous

Temporarily reverting the `if (!couple.IsComplete) return;` guard in
`GetConversationsQueryHandler.EnsurePartnerConversationAsync` (fault site #8):

```
Failed  AwaitingPartnerCoupleTests.GetConversations_ShouldReturnEmpty_ForASoloCouple_AndNotFault
Failed  AwaitingPartnerCoupleTests.GetConversations_ShouldProvisionThePartnerChat_OnceTheCoupleCompletes
Failed! - Failed: 2, Passed: 12, Total: 14
```

Guard restored; suite green again.

### Live API, driven end-to-end over HTTP

`ASPNETCORE_ENVIRONMENT=IntegrationTest dotnet run` on `http://localhost:5099`:

```
1. availability (fresh)              {"usernameAvailable":true,"togetherIDAvailable":true}
2. register (one partner)            coupleState: AwaitingPartner | role: Husband | signed in: True
3. availability (now taken)          {"usernameAvailable":false,"togetherIDAvailable":false}
4. GET /conversations (site #8)      [] [HTTP 200]          ← would have 500'd before
5. GET /profile/partner              HTTP 404               ← OQ-2 assumption holds
6. password "tooshort"               VALIDATION_ERROR: "A little longer — at least 12 characters."
7. invite + accept                   coupleState: Complete | invitee role (auto): Wife
8. registrant session (stale token)  coupleState: Complete  ← DL-4: read fresh, not from JWT
9. GET /conversations                conversations: 1 | type: Partner | pinned: True
```

Real e2e seed script, rewritten for the new lifecycle, against the same live API:

```
$ SAHA_API_BASE=http://localhost:5099/api/v1 node frontend/tests/e2e/real/seed.mjs
  MADHU-PRIYA    ✅ created
  RAVI-KAVYA     ✅ created
  ARJUN-MEERA    ✅ created

$ search RAVI-KAVYA -> 1 result: Ravi K & Kavya K      (Complete couples are discoverable)
```

### A real bug the tests could not catch

The first live run returned **500**: `SQLite Error 1: 'table Couples has no column named State'`.
The API-integration tests use the EF **InMemory** provider, so they never touch schema creation. Local
dev/IntegrationTest use `EnsureCreated`, which creates missing *tables* but never adds *columns* to an
existing one — so a stale `saha-integration-test.db` lacked `State`. Deleting the file fixed it.

**Anyone with an existing local SQLite database must delete it** (`backend/src/Saha.API/saha-dev.db`,
`saha-integration-test.db`; both gitignored). Production is unaffected — it runs `Migrate`, and the
migration adds the column. This is the schema-init divergence called out in `.ai/ARCHITECTURE.md`.

### After Chunk 2 (2026-07-10)

```
$ cd backend && dotnet test
Domain 109 · Application 60 · Infrastructure 36 · API 65   = 270 passed, 0 failed

$ cd frontend && npx tsc --noEmit && npm run lint && npx vitest run
tsc clean · eslint clean (max-warnings 0)
Test Files  10 passed (10) · Tests  77 passed (77)      (+52 vs the 25 at baseline)

$ npx playwright test tests/e2e/auth tests/e2e/smoke.spec.ts --project=chromium
46 passed
```

**Pre-existing e2e failures, verified NOT caused by this work.** A full chromium run reports
`12 failed, 124 passed`. I stashed every change, returned the tree to HEAD, and re-ran:

```
HEAD, tests/e2e/messages   ->  2 failed, 18 passed   (group-creation dialog; same 2 tests)
HEAD, tests/e2e/real       -> 10 failed,  1 passed   (needs a backend on :7001 + seeding)
```

Identical failures before and after. The `real/` suite has its own `playwright.real.config.ts` and a
`global-setup` that expects `https://localhost:7001`; the default config sweeps it up anyway.

### The real UI, driven end-to-end against the live API

A throwaway Playwright spec drove the actual wizard in a real browser against the running backend:

```
step 1  filled own half; live username check resolved "Available — it's all yours"
step 2  "correct horse battery staple" -> meter read "Good — long and easy to say out loud"
step 3  typed "maya-arun-854120" -> field showed "MAYA-ARUN-854120"; availability confirmed
        clicked "Open our home"
        -> signed in, routed to /invite
/dashboard  -> redirected to /waiting, showing "Waiting for your person" and the real TogetherID
/register   -> redirected to /invite (an authenticated registrant cannot re-enter the wizard)
```

Screenshots confirmed the two-column step-1 grid, the segmented Wife/Husband control, the step
indicator, and the threshold.

## Notes, Risks & Open Items

- **R-1 (High)** — a missed fault site 500s in production. Mitigated: `Partner?` forced 13 compile errors; all 13 repaired; `AwaitingPartnerCoupleTests` sweeps every affected endpoint. **No nullable warning was silenced with `!`** except the pre-existing one in `LoginCommandHandler` (safe: the couple was just resolved *by* that username).
- **R-4 (High, OPEN)** — Chunk 2 must not reach users before Chunk 3 exists. A couple that cannot complete cannot use the product. `/register` needs a route-level flag.
- **R-6 (OPEN)** — rolling back Chunk 1 is safe *today* because nothing creates `AwaitingPartner` rows in production yet. It stops being safe the moment Chunk 2 ships.
- **Frontend/backend incompatibility — RESOLVED in Chunk 2.** `useRegister.ts`, `register.schema.ts`, and `auth.api.ts` now speak the one-partner contract.
- **Deck discrepancy D1, handled.** Step 3's footer reads "Next: invite Arun in." but no in-scope screen collects the partner's name, so the wizard renders "Next: invite your person in." A comment in `RegisterStepYourDoor.tsx` records why.
- **Deviation: `AuthLayout` untouched.** Spec FR-1 says "a single centered card on a cream field", but the app's auth shell is a split hero, and it is shared with the forgot/reset screens that this work explicitly does not redesign (Non-Goals). The card contents match the deck; the surrounding shell does not. Worth a product decision.
- **Two environment traps for local dev.** `Cors:AllowedOrigins` in `appsettings.IntegrationTest.json` lists only `http://localhost:5175`, while Vite serves `5173` — availability checks are silently blocked by CORS until you override it. And an existing `saha-dev.db` must be deleted, since `EnsureCreated` adds tables but never columns.
- **Guard-loop hazard, guarded by a test.** `GuestRoute` must send an `AwaitingPartner` registrant to `/waiting`, not `/dashboard`, or `CompleteCoupleRoute` bounces them straight back. Separately, the `/register` route uses `awaitingRedirect="/invite"` so the guard's redirect and `useRegister`'s imperative `navigate` agree — when they disagreed, whichever landed last won, and registration ended on the wrong screen. Both are covered in `CompleteCoupleRoute.test.tsx` and `login.spec.ts`.
- **Pre-existing, not fixed (TDD R-7)** — `SearchCoupleQueryHandler` still does an N+1 (`GetBetweenCouplesAsync` per result) and `SearchByTogetherIDAsync` is a *partial* match, though deck screen 10 says "exact TogetherID only, no browsing". Only the `Complete` filter was added.
- **Spec amendments owed:**
  1. `couple-messaging.spec` — "the private partner chat is automatically available after registration" is now false; it is provisioned on **acceptance**. Two acceptance criteria need rewording.
  2. `auth-login-registration.spec` — its claim that `EnsurePartnerConversationAsync` is a safety net is wrong; it was fault site #8.

## Session Log

- [2026-07-10] claude-opus-4-8 (Chunk 2) — Corrected both stale specs. Rebuilt `modules/auth`: "Welcome home" login, 3-step wizard (`RegisterStepYourHalf`/`OneKey`/`YourDoor`), `RoleToggle`, `PasswordStrengthMeter`, debounced availability, non-persisted wizard store, `CompleteCoupleRoute`, `/waiting` threshold polling `GET /auth/session`, and Chunk-3 stubs. Registration sits behind `VITE_REGISTRATION_ENABLED`. Frontend: 77 unit tests, tsc + eslint clean; 46 auth/smoke e2e pass. Proved the 12 remaining e2e failures are pre-existing by re-running at HEAD. Drove the real wizard in a browser against a live backend. **Next: Chunk 3, blocked on design.**
- [2026-07-10] claude-opus-4-8 (Chunk 1) — Read TDD + spec. Captured green baseline (backend 199, frontend 25). Resolved OQ-1 and scope with the user. Implemented Chunk 1 end-to-end: `IAuthTokenIssuer` extraction, couple lifecycle, 13 fault-site repairs, `CoupleInvitation`, SQL Server migration with backfill, register/accept/availability/session endpoints, `availability` rate limiter, TOCTOU handling. Rewrote 6 test fixtures and added the FR-29 regression sweep. Backend 270 green; frontend untouched and still green. Verified the sweep is non-vacuous and drove the whole lifecycle against a live API, which surfaced a stale-SQLite-schema trap worth documenting. **Next: Chunk 2 (UI) — see Current Focus.**
