# CONVENTIONS — How Code Is Written

> Authoritative prose: `docs/development/CODING_STANDARDS.md`. This is the high-signal summary.

## Backend (C# / .NET)
### Organization
- Four projects by Clean Architecture layer (`Saha.Domain/Application/Infrastructure/API`). Dependencies point inward.
- **Feature-per-folder CQRS:** `Application/Features/<Domain>/{Commands,Queries}/<UseCase>/` containing `<UseCase>Command|Query.cs`, `<UseCase>Handler.cs`, and optional `<UseCase>Validator.cs`.
- DI registration grouped in `DependencyInjection.cs` (per project) + `Saha.API/Extensions/*`.

### Naming
- Commands/Queries: `<Verb><Noun>Command` / `<Get|Search><Noun>Query`; handlers `…Handler`; validators `…Validator`; results `…Result` / `…Dto`.
- Entities `sealed`; aggregates extend `AggregateRoot`, others `Entity`. Enums are PascalCase (`PartnerRole`, `ConnectionRequestStatus`).
- Value objects are `sealed record` with a private ctor + static `Create(...)` factory and implicit `string` conversion.
- Interfaces `I…`; repositories `I<Entity>Repository` in `Domain/Interfaces/Repositories`.

### Patterns
- **Rich domain model:** private setters; state changes only via entity methods (`Couple.Register`, `Partner.UpdateProfile`, `CoupleConnection.Accept`). Invariants throw `DomainException`/`DomainValidationException`.
- **Controllers are thin:** `[ApiController]`, inherit `ApiControllerBase` (`[Authorize]`), build a Command/Query (pulling `CoupleId`/`PartnerId` from `ICurrentUserContext`), call `Sender.Send`, shape response. Opt out of auth with `[AllowAnonymous]`.
- **Cross-cutting via MediatR behaviors** (Logging → Validation → Performance), not per-handler code.
- **Domain events** raised in entities, dispatched by `DomainEventDispatchInterceptor` on `SaveChanges`.
- **Value objects self-validate**; validators + domain both enforce rules (defense in depth).

### Error handling & logging
- Throw typed exceptions; `ExceptionHandlingMiddleware` maps them to `ErrorResponse{code,message,errors?}` (see API.md). Never return raw 500s with detail.
- `>=500` logged as Error, handled exceptions as Warning.
- Serilog structured logging; enrich with machine/environment.

### API response & error format
- Success DTOs are `sealed record`s. Errors always `{ code, message, errors|null }`, camelCase JSON. HTTP status per exception type.
- Route template `api/v{version:apiVersion}/[controller]`; default version 1.0.

### Config & environment
- Config via `IConfiguration` keys: `Jwt:*`, `ConnectionStrings:DefaultConnection`, `Smtp:*`, `AzureStorage:ConnectionString`, `Cors:AllowedOrigins`, `Grafana:*`, `ApplicationInsights:ConnectionString`.
- **Runtime feature selection:** presence/shape of a config value picks the implementation (SQLite vs SqlServer; Null vs SMTP/Azure Blob; OTel on/off). Placeholder guards: values starting `REPLACE_` or `UseDevelopmentStorage=true` count as "not configured".

## Frontend (TypeScript / React)
### Organization
- `app` (bootstrap/router) · `core` (client infra: api, types, telemetry, constants, utils) · `shared` (cross-feature components/stores/hooks) · `modules/<feature>` (`pages/`, `components/`, `hooks/`, `schemas/`).
- Path alias `@/` → `src/` (imports like `@/shared/...`, `@/core/...`, `@/modules/...`).

### Naming
- Components PascalCase (`ProtectedRoute.tsx`); hooks `useX`; Zustand stores `useXStore` in `*.store.ts`; API clients `<domain>.api.ts`; zod schemas in `schemas/`.
- Tests colocated in `__tests__/` (Vitest) or `frontend/tests/e2e/` (Playwright).

### Patterns
- **Server state → TanStack Query** (keys centralized in `core/constants/query-keys.ts`); **client state → Zustand** (`auth`, `theme`, `partner-view`).
- All backend calls go through `apiClient` (`core/api/axios-instance.ts`): injects bearer token + `traceparent`, transparently refreshes on 401 with a single-flight queue.
- Routing guards: `GuestRoute` (unauth-only), `ProtectedRoute` (auth-required); layouts `AuthLayout` / `AppLayout`.
- Unbuilt features render `ComingSoonModule`.
- Forms: react-hook-form + zod resolver.

### Error handling
- `core/utils/error.utils.ts` normalizes API errors; user feedback via toast (`shared/hooks/use-toast.ts`, `Toaster`).

## Testing conventions
- **Backend:** xUnit projects mirror layers (`Saha.{Domain,Application,Infrastructure,API}.Tests`); API tests use `WebApplicationFactory` (`Program` is `partial` for this) with an `IntegrationTest` environment.
- **Frontend:** Vitest + Testing Library (unit), Playwright (e2e, folders per module), MSW for mocking.

## Glossary
| Term | Meaning |
|---|---|
| **Couple** | The shared account aggregate; one login, two partners. |
| **Partner** | One person in a couple; `Role` = Husband or Wife. |
| **TogetherID** | Public unique couple identifier (uppercase, hyphen-allowed). |
| **Connection** | A pending/accepted/rejected link between two couples. |
| **Partner View** | Client-side "view as my partner" UI mode (no backend effect). |
| **Access token** | Short-lived JWT (in-memory) for API auth. |
| **Refresh token** | Long-lived opaque token in HttpOnly cookie; hashed at rest. |
| **Null service** | Local no-op impl of an interface (`NullEmailService`, `NullBlobStorageService`). |
| **Behavior** | MediatR pipeline step (Logging/Validation/Performance). |
