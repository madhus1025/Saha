# FOLDERS — Directory Map

## Backend (`backend/src`)

| Directory | Responsibility | Depends on | Modify when… / Avoid when… |
|---|---|---|---|
| `Saha.Domain/Entities` | Aggregates & entities; invariants in static factories + methods | (nothing) | Modify to change business invariants. **Don't** add EF/framework code here. |
| `Saha.Domain/ValueObjects` | `TogetherID`, `Username`, `EmailAddress`, `PhoneNumber` — self-validating records | — | Modify to change format rules. |
| `Saha.Domain/Events` | Domain events + `IDomainEvent`/`DomainEvent` base | — | Add when an aggregate must signal a side effect. |
| `Saha.Domain/Interfaces` | Repository & domain-service contracts | — | Add a contract before its Infrastructure impl. |
| `Saha.Domain/Enums`, `Exceptions` | `PartnerRole`, `ConnectionRequestStatus`; `DomainException`/`DomainValidationException` | — | — |
| `Saha.Application/Features/<Domain>` | CQRS: `Commands/`, `Queries/`, each with Command/Query + Handler (+ Validator) | Domain | **Primary place to add a use case.** |
| `Saha.Application/Common/Behaviors` | MediatR pipeline (Logging, Validation, Performance) | MediatR | Rarely — cross-cutting request concerns only. |
| `Saha.Application/Common/Interfaces` | App-level service contracts | Domain | Add when a handler needs infra it shouldn't reference directly. |
| `Saha.Application/Common/Exceptions` | App exceptions (Validation/NotFound/Unauthorized/Forbidden/Conflict) | — | Map new HTTP semantics here + in `ExceptionHandlingMiddleware`. |
| `Saha.Application/Telemetry` | `AuthMetrics` (OTel meter) | OTel | — |
| `Saha.Infrastructure/Persistence` | `ApplicationDbContext`, `Configurations/`, `Migrations/`, `Interceptors/`, `Repositories/` | Domain, App, EF Core | Modify for schema, mapping, repository queries. Add a migration on schema change. |
| `Saha.Infrastructure/Services` | `Auth/` (JWT, Bcrypt), `Email/`, `Storage/`, `AuditLoggerService`, `DateTimeProvider` | App/Domain interfaces | Modify concrete infra behavior. |
| `Saha.API/Controllers` | Thin HTTP endpoints; build Command/Query, call `Sender` | Application | Add endpoint here **after** its handler exists. |
| `Saha.API/Middleware` | `ExceptionHandlingMiddleware`, `CurrentUserContextMiddleware` | — | Modify pipeline-level behavior. |
| `Saha.API/Extensions` | `ServiceCollectionExtensions` (auth, CORS, rate limit, versioning, Swagger, OTel), `ApplicationBuilderExtensions` (security headers) | — | Modify DI/pipeline registration. |

## Frontend (`frontend/src`)

| Directory | Responsibility | Depends on | Modify when… |
|---|---|---|---|
| `app` | Bootstrap: `App.tsx` (providers), `router/router.tsx` (routes), `globals.css` | modules, shared | Add a route; change providers. |
| `core/api` | Typed API clients per domain (`auth`, `connect`, `profile`, `telemetry`) + `axios-instance.ts` (interceptors, refresh) | shared/stores | Add/modify backend calls. |
| `core/types` | `api.types.ts` — shared API DTO types | — | Keep in sync with backend DTOs. |
| `core/telemetry` | OTel setup, event defs, telemetry service | — | Instrumentation changes. |
| `core/constants` | `query-keys.ts` (TanStack Query keys) | — | Add a query key when adding server state. |
| `core/utils` | `cn.ts` (class merge), `error.utils.ts` | — | — |
| `shared/components/layout` | `AppLayout`, `AuthLayout`, `Sidebar`, `TopBar`, `ProtectedRoute`, `GuestRoute`, `PartnerViewBanner` | stores | Layout/navigation/route-guarding. |
| `shared/components/ui` | shadcn-style primitives (`Button`, `Card`, `Input`, `Avatar`, `CoupleAvatar`, `Toaster`) | Radix | Add shared UI primitives. |
| `shared/components/feedback` | `NotFoundPage`, `ComingSoonModule` | — | Placeholder pages. |
| `shared/stores` | Zustand: `auth.store`, `partner-view.store`, `theme.store` | — | Client-side global state. |
| `shared/hooks` | `use-toast.ts` | — | Shared hooks. |
| `modules/<feature>` | Feature slice: `pages/`, `components/`, `hooks/`, `schemas/` | core, shared | **Primary place to build a feature.** |

**Implemented modules:** `auth`, `dashboard`, `profile`, `connect`.
**Placeholder modules** (render `ComingSoonModule`): `finance`, `memories`, `goals`, `messages`, `calendar`, `settings`.

## Repo-level
| Directory | Role |
|---|---|
| `infrastructure/bicep` | `main.bicep` + `modules/` (app-service-plan, web-app, static-web-app, sql-server, storage-account, key-vault). |
| `infrastructure/scripts` | Deployment helper scripts. |
| `docs/` | Prose docs: `architecture/`, `development/`, `deployment/`, `testing/`, `telemetry/`, `api/`, `database/`, `diagrams/`. |
| `progress/` | Task tracking (`active/`, `completed/`, `templates/`). |
| `.github/workflows` | `ci.yml`, `cd.yml`, `pr-check.yml`. |
