# Real-backend E2E — findings & bug report

Suite: `frontend/tests/e2e/real/` (drives the **real** backend + DB, not the mocked
`tests/e2e/{messages,connect}` suites). Run with `npm run test:e2e:real` (backend must be up in the
`IntegrationTest` environment — see `playwright.real.config.ts` header).

Result: **9/9 green**, with one deliberately-annotated `test.fail()` that documents the bug below.
The core connect + messaging flows (register → login → search → request → accept/reject → partner
chat → group chat → edit/delete/react/rename/pin, cross-account persistence) all **work** end to end.

---

> **Update (2026-07-21): BUG 1 is FIXED.** The API now serializes every `DateTime` with a UTC
> offset via `Saha.API.Serialization.UtcDateTimeJsonConverter`. The `test.fail()` annotation has been
> removed. This `tests/e2e/real` suite is otherwise **stale** — its fixtures still use the pre-redesign
> two-partner `register` payload and the old `Shared Password` login label. The maintained, correct
> suite is `tests/e2e/comprehensive/` (see `testing/` and `reports/e2e-product-quality-report.html`).

## BUG 1 — UTC timestamps are serialized without a `Z`, so message/list times are wrong (HIGH) — ✅ FIXED

**User impact:** In any timezone east of UTC, a message you just sent shows a stale time (e.g. "5h"
in IST) instead of "now"; conversation-list times are wrong too. West of UTC it silently clamps to
"now" for future-looking values. Times are simply untrustworthy.

**Root cause:** All timestamps are `DateTime` (Kind lost to `Unspecified` when read from the DB):
- `Message.CreatedAt` / `EditedAt` — `MessagingDtos.cs`
- `Conversation.LastActivityAt` — `MessagingDtos.cs`
- `Connection.CreatedAt` / `AcceptedAt` — `GetConnectionsQuery.cs`

`GET /conversations/{id}/messages` returns `"createdAt":"2026-07-08T17:16:58.699286"` (no `Z`),
while `POST` of the same message returns `...699286Z` (Kind=Utc from `DateTime.UtcNow`). The frontend
`relativeTime()` (`src/modules/messages/utils.ts`) does `new Date(iso)`, which parses the no-`Z`
string as **local** time.

**Evidence:** `messaging.real.spec.ts` → "REGRESSION: a just-sent message shows a fresh timestamp".
Marked `test.fail()`; remove that annotation when fixed.

**Fix options (pick one):**
- Backend (preferred): return `DateTimeOffset`, or force `DateTime.SpecifyKind(x, DateTimeUtc)` on
  read, or configure a JSON converter that always writes UTC with `Z`. Fixes every client at once.
- Frontend stopgap: normalize in `relativeTime()` (append `Z` when the string has no offset) — treats
  the symptom, not the cause.

---

## Observations (not bugs, worth noting)

- **No realtime delivery.** A partner/group message only appears for the other account after a
  refetch (navigation/reload) — the app relies on react-query invalidation, there is no push/polling.
  Tests reflect this (they re-open the thread). If "live chat" is expected, that's a feature gap.
- **Media messages untested.** Image/video upload needs Azurite (`UseDevelopmentStorage=true`); not
  exercised here. Worth a follow-up once Azurite is part of the local/E2E setup.

---

## Test-infra change required to run the suite

The `auth` rate limiter was hardcoded at 5 req/min per IP, so a burst of logins/registers 429s and
makes any real-login E2E flaky. Made the limits config-driven (production defaults unchanged) and
relaxed them in `appsettings.IntegrationTest.json`:
- `ServiceCollectionExtensions.cs` — reads `RateLimiting:Auth:PermitLimit` / `RateLimiting:Api:PermitLimit`
  (fallback 5 / 100).
- `appsettings.IntegrationTest.json` — sets both to 100000.
