---
name: tdd-implement
description: Implement a production-ready feature TDD in the Saha repository using strict test-first, chunked delivery. Use when a feature has a TDD/spec under features/ or an equivalent approved design, and Claude should execute it end-to-end while maintaining progress/active tracking, STATUS.md, failing-first tests, evidence, and repository-specific backend/frontend conventions.
---

# TDD Implement (Saha)

Implement an approved Technical Design Document (TDD) as small, verifiable vertical slices in the Saha repo. The upstream `review-spec` skill produces the TDD; this skill executes it.

The goal is not only to finish code. The goal is to leave the repository in a state where another AI session can resume cold from `progress/active/<slug>-progress.md` and know exactly what changed, what passed, and what remains.

Saha is a couples app: one account is a **Couple** aggregate with two **Partners** (Husband/Wife), a public **TogetherID**, and **Connections** between couples. Every change must respect the existing Clean Architecture (.NET 9 + React 19) and the conventions in `.ai/CONVENTIONS.md`.

## Non-Negotiables

- Follow `.ai/CONVENTIONS.md`, `docs/ai-first-development-workflow.md`, `docs/development/CODING_STANDARDS.md`, and `docs/development/TESTING_GUIDE.md`. On conflict, `.ai/` is the high-signal source of truth for patterns.
- Never invent product behavior. If the TDD is silent or ambiguous on a product decision, stop and ask a concise question rather than guessing.
- Progress lives in `progress/active/<slug>-progress.md`, not `features/`.
- Update `progress/STATUS.md` when starting or completing a feature.
- Work test-first. New tests must fail for the expected reason before implementation.
- Implement one chunk at a time. Do not start the next chunk until the current chunk's relevant tests are green and progress is updated.
- Preserve dependency direction: `Saha.Domain` ◄ `Saha.Application` ◄ `Saha.API`; `Saha.Infrastructure` implements Domain/Application interfaces. Frontend feature code lives under `frontend/src/modules/<module>/`.
- Commit or push only if the user explicitly asks.

## First Read

Start from `.ai/AI_INDEX.md` — it routes you to the right doc per task. Then read the local context you actually need:

- `.ai/AI_INDEX.md`, `.ai/CONVENTIONS.md`, `.ai/ARCHITECTURE.md`, `.ai/FEATURES.md`, `.ai/FOLDERS.md`
- `progress/STATUS.md` and any matching `progress/active/<slug>-*.md`
- the TDD, usually `features/<slug>.tdd.md`, and the source spec if linked, usually `features/<slug>.spec`
- deeper prose only when a chunk needs it: `docs/architecture/ARCHITECTURE_OVERVIEW.md`, `docs/development/CODING_STANDARDS.md`, `docs/development/TESTING_GUIDE.md`, `docs/architecture/DATABASE_SCHEMA.md`
- the closest existing feature to mirror — grep both stacks for it:
  - backend: `backend/src/Saha.Application/Features/Connect`, `backend/src/Saha.API/Controllers/ConnectController.cs`, `backend/src/Saha.API/Controllers/ApiControllerBase.cs`
  - frontend: `frontend/src/modules/connect`, `frontend/src/core/api/connect.api.ts`, `frontend/src/core/constants/query-keys.ts`, `frontend/src/app/router/router.tsx`

Read more files only as needed.

## Setup Or Resume

Determine the slug from the TDD or filename.

If `progress/active/<slug>-progress.md` exists:

- Read it first.
- Resume from `Current Focus / Next Step`.
- Verify whether the stated current state is still true by inspecting files and, when practical, running targeted tests. Never trust the tracker over the code.

If no progress files exist:

- Create `progress/active/<slug>-brief.md` from `progress/templates/feature-brief-template.md`.
- Create `progress/active/<slug>-progress.md` from `progress/templates/feature-progress-template.md`.
- Fill both from the TDD and source spec. Do not invent product behavior.
- Mark the brief `Approved` only when the TDD says it is ready and there are no blocking product questions; otherwise mark `Draft` and ask concise questions.
- Add or update the feature row in `progress/STATUS.md` to 🟡 In Progress.

## Chunk Plan

Break the TDD into small vertical chunks. Prefer chunks that carry a thin behavior through domain → API → frontend → tests, rather than building a whole layer before the next.

For Saha, typical ordering is:

1. Domain invariants, entity methods, and value objects.
2. Application commands/queries, handlers, and FluentValidation validators.
3. Infrastructure repositories, EF configuration, DbContext updates, migrations.
4. API endpoints and integration tests.
5. Frontend API client, types, Zod schemas, and query hooks.
6. Frontend pages/components and their loading/empty/error/pending states.
7. E2E smoke flow and final polish.

For each chunk, record in the progress file:

- scope
- files likely touched
- acceptance criteria covered
- tests to write
- commands to run
- definition of done

## Baseline

Before changing feature code, run the smallest useful baseline and paste results into progress.

```bash
cd backend && dotnet test
cd frontend && npm run type-check && npm run lint && npm run test
```

For UI or routing work, also run a fast E2E baseline when practical:

```bash
cd frontend && npm run test:e2e -- --project=chromium
```

If baseline is already failing, document the failure in progress and clearly distinguish pre-existing failures from new work. Do not "fix" unrelated red tests as part of this feature unless the TDD asks for it.

## Per-Chunk Loop

For the current chunk only:

1. Update `Current Focus / Next Step` in `progress/active/<slug>-progress.md`.
2. Write or update tests first.
3. Run the targeted test command and confirm failure for the intended reason (assertion failure, not a compile/import error you overlooked).
4. Implement the minimum production code needed.
5. Run targeted tests until green.
6. Run a relevant smoke/regression command for previously completed chunks.
7. Update the progress file with: tests added or changed, command output summary, files changed, decisions and gotchas, and the next exact step.
8. Only then move to the next chunk.

