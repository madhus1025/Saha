# ARCHITECTURE — Structure & Flows

## Style & layering (backend)
Clean Architecture with CQRS. Dependency direction is strictly inward:

```
API  ──►  Application  ──►  Domain
  └──►  Infrastructure  ──►  Domain
Infrastructure implements interfaces declared in Domain & Application.
```

- **Domain** (`Saha.Domain`): entities (`Couple`, `Partner`, `CoupleConnection`, `RefreshToken`, `PasswordResetToken`, `AuditLog`), value objects (`TogetherID`, `Username`, `EmailAddress`, `PhoneNumber`), domain events, `IDomainEvent`, repository & service interfaces. No framework dependencies.
- **Application** (`Saha.Application`): MediatR handlers under `Features/<Domain>/{Commands,Queries}`, FluentValidation validators, DTOs, pipeline behaviors, and interfaces (`IApplicationDbContext`, `ITokenService`, `IEmailService`, `IBlobStorageService`, `ICurrentUserContext`, `IAuditLogger`).
- **Infrastructure** (`Saha.Infrastructure`): EF Core `ApplicationDbContext`, entity configurations, migrations, repositories, and concrete services (`JwtTokenService`, `BcryptPasswordHasher`, `Smtp/NullEmailService`, `Azure/NullBlobStorageService`, `AuditLoggerService`, `DateTimeProvider`).
- **API** (`Saha.API`): controllers, middleware, DI extensions, `Program.cs`.

## Backend request lifecycle
```
HTTP request
  → ExceptionHandlingMiddleware (maps exceptions → ErrorResponse JSON)
  → HttpsRedirection → (StaticFiles for /uploads in dev)
  → SecurityHeaders → CORS("AllowFrontend") → RateLimiter
  → Authentication (JWT Bearer) → Authorization
  → CurrentUserContextMiddleware (populates ICurrentUserContext from claims)
  → Controller action  → Sender.Send(command/query)   [MediatR]
      → LoggingBehavior → ValidationBehavior → PerformanceBehavior → Handler
      → Handler uses repositories / IApplicationDbContext / services
      → SaveChanges → interceptors fire (audit + domain-event dispatch)
  → IActionResult → JSON response
```
Controllers are thin: they build a Command/Query from the request + `ICurrentUserContext`, call `Sender.Send`, and shape the response. Base class `ApiControllerBase` is `[ApiController][Authorize]`; endpoints opt out with `[AllowAnonymous]`.

### MediatR pipeline behaviors (order in `Application/Common/Behaviors`)
- `LoggingBehavior` — request/response logging.
- `ValidationBehavior` — runs FluentValidation validators; throws `ApplicationValidationException` (→ 400).
- `PerformanceBehavior` — warns on slow requests.

### Persistence interceptors (`Infrastructure/Persistence/Interceptors`)
- `AuditableEntityInterceptor` — stamps `CreatedAt`/`UpdatedAt`.
- `DomainEventDispatchInterceptor` — dispatches queued domain events on `SaveChanges`.

## Frontend flow
```
main.tsx → App.tsx (QueryClientProvider, Router, Toaster, providers)
  → router.tsx
      GuestRoute → AuthLayout → {Login, Register, Forgot/ResetPassword}
      ProtectedRoute → AppLayout(Sidebar+TopBar) → {Dashboard, Profile, Connect, …placeholders}
Pages/hooks → core/api/*.api.ts → apiClient (axios) → backend
Server state cached by TanStack Query (keys in core/constants/query-keys.ts)
Client state in Zustand: auth.store, partner-view.store, theme.store
```

## Authentication & authorization flow
1. **Login/Register** (`AllowAnonymous`, `auth` rate limiter): handler validates couple, issues **access token** (JWT, ~15 min) + **refresh token** (opaque, hashed at rest, ~30 days).
2. Access token returned in body → stored **in memory** in `auth.store` (Zustand). Refresh token set as **HttpOnly `X-Refresh-Token` cookie** scoped to `/api/v1/auth`.
3. `axios-instance.ts` request interceptor attaches `Authorization: Bearer <accessToken>` and a `traceparent` header.
4. On **401**, the response interceptor calls `POST /auth/refresh` (cookie sent automatically), swaps in a new access token, and replays the original request. Concurrent 401s are queued. If refresh fails → `auth.store.logout()`.
5. Backend validates JWT (issuer/audience/lifetime, 30s clock skew); expired tokens get an `X-Token-Expired: true` response header. `CurrentUserContextMiddleware` exposes `CoupleId`/`PartnerId` from claims (`sub` = PartnerId).
6. **Logout** revokes the refresh token and deletes the cookie. Password change/deactivate revoke **all** refresh tokens.

## Data flow between layers
Request DTO → Command/Query → Handler loads aggregate via repository → aggregate method enforces invariants & raises domain events → `SaveChanges` (interceptors audit + dispatch events) → result DTO → controller → JSON.

## Background jobs / queues / caching
- **No message queue or background worker** found. Domain events are dispatched **synchronously** within `SaveChanges` (in-process).
- **Caching:** no server-side cache layer found. Frontend caches server state via TanStack Query.
- **Rate limiting** (fixed-window, `ServiceCollectionExtensions`): `auth` 5/min, `api` 100/min, `telemetry` 60/min.

## Observability
- **Backend:** Serilog (console + optional Grafana Loki + optional App Insights). OpenTelemetry traces→Tempo and metrics→Mimir via OTLP when `Grafana:OtlpEndpoint` is set; custom `Saha.Auth` meter (`AuthMetrics`).
- **Frontend:** OpenTelemetry web SDK; `traceparent` propagated to backend to link browser and server spans. Frontend telemetry batches POST to `/api/v1/telemetry/events`.
- See `docs/telemetry/TELEMETRY.md`.

## Dependency direction & key contracts
- Domain defines `ICoupleRepository`, `IConnectionRepository`, `IAuditLogRepository`, `IPasswordHasher`, `IDateTimeProvider`.
- Application defines `IApplicationDbContext`, `ITokenService`, `IEmailService`, `IBlobStorageService`, `ICurrentUserContext`, `IAuditLogger`.
- Infrastructure supplies all implementations; concrete choice (SQLite vs SQL Server, Null vs SMTP/Azure) is made at runtime from configuration in `Infrastructure/DependencyInjection.cs`.

## High-risk areas / failure points
- **Token refresh race** — `axios-instance.ts` single-flight queue; a bug here breaks session continuity across concurrent requests.
- **Config-driven service selection** — a wrong/placeholder connection string silently falls back to Null/SQLite services (see the `REPLACE_`/`UseDevelopmentStorage` guards). Prod misconfig can go unnoticed.
- **Schema init divergence** — dev/IntegrationTest use `EnsureCreated` (SQLite, from model); prod uses `Migrate` (SQL Server, from migrations). Model changes must be captured as migrations or prod drifts.
- **Refresh cookie path** — cookie is scoped to `/api/v1/auth`; changing the API version prefix breaks refresh.
- **Shared-account model** — one password/refresh-token set per couple; revoking on password change logs out both partners.

## Cannot be determined from codebase
- Real-time features (websockets/SignalR) — none found.
- Production runtime scaling/limits beyond Bicep definitions.
