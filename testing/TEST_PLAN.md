# Test Plan

## Objective

Validate every meaningful component, state, interaction, and end-to-end journey in Saha against the
**real** backend, find real product bugs, fix them, and lock each fix with a regression test.

## Approach

- **Real-backend E2E** (Playwright, `tests/e2e/comprehensive/`): the browser drives the actual app;
  the API/DB back everything. No mocking of the flows under test. API calls are used only for
  **setup** (seeding couples/connections) and for **deterministic assertions** (e.g. timestamp format).
- **Deterministic data:** each test seeds a fresh, randomized couple → no shared mutable state, safe to
  re-run, CI-friendly. Single worker + shared backend for a clean, ordered report.
- **Timezone pinned to `Asia/Kolkata` (+05:30)** so the UTC-serialization bug is reproducible on any
  runner (it is invisible when the runner itself is UTC).
- **Selectors** favor `getByRole` / `getByLabel` / `getByPlaceholder`; `data-testid` only where
  semantics are insufficient (`togetherid-availability`). No arbitrary sleeps; web-first assertions.

## What each area tests (beyond happy paths)

- **Auth:** valid/invalid/unknown credentials; empty-form validation (and that no API call fires);
  password visibility; session guards (signed-out → login, signed-in → dashboard, sign-out clears);
  awaiting-partner threshold; forgot/reset validation + enumeration-safety; full 3-step registration;
  under-16 / malformed-username / taken-username rejection.
- **Navigation:** every sidebar route; the 4 coming-soon stubs; theme toggle round-trip; 404;
  signed-out direct-URL access to 6 protected routes.
- **Connect:** search (match / no-match / <2 chars); send request; accept + appears in Connected;
  decline + leaves pending; empty states.
- **Messaging:** empty prompt; send; edit (+"edited"); delete (tombstone); react; cross-account read
  by the other partner; group creation from a connected couple.
- **Profile:** view; edit + persist across reload; email/phone validation; partner tab read-only;
  view-as-partner banner enter/exit.
- **Dashboard/Settings:** greeting + TogetherID; couple card (both partners); module grid + navigation;
  theme options + dark persistence.
- **Regression:** one test per confirmed bug (BUG-001…006), each failing pre-fix.

## Test-type coverage

Functional (valid/invalid/boundary/duplicate), UI/interaction (visibility, enabled/disabled, toggles,
tabs, modals), data-state (empty/one/many, cross-account), auth/authorization (guards, couple-scoping,
enumeration-safety), reliability (self-contained + repeated runs), accessibility (accessible names,
roles, aria-live toasts, labels).

## Exit criteria

Every identified component tested or explicitly documented as blocked; all confirmed fixable bugs
fixed with a failing-first regression test; the suite green across ≥3 consecutive full runs; backend
and frontend unit suites, type-check, and lint all green.