Do not mark checklist items complete without evidence.

## Backend Rules

Mirror the existing Clean Architecture + CQRS style; when in doubt copy the closest `Features/<X>` folder.

- **Domain**
  - entities are `sealed` with private setters; state changes only through methods (e.g. `Couple.Register`, `CoupleConnection.Accept`) that enforce invariants.
  - aggregates extend `AggregateRoot`; other entities extend `Entity`.
  - value objects are `sealed record` with a private ctor + static `Create(...)` factory, self-validating, with implicit `string` conversion where the existing ones have it (`TogetherID`, `Username`, `EmailAddress`, ...). Prefer a value object over a raw string for any constrained field.
  - invariants throw `DomainException` / `DomainValidationException`.
  - domain events are records raised inside entities; they are dispatched by `DomainEventDispatchInterceptor` on `SaveChanges`. Use them for side effects (audit, email) instead of inlining side effects in handlers.
  - no EF, ASP.NET, JSON, Infrastructure, or Application references.
- **Application**
  - CQRS folders under `Saha.Application/Features/<Feature>/{Commands|Queries}/<UseCase>/` with `<UseCase>Command|Query.cs`, `<UseCase>Handler.cs`, and usually `<UseCase>Validator.cs`.
  - commands/queries, DTOs, and results are `sealed record`; name `<Verb><Noun>Command` / `<Get|Search><Noun>Query`, results `...Result`/`...Dto`.
  - handlers inject interfaces and pass `CancellationToken`; throw typed exceptions instead of returning error codes.
  - validation uses FluentValidation. The MediatR validation behavior runs validators automatically (Logging → Validation → Performance) — don't hand-roll validation inside handlers.
- **Infrastructure**
  - repositories implement `I<Entity>Repository` from `Domain/Interfaces/Repositories`.
  - EF configuration uses `IEntityTypeConfiguration<T>` under `Persistence/Configurations`.
  - `AuditableEntityInterceptor` stamps `CreatedAt`/`UpdatedAt` — never set them manually.
  - new entities/columns require an EF Core migration when production persistence changes.
  - follow the Null-service / config-presence pattern for any new external dependency (real vs `Null*` chosen by config shape) so local dev works without cloud services.
- **API**
  - controllers inherit `ApiControllerBase` (`[ApiController][Authorize]`), pull `CoupleId`/`PartnerId` from `ICurrentUserContext`, build a Command/Query, call `Sender.Send`, and shape the response. Route `api/v{version:apiVersion}/[controller]`; `[AllowAnonymous]` to opt out. No business logic in controllers.
  - errors: throw typed exceptions; `ExceptionHandlingMiddleware` maps them to `{ code, message, errors|null }` (camelCase). Specify the exception type and resulting HTTP status per failure in the TDD/tests — never leave a raw 500.

Backend tests (solution: `backend/Saha.sln`):

- Domain tests in `backend/tests/Saha.Domain.Tests`
- Application tests in `backend/tests/Saha.Application.Tests`
- Repository/infrastructure tests in `backend/tests/Saha.Infrastructure.Tests`
- API integration tests in `backend/tests/Saha.API.Tests`

## Frontend Rules

Follow the existing module style (`app` · `core` · `shared` · `modules/<feature>`).

- Place feature UI under `frontend/src/modules/<module>/` (`pages/`, `components/`, `hooks/`, `schemas/`). Replace the `ComingSoonModule` stub when graduating a module and wire the route in `frontend/src/app/router/router.tsx`.
- All API calls go through `apiClient` in `frontend/src/core/api/axios-instance.ts` (it injects the bearer token + `traceparent` and handles 401 refresh). New endpoints get a `<domain>.api.ts` client.
- Server state uses TanStack Query with keys centralized in `frontend/src/core/constants/query-keys.ts`. Client-only UI state uses Zustand (`useXStore` in `*.store.ts`) — never store server data in Zustand.
- Forms use React Hook Form plus Zod resolvers. Use `@/` imports, existing shared shadcn/ui components, and lucide-react icons.
- Include loading, empty, error, disabled, and optimistic/pending states, plus mobile layout, where relevant.
- For visual features, verify desktop and mobile layouts with Playwright or screenshots when practical.

Frontend tests:

- Vitest and Testing Library for hooks/components.
- MSW or existing test utilities for API-bound behavior.
- Playwright under `frontend/tests/e2e/<module>/` for critical flows; tag critical paths with `@smoke`.

## Verification Commands

Use targeted commands during chunks. At completion, run the full relevant suite:

```bash
cd backend && dotnet test
cd frontend && npm run type-check && npm run lint && npm run test:coverage
cd frontend && npm run test:e2e -- --project=chromium
```

For backend coverage when needed:

```bash
cd backend && dotnet test --collect:"XPlat Code Coverage"
```

Paste concise evidence into the progress file. Include failing output too if blocked.

## Completion

A feature is complete only when:

- all TDD acceptance criteria are implemented, and each has automated coverage
- backend tests pass
- frontend type-check, lint, and tests pass when frontend changed
- E2E chromium passes for user-facing flows
- a migration exists for any persistence change
- docs/status/progress are updated
- `progress/STATUS.md` shows the feature ✅ Done and points to the completed files
- `progress/active/<slug>-brief.md` and the progress file are moved to `progress/completed/`

Final response to the user should summarize:

- chunks completed
- key files changed
- verification commands and results
- any residual risks or deferred work
