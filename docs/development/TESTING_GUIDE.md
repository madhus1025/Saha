# Saha — Testing Guide

## Test Pyramid

```
                    ┌───────────┐
                    │   E2E     │  Playwright — 5 browsers
                    │  ~20 specs│  Runs on PR + main push
                    ├───────────┤
                  ┌─┴───────────┴─┐
                  │  Integration  │  ASP.NET WebApplicationFactory
                  │  ~15 tests    │  Runs on every push
                  ├───────────────┤
              ┌───┴───────────────┴───┐
              │       Unit Tests       │  xUnit (backend) + Vitest (frontend)
              │  ~100+ tests           │  Runs on every push
              └───────────────────────┘
```

## Backend Unit Tests

### Framework: xUnit + FluentAssertions + NSubstitute

**Domain tests** (`Saha.Domain.Tests`): Test aggregate logic in isolation — no mocks needed because Domain has no dependencies.

```csharp
[Fact]
public void Register_ShouldCreateCoupleWithBothPartners()
{
    var couple = Couple.Register(
        togetherId: TogetherID.Create("MADHU-PRIYA"),
        passwordHash: "hashedpassword",
        ...
    );

    couple.Husband.Username.Value.Should().Be("madhu");
    couple.Wife.Username.Value.Should().Be("priya");
    couple.DomainEvents.Should().ContainSingle(e => e is CoupleRegisteredEvent);
}
```

**Application tests** (`Saha.Application.Tests`): Mock all infrastructure via NSubstitute interfaces.

```csharp
[Fact]
public async Task Handle_ShouldCreateCouple_WhenRequestIsValid()
{
    _coupleRepository.ExistsByTogetherIDAsync(Arg.Any<TogetherID>(), Arg.Any<CancellationToken>())
        .Returns(false);

    var result = await _handler.Handle(validCommand, CancellationToken.None);

    result.TogetherID.Should().Be("MADHU-PRIYA");
    await _coupleRepository.Received(1).AddAsync(Arg.Any<Couple>(), Arg.Any<CancellationToken>());
}
```

**Coverage target**: 90% line coverage, 85% branch coverage.

Run with coverage:
```bash
cd backend
dotnet test --collect:"XPlat Code Coverage" --results-directory TestResults
reportgenerator -reports:"TestResults/**/coverage.cobertura.xml" -targetdir:"coverage-report" -reporttypes:Html
```

## Backend Integration Tests

### Framework: WebApplicationFactory + In-Memory Database

The `SahaWebApplicationFactory` replaces:
- SQL Server → `UseInMemoryDatabase`
- Email service → NSubstitute mock (prevents real emails)
- Blob storage → NSubstitute mock

```csharp
public class AuthControllerTests : IClassFixture<SahaWebApplicationFactory>
{
    [Fact]
    public async Task Login_ShouldReturn200AndSetRefreshCookie_WhenValidCredentials()
    {
        // Register first
        await _client.PostAsJsonAsync("/api/v1/auth/register", BuildRegisterRequest("TEST-ID"));

        // Then login
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { username = "husband", password = "SecurePass@123!" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.Should().Contain(h =>
            h.Key == "Set-Cookie" && h.Value.Any(v => v.Contains("X-Refresh-Token")));
    }
}
```

### Test Database Isolation

Each `SahaWebApplicationFactory` instance uses a unique in-memory database name (`Guid.NewGuid()`), ensuring complete test isolation.

## Frontend Unit Tests

### Framework: Vitest + Testing Library + MSW

**Store tests**: Test Zustand stores directly without React rendering.
**Hook tests**: Use `renderHook` with a `QueryClientProvider` + `MemoryRouter` wrapper.
**Component tests**: Use `render` with testing-library, assert accessible elements.

```typescript
it('should not persist accessToken to localStorage', () => {
    useAuthStore.getState().setAuthData({ accessToken: 'secret', ... })

    const stored = localStorage.getItem('saha-auth')
    const parsed = JSON.parse(stored ?? '{}')
    expect(parsed?.state?.accessToken).toBeUndefined()
})
```

**Coverage target**: 90% line coverage, 85% branch coverage (enforced in `vite.config.ts`).

Run with coverage:
```bash
cd frontend
npm run test:coverage
open coverage/index.html
```

## E2E Tests (Playwright)

### Browser Matrix

| Project | Browser | Viewport |
|---|---|---|
| chromium | Chromium | 1280×720 |
| firefox | Firefox | 1280×720 |
| webkit | WebKit (Safari) | 1280×720 |
| mobile-chrome | Chromium | 375×667 (iPhone SE) |
| mobile-safari | WebKit | 375×667 (iPhone SE) |

