# REPO — Project Orientation

## Purpose
**Saha** ("togetherness") is a couples application: one shared account per couple with two identities (Husband/Wife). It gives a couple a shared digital home. Currently the fully-implemented domains are authentication, couple-to-couple connections, and profiles; other modules (finance, memories, goals, messages, calendar, settings) are routed but rendered as "coming soon" placeholders. (Verified: `frontend/src/modules/*/pages/*` use `ComingSoonModule`.)

## Architecture style
- **Backend:** Clean / Onion Architecture with CQRS. Four projects: Domain → Application → Infrastructure → API (dependencies point inward). MediatR mediates commands/queries; cross-cutting concerns are MediatR pipeline behaviors.
- **Frontend:** Modular feature-folder SPA. `core` (client infra) + `shared` (cross-feature UI/state) + `modules` (features). Server state via TanStack Query; minimal client state via Zustand.

## Tech stack (verified from manifests)
| Concern | Technology |
|---|---|
| Frontend | React 19, Vite 6, React Router v7, TypeScript 5.7 |
| Styling | Tailwind CSS v3 + shadcn/ui (Radix primitives) |
| FE state | TanStack Query v5 (server), Zustand 5 (client) |
| FE forms/validation | react-hook-form + zod |
| Backend | ASP.NET Core 9, MediatR 12 (CQRS), FluentValidation |
| ORM | Entity Framework Core 9 |
| DB (local) | SQLite (auto-created, `EnsureCreated`) |
| DB (prod) | Azure SQL Serverless (EF migrations) |
| Auth | JWT Bearer access token + HttpOnly refresh cookie; Bcrypt password hashing |
| Observability | Serilog, OpenTelemetry → Grafana (Loki/Tempo/Mimir), App Insights optional |
| Email | Console (`NullEmailService`) local / SMTP prod |
| Blob storage | Placeholder (`NullBlobStorageService`) local / Azure Blob prod |
| IaC / Hosting | Azure Bicep; App Service (API) + Static Web Apps (FE) |
| CI/CD | GitHub Actions (`ci.yml`, `cd.yml`, `pr-check.yml`) |

## Build / test / deploy
- **Backend:** `cd backend/src/Saha.API && dotnet run` → `https://localhost:7001` (Swagger in Development). Tests: `dotnet test` (4 test projects: Domain/Application/Infrastructure/API).
- **Frontend:** `cd frontend && npm install && npm run dev` → `http://localhost:5175`. `npm test` (Vitest), `npm run test:e2e` (Playwright), `npm run lint`, `npm run type-check`.
- **Deploy:** GitHub Actions build/test on PR; `cd.yml` deploys to Azure. Infra provisioned via `infrastructure/bicep/main.bicep`.

## Top-level layout
| Path | Role |
|---|---|
| `backend/src/Saha.Domain` | Entities, value objects, domain events, domain interfaces. No external deps. |
| `backend/src/Saha.Application` | CQRS handlers, validators, DTOs, pipeline behaviors, app-level interfaces. |
| `backend/src/Saha.Infrastructure` | EF Core, repositories, migrations, JWT/email/blob/hashing services. |
| `backend/src/Saha.API` | ASP.NET Core Web API: controllers, middleware, DI wiring, `Program.cs`. |
| `backend/tests/*` | xUnit test projects mirroring each layer. |
| `frontend/src` | React SPA (`app`, `core`, `shared`, `modules`). |
| `frontend/tests/e2e` | Playwright end-to-end specs. |
| `infrastructure/` | Azure Bicep modules + deployment scripts. |
| `docs/` | Full prose docs (architecture, DB, deployment, testing, telemetry). |
| `progress/` | Task/progress tracking notes (active/completed/templates). |
| `.github/workflows/` | CI/CD pipelines. |

## Key design principles (visible in code)
- Dependencies point inward; Domain is dependency-free.
- Rich domain model: entities have private setters and static factory methods that enforce invariants (`Couple.Register`, `Partner.Create`, `CoupleConnection.CreateRequest`).
- CQRS: every use case is a `Command`/`Query` + `Handler` (+ optional `Validator`).
- Local-first dev: SQLite + Null services mean zero external infra to run locally. Real implementations swap in when config is present (see `Infrastructure/DependencyInjection.cs`).
- Config-driven service selection (SMTP/Blob/DB provider chosen at runtime from configuration).

## Assumptions & constraints
- Exactly two partners per couple, roles fixed to Husband/Wife (`PartnerRole` enum).
- One password per couple (shared account), not per partner.
- Access token TTL 15 min (`Jwt:AccessTokenTtlMinutes`), refresh TTL 30 days (`Jwt:RefreshTokenTtlDays`) — configurable.
- Refresh cookie is scoped to path `/api/v1/auth`, `HttpOnly`, `Secure`, `SameSite=Strict`.

## Entry points
- **API:** `backend/src/Saha.API/Program.cs` (Serilog bootstrap → DI → middleware pipeline → `MapControllers`; `/health` anonymous).
- **Frontend:** `frontend/src/main.tsx` → `app/App.tsx` (providers) → `app/router/router.tsx` (routes).
