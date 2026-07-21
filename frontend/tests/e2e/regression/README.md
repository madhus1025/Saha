# Catalogue-traceable regression suite

Automated execution of the manual test catalogue in [`test-cases/`](../../../../test-cases).

Every test title is prefixed with the catalogue case ID(s) it exercises — `[AUTH-002]`,
`[PWR-008][REG-016]` — so the JSON reporter output joins straight back onto the manual
catalogue and produces the execution report.

## Prerequisites

1. **Backend** in the IntegrationTest environment:

   ```bash
   cd backend/src/Saha.API
   ASPNETCORE_ENVIRONMENT=IntegrationTest \
     ASPNETCORE_URLS="https://localhost:7001;http://localhost:5001" \
     dotnet run --no-launch-profile
   ```

2. **Seed roster** (idempotent):

   ```bash
   cd frontend
   npm run seed:e2e
   npm run seed:e2e:connect
   ```

The Vite dev server is started automatically by the config (`reuseExistingServer: true`)
with `VITE_REGISTRATION_ENABLED=true`, because the registration wizard cases need it.

## Running

```bash
cd frontend
npm run test:e2e:regression        # full suite
npm run report:regression          # build reports/regression-execution-report.html
```

Do **not** pass `--reporter=list` on the CLI — it replaces the config's reporter array and
suppresses the JSON output the report generator consumes. Use `--reporter=list,json` if you
want live console output as well.

Useful subsets:

```bash
npx playwright test --config playwright.regression.config.ts messaging
npx playwright test --config playwright.regression.config.ts -g "PWR-008"
npx playwright test --config playwright.regression.config.ts --last-failed
```

## Layout

| File | Catalogue | Prefixes |
|---|---|---|
| `auth-login-session.spec.ts` | `authentication/login-session-and-recovery.md` | AUTH, SES |
| `auth-recovery.spec.ts` | `authentication/login-session-and-recovery.md` | PWR |
| `auth-registration.spec.ts` | `authentication/registration-and-invitations.md` | REG, INV |
| `shell-dashboard-settings.spec.ts` | `shell/dashboard-navigation-settings.md` | NAV, DASH, MOD, SET |
| `profile.spec.ts` | `profile/profile-and-partner-view.md` | PRF |
| `connect.spec.ts` | `connect/connections.md` | CON |
| `messaging.spec.ts` | `messaging/conversations-and-messages.md` | MSG, GRP, THR, TXT, EDT, DEL, REA, CFG |
| `security-crosscutting.spec.ts` | `cross-cutting/security-…-telemetry.md` | SEC, REL, ACC, RSP, TEL, DEP |

`_fixtures.ts` holds the seeding and API helpers. `build-report.mjs` turns the JSON reporter
output plus `defects.json` into the HTML execution report.

## Not covered here

These catalogue areas need infrastructure this suite does not stand up, and are deliberately
excluded rather than silently skipped:

- **MED-001…007, PRF-014…017, SEC-012** — blob-backed media/avatar storage (needs Azurite).
- **PWR-010/012/014** — the successful reset leg needs a readable mailbox or a token fixture.
- **REG-001** — needs a second Vite process built without `VITE_REGISTRATION_ENABLED`.
- **SEC-010/011, DEP-001** — TLS/HSTS, real rate-limit policy, deployed configuration matrix.
- **SEC-015, TEL-006/007** — audit-log DB inspection and OpenTelemetry exporters.
- **BRW-001/002** — Firefox, WebKit and real mobile devices (this config is Chromium only).

## Writing a new case

Prefix the title with the catalogue ID and assert the **specified** behaviour, not the
behaviour the code happens to have today — a failing test here is the intended way to report a
defect. Add a matching entry to `defects.json` so the generated report explains it.