### Test File Organization

```
tests/e2e/
├── auth/
│   ├── login.spec.ts           # Login form, validation, redirect
│   ├── register.spec.ts        # 4-step wizard, field validation
│   └── forgot-password.spec.ts # Code request, enumeration protection
└── dashboard/
    └── dashboard.spec.ts       # Auth guard, navigation, module links
```

### Smoke Tests

Tag critical-path tests with `@smoke` for post-deployment verification:

```typescript
test('can log in with valid credentials @smoke', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name=username]', process.env.E2E_USERNAME!)
    await page.fill('[name=password]', process.env.E2E_PASSWORD!)
    await page.click('button[type=submit]')
    await expect(page).toHaveURL('/dashboard')
})
```

Run smoke tests only:
```bash
npx playwright test --grep "@smoke"
```

### Page Object Pattern

For multi-step flows, use page objects:

```typescript
class RegisterPage {
    constructor(private page: Page) {}

    async fillStep1(data: { togetherId: string; password: string }) {
        await this.page.fill('[name=togetherId]', data.togetherId)
        await this.page.fill('[name=password]', data.password)
        await this.page.click('button:has-text("Next")')
    }
}
```

### Environment Variables for E2E

```bash
PLAYWRIGHT_BASE_URL=http://localhost:5173
E2E_HUSBAND_USERNAME=e2etesthusbnd
E2E_WIFE_USERNAME=e2etestwife
E2E_PASSWORD=E2ETestPass@123!
E2E_TOGETHER_ID=E2E-TEST01
```

## Test Data Strategy

- **Unit tests**: Fully self-contained, no shared fixtures
- **Integration tests**: Each test creates its own data via API calls (no shared database state)
- **E2E tests**: Seed a dedicated test couple via a setup fixture; tear down after the suite

```typescript
// playwright.config.ts global setup
async function globalSetup() {
    await registerTestCouple({
        togetherId: process.env.E2E_TOGETHER_ID!,
        husbandUsername: process.env.E2E_HUSBAND_USERNAME!,
        // ...
    })
}
```

---

## Comprehensive real-backend E2E suite (`frontend/tests/e2e/comprehensive/`)

This suite drives the **real** backend end to end and replaces the now-stale `tests/e2e/real`
fixtures (which still used the pre-redesign two-partner `POST /auth/register` payload and the old
`Shared Password` login label). It covers auth, navigation, connect, messaging, profile,
dashboard/settings, and carries a regression test for every fixed bug (see `testing/BUGS.md`).

### 1. Start the backend (isolated test DB, relaxed rate limiter)

```bash
cd backend/src/Saha.API
ASPNETCORE_ENVIRONMENT=IntegrationTest \
ASPNETCORE_URLS="https://localhost:7001;http://localhost:5001" \
dotnet run --no-launch-profile
```

### 2. Run the suite (Vite is started automatically with registration enabled)

```bash
cd frontend
npx playwright test --config playwright.comprehensive.config.ts          # all specs
npx playwright test --config playwright.comprehensive.config.ts auth.spec.ts   # one feature
npx playwright test --config playwright.comprehensive.config.ts regression.spec.ts  # fixed-bug guards
```

The config pins the browser timezone to `Asia/Kolkata (+05:30)` so the timestamp bug (BUG-001) is
reproducible on any runner, including a UTC CI box.

### 3. Creating & resetting test data

- Every test **self-seeds** a fresh, randomized couple through the real
  `register → invite → accept` flow (`tests/e2e/comprehensive/fixtures.ts`). Nothing is shared, so the
  suite is safe to re-run without cleanup.
- For a stable roster to click through by hand: `npm run seed:e2e` (or `npm run seed:e2e:connect`).
- To reset: stop the backend and delete `backend/src/Saha.API/saha-integration-test.db*`; the schema
  is recreated on next start.

### 4. Viewing results, traces & the executive report

```bash
npx playwright show-report playwright-report-comprehensive   # Playwright HTML report
npx playwright show-trace test-results/<failed-test>/trace.zip
```

- **Executive HTML report:** open `reports/e2e-product-quality-report.html` (self-contained; light/dark).
- **Detailed artifacts:** `testing/` — `EXECUTION_SUMMARY.md`, `BUGS.md`, `COVERAGE_MATRIX.md`,
  `COMPONENT_INVENTORY.md`, `TEST_PLAN.md`, `TEST_USERS.md`, `PRODUCT_MAP.md`.

### 5. CI

The config runs headless, single-worker, Chromium-only, and starts its own Vite server
(`reuseExistingServer` locally). Point it at a deployed target with `PLAYWRIGHT_BASE_URL`.
