# Saha — Bug Report

All bugs below were **discovered through exploration + the new comprehensive E2E suite**, reproduced
deterministically, root-caused, fixed with the smallest safe change, and locked with a regression
test that **fails before the fix and passes after**.

Legend — Severity: 🔴 High · 🟠 Medium · 🟡 Low. Status: ✅ Fixed · 📝 Observation (documented, not fixed).

| ID | Title | Area | Severity | Status | Regression test |
|----|-------|------|----------|--------|-----------------|
| BUG-001 | Timestamps serialized without a UTC offset → wrong relative times | Backend (API serialization) | 🔴 High | ✅ Fixed | `regression.spec.ts` (API + UI) |
| BUG-002 | Login footer renders a literal `\u00b7` instead of `·` | Frontend (LoginPage) | 🟡 Low | ✅ Fixed | `regression.spec.ts` |
| BUG-003 | Incomplete couple can send connection requests (invisible/orphaned) | Backend (Connect) | 🟠 Medium | ✅ Fixed | `regression.spec.ts` |
| BUG-004 | Pending-request count badge never shows until the tab is opened | Frontend (ConnectPage) | 🟠 Medium | ✅ Fixed | `regression.spec.ts` |
| BUG-005 | Wrong-password login shows "Refresh token not found." instead of the real error | Frontend (axios interceptor) | 🟠 Medium | ✅ Fixed | `auth.spec.ts` |
| BUG-006 | "Decline request" button is icon-only with no accessible name (a11y) | Frontend (ConnectPage) | 🟡 Low | ✅ Fixed | `connect.spec.ts` |
| OBS-1 | `partnerName` == current user's own name; used as the partner-name fallback on the dashboard | Frontend | 🟡 Low | 📝 Observation | — |
| OBS-2 | First API call after a hard reload always 401s (no proactive boot refresh) → console error | Frontend | 🟡 Low | 📝 Observation | — |
| OBS-3 | No realtime message delivery (react-query invalidation only) | Full-stack | 🟡 Low | 📝 Observation | — |

---

## BUG-001 — Timestamps are serialized without a UTC offset 🔴

- **Component:** Messaging (conversation list + message meta), Connect (connection times). Root cause is global API JSON serialization.
- **User impact:** In any timezone east of UTC, a message you just sent shows a **stale time** (e.g. "5h" in IST) instead of "now"; conversation-list and connection times are all wrong. West of UTC, future-ish values clamp to "now". Every displayed time is untrustworthy.
- **Reproduction:**
  1. Run the app with a browser timezone that is not UTC (the suite pins `Asia/Kolkata`).
  2. Open the partner conversation, send a message.
  3. The just-sent message shows **"5h"**, not "now". (See `test-results/screenshots/msg-after-reload.png`.)
- **Expected:** A message sent seconds ago reads "now".
- **Actual (before):** Reads "5h" (5.5h — the IST offset).
- **Root cause:** `DateTime` values read back from SQLite have `Kind == Unspecified`. System.Text.Json then serializes them **without any offset** (`"2026-07-20T17:14:04.566"`), while values built from `DateTime.UtcNow` (e.g. token `expiresAt`) keep `Kind == Utc` and get a `Z`. The browser parses an offset-less ISO string as **local** time (`src/modules/messages/utils.ts` → `relativeTime` → `new Date(iso)`), producing the skew. Confirmed at the API: `GET /connect/connections` returned `"createdAt":"2026-07-20T17:08:17.123543"` (no `Z`) while login `expiresAt` had `Z`.
- **Fix:** Added a global `JsonConverter<DateTime>` (`backend/src/Saha.API/Serialization/UtcDateTimeJsonConverter.cs`) that treats `Unspecified`/`Local` as UTC and always writes the round-trip `"O"` format (trailing `Z`); registered it in `AddApiServices` alongside the existing enum converter. Fixes every client at once, no DTO changes.
- **Files changed:** `backend/src/Saha.API/Serialization/UtcDateTimeJsonConverter.cs` (new), `backend/src/Saha.API/Extensions/ServiceCollectionExtensions.cs`.
- **Evidence:** before `test-results/screenshots/msg-after-reload.png` ("5h"); after `test-results/screenshots/after-message-now.png` ("now"; the earlier message correctly re-reads "50m").

## BUG-002 — Login footer shows a literal `\u00b7` 🟡

- **Component:** `LoginPage` footer ("Create our home · I have an invitation").
- **User impact:** The app's front door renders the raw escape text **`·`** between the two links instead of a middle dot — a visible typo on the most-seen screen.
- **Root cause:** `LoginPage.tsx:95` had `<span> \u00b7 </span>`. In JSX **text** content, `\u00b7` is literal characters, not an escape (unlike a JS string literal). `RegisterPage.tsx:40` correctly uses a real `·`, confirming the inconsistency.
- **Fix:** Replaced the literal with a real UTF-8 `·` (`0xC2 0xB7`).
- **Files changed:** `frontend/src/modules/auth/pages/LoginPage.tsx`.
- **Evidence:** before `test-results/screenshots/guest-login.png`; after `test-results/screenshots/after-login.png`.

