# Saha — AI-First Development Workflow

This repository is designed to be **primarily developed and extended by AI agents**.
The goal is a strong, repeatable harness so that in every future session — by any
AI — new features can be added reliably, consistently with the project theme, at
high quality, and with minimal human oversight.

This document is the **mandatory workflow**. It is the contract every AI session
follows. The mechanics of the tracking files live in
[`../progress/README.md`](../progress/README.md); start a session at
[`../progress/STATUS.md`](../progress/STATUS.md).

---

## Core Principles

- This repo is developed mostly by AI agents. Optimize for **resumability** and
  **consistency**, not for one clever session.
- Every UI-related feature **must** follow a **test-first + evidence-based** workflow.
- Progress is tracked in files (`progress/`) so work can be paused and resumed
  across sessions without losing context.
- The project theme, design patterns, naming conventions, architecture, and code
  style are respected at all times — see
  [`development/CODING_STANDARDS.md`](./development/CODING_STANDARDS.md) and
  [`architecture/ARCHITECTURE_OVERVIEW.md`](./architecture/ARCHITECTURE_OVERVIEW.md).

---

## First Action in Every New Session

Before doing any feature work:

1. **Explore** the repository structure.
2. **Read the key files:**
   - [`README.md`](../README.md)
   - [`architecture/ARCHITECTURE_OVERVIEW.md`](./architecture/ARCHITECTURE_OVERVIEW.md)
   - [`development/CODING_STANDARDS.md`](./development/CODING_STANDARDS.md)
   - [`development/TESTING_GUIDE.md`](./development/TESTING_GUIDE.md)
   - [`../progress/STATUS.md`](../progress/STATUS.md) and any `progress/active/*` files
3. **Understand current state:** tech stack, testing setup, what's built vs. stubbed,
   and the overall theme/vibe of the project.

---

## Project Theme (the "vibe" to respect)

Saha is a warm, intimate **digital home for couples**: *one account, two
identities, infinite moments*. UI is built with React 19 + Tailwind + shadcn/ui
+ Framer Motion. Features are organized as **feature modules** under
`frontend/src/modules/<module>/`. The backend is **Clean Architecture**
(Domain → Application → Infrastructure → API) with CQRS via MediatR.

When adding a feature, **mirror an existing, fully-built module** rather than
inventing new patterns:
- Frontend reference: `frontend/src/modules/connect/` (real pages, hooks, API, types).
- Backend reference: the `Auth` feature folder (`Features/Auth/...`).

---

## Mandatory Workflow for Every Feature / Enhancement / UI Change

### 1. Review Spec & Generate Clarity
- Thoroughly review the request / user story / spec.
- Identify ambiguities, missing details, edge cases, technical risks, conflicts.
- **Ask specific clarifying questions** if anything is unclear — do not guess on
  product behavior.
- Produce a **Feature Brief** from
  [`../progress/templates/feature-brief-template.md`](../progress/templates/feature-brief-template.md):
  goal, acceptance criteria, main user flows, technical approach, success metrics.
  Save it as `progress/active/<slug>-brief.md`.

### 2. Create Progress Tracking File (Stop & Resume)
- Immediately create `progress/active/<slug>-progress.md` from
  [`../progress/templates/feature-progress-template.md`](../progress/templates/feature-progress-template.md).
- Add a row to [`../progress/STATUS.md`](../progress/STATUS.md) (status → 🟡).
- Update this file at the start and end of **every** session and whenever a
  checklist item changes. Keep `Current Focus / Next Step` actionable.

### 3. Write Tests First (test-first)
Write tests **before** implementation, following the test pyramid in
[`development/TESTING_GUIDE.md`](./development/TESTING_GUIDE.md):

| Layer | Framework | Location |
|---|---|---|
| Domain unit | xUnit + FluentAssertions | `backend/tests/Saha.Domain.Tests` |
| Application unit | xUnit + NSubstitute | `backend/tests/Saha.Application.Tests` |
| Backend integration | WebApplicationFactory | `backend/tests/Saha.API.Tests` |
| Frontend unit | Vitest + Testing Library + MSW | `frontend/src/**/__tests__` |
| E2E | Playwright (5 browsers) | `frontend/tests/e2e/<module>/` |

- Every acceptance criterion maps to at least one test.
- New tests should **fail for the right reason** before implementation.
- Tag critical-path E2E with `@smoke`.

### 4. Capture the Baseline
Run the existing suite first so you know your starting point is green:

```bash
# Backend
cd backend && dotnet test

# Frontend (type-check + lint + unit)
cd frontend && npm run type-check && npm run lint && npm run test

# E2E (chromium for the fast loop)
cd frontend && npm run test:e2e -- --project=chromium
```
Paste the baseline result into the progress file's **Test Evidence** section.

### 5. Implement the Feature
Build in dependency order, respecting layer rules in `CODING_STANDARDS.md`:

**Backend:** Domain → Application (command/query + validator + result DTO) →
Infrastructure (EF config, repository, migration) → API (controller endpoint).
- Throw domain exceptions (`NotFoundException`, `ConflictException`, …); never
  return error codes from handlers.
- All I/O async; always thread `CancellationToken`.

**Frontend:** module under `frontend/src/modules/<module>/` — types → API
function (via `axios-instance`) → Zod schema → hook (`use*`, TanStack Query) →
page/components (shadcn/ui + Framer Motion). Use the `@/` import alias.
- Replace the relevant `ComingSoonModule` stub when graduating a module.

### 6. Verification Loop (all green)
Iterate until **new and existing** tests pass and coverage targets hold
(90% line / 85% branch):

```bash
cd frontend && npm run type-check && npm run lint && npm run test:coverage
cd backend && dotnet test --collect:"XPlat Code Coverage"
cd frontend && npm run test:e2e -- --project=chromium
```
- For UI work, capture **evidence**: Playwright report and/or screenshots.
- Paste final outputs/coverage summary into the progress file.

### 7. Update Documentation & Close Out
- Update the brief/progress files; flip the `STATUS.md` row to ✅.
- Move `<slug>-brief.md` and `<slug>-progress.md` to `progress/completed/`.
- Update any user-facing docs (README module table, `docs/...`) as needed.

---

## Definition of Done (every feature)

- [ ] Brief approved; all open questions resolved.
- [ ] Acceptance criteria each covered by a passing automated test.
- [ ] `npm run type-check && npm run lint && npm run test` green (frontend).
- [ ] `dotnet test` green (backend).
- [ ] E2E flow green on chromium; `@smoke` where critical.
- [ ] Coverage targets met (90% line / 85% branch).
- [ ] Evidence captured in the progress file.
- [ ] Docs + `STATUS.md` updated; files moved to `completed/`.

---

## Git Conventions (recap)

Branches: `feature/<ticket>-<slug>`, `fix/...`, `refactor/...`.
Commits: [Conventional Commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`). Squash-merge to keep
`main` clean. See [`development/CODING_STANDARDS.md`](./development/CODING_STANDARDS.md#git-conventions).

> Commit/push only when the human asks. Default to a feature branch, never commit
> straight to `main`/`develop`.