## BUG-003 — Incomplete couple can send connection requests 🟠

- **Component:** Connect (`SendConnectionRequestCommandHandler`).
- **User impact:** A couple still in `AwaitingPartner` (only one partner registered) can `POST /connect/request`. The request is **invisible to the target** — `GetConnectionsQuery` silently `continue`s past any connection whose other couple `!IsComplete` — yet it permanently occupies the unique "between two couples" slot, so once that couple completes, a genuine request between the two couples is blocked with `REQUEST_PENDING` (409) that neither side can see or clear. The handler's own comment asserts this is *"unreachable while connections can only be formed with complete couples"* — but nothing enforced it.
- **Reproduction:** register a couple (no invitation acceptance) → log in via API → `POST /connect/request` to a complete couple → **HTTP 201** (accepted). The target's `?status=Pending` list stays empty.
- **Expected:** the request is refused for an incomplete couple.
- **Fix:** guard in `SendConnectionRequestCommandHandler` — `if (!requesterCouple.IsComplete) throw new ConflictException("COUPLE_INCOMPLETE", …)` (HTTP 409).
- **Files changed:** `backend/src/Saha.Application/Features/Connect/Commands/SendConnectionRequest/SendConnectionRequestCommandHandler.cs`.

## BUG-004 — Pending-request badge never appears until the tab is opened 🟠

- **Component:** `ConnectPage` tab bar.
- **User impact:** The count badge on the **Pending** tab — whose entire purpose is to alert you to incoming requests from the *other* tabs — never renders until you happen to click into Pending. A couple with a fresh incoming request sees no notification.
- **Root cause:** the pending query was gated by `enabled: activeTab === 'pending'`, so the data backing the badge only existed while already on that tab.
- **Fix:** removed the `enabled` gate so the pending count is always fetched and the badge is accurate from first load.
- **Files changed:** `frontend/src/modules/connect/pages/ConnectPage.tsx`.
- **Evidence:** after `test-results/screenshots/after-connect-badge.png` (badge visible on the Connected tab).

## BUG-005 — Wrong-password login shows "Refresh token not found." 🟠

- **Component:** axios response interceptor (`core/api/axios-instance.ts`).
- **User impact:** On the single most common auth failure (wrong password), the toast reads **"Refresh token not found."** instead of "Invalid username or password." — confusing and wrong. (Surfaced by the auth E2E suite.)
- **Root cause:** the 401 interceptor excluded only `/auth/refresh`. A 401 from `/auth/login` therefore triggered a spurious token refresh; with no session cookie, `/auth/refresh` 401s with "Refresh token not found.", and that error replaced the real credentials error.
- **Fix:** the refresh-retry now skips all unauthenticated auth entry points (`/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/invitations/accept`). `/auth/session` is intentionally *not* excluded — it is authenticated and should refresh on a 401.
- **Files changed:** `frontend/src/core/api/axios-instance.ts`.

## BUG-006 — "Decline request" button has no accessible name 🟡 (a11y)

- **Component:** `ConnectPage` pending-request card.
- **User impact:** The decline (✕) button was an icon-only `<button>` with no text and no `aria-label`, so screen-reader users could not tell what it does (WCAG 4.1.2 Name, Role, Value).
- **Fix:** added `aria-label="Decline request"`. (The Accept button already carries its "Accept" text.)
- **Files changed:** `frontend/src/modules/connect/pages/ConnectPage.tsx`.

---

## Observations (documented, not fixed)

- **OBS-1 — `partnerName` semantics.** The auth store's `partnerName` is set to the **signed-in partner's own name** (`AuthResult.From` → `partner.Name`). The dashboard uses it as the *fallback* for the **other** partner's name (`coupleInfo.partner?.name ?? partnerName`). Before the profile query resolves, the partner card can briefly show the current user's own name. Low impact/transient; the correct fix depends on a product decision about what `partnerName` should mean, so it is left documented rather than changed.
- **OBS-2 — Boot-time 401.** The access token is deliberately not persisted; on a hard reload the app is `isAuthenticated` but token-less, so the first protected API call 401s (console error) then recovers via the refresh cookie. It works, but every hard reload logs a 401 and pays one extra round-trip. A proactive silent refresh on boot would remove the console noise.
- **OBS-3 — No realtime delivery.** New messages only appear for the other account after a refetch (navigation/reload); there is no push/polling. Matches the pre-existing `tests/e2e/real/FINDINGS.md` note. Feature gap, not a defect.
- **Stale pre-existing suite.** `frontend/tests/e2e/real/fixtures.ts` still uses the **old two-partner** register payload (`husbandUsername`/`wifeUsername`) and the old login label (`Shared Password`); both changed in the Hearth auth redesign, so that suite no longer seeds/logs in. The new `tests/e2e/comprehensive/` suite replaces it with correct fixtures.
