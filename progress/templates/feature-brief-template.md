<!--
  FEATURE BRIEF TEMPLATE
  Copy this file to:  progress/active/<feature-name>-brief.md
  Fill it BEFORE writing any tests or code. The brief is the contract for the
  feature — it is what acceptance tests are written against.
  Keep slugs kebab-case and consistent with the matching -progress.md file.
-->

# Feature Brief: [Feature Name]

**Slug:** `feature-name`
**Author (AI session):** [model / session id]
**Created:** [YYYY-MM-DD]
**Module:** [auth | calendar | connect | dashboard | finance | goals | memories | messages | profile | settings | new: ...]
**Status:** Draft / Approved

---

## 1. Goal
One or two sentences: what this feature lets a couple do, and why it matters for Saha.

## 2. Background & Context
- Where this fits in the existing product (link to related modules / pages).
- Any current stub or placeholder this replaces (e.g. `ComingSoonModule`).
- Relevant prior art in the codebase to mirror (e.g. "follow the `connect` module structure").

## 3. User Stories
- As a **[husband/wife/partner]**, I want **[capability]** so that **[benefit]**.
- ...

## 4. Acceptance Criteria
> Written as testable, binary statements. Every criterion maps to at least one automated test.

- [ ] AC1 — ...
- [ ] AC2 — ...
- [ ] AC3 — ...

## 5. Main User Flows
1. **[Flow name]:** step → step → step → expected result.
2. ...

## 6. Out of Scope (Non-Goals)
- Explicitly list what this feature will NOT do, to prevent scope creep.

## 7. Technical Approach
### Backend (Clean Architecture)
- **Domain:** entities / value objects / domain events to add or change.
- **Application:** commands / queries / validators / result DTOs (per-feature folder, see CODING_STANDARDS).
- **Infrastructure:** EF Core config, repositories, migrations.
- **API:** endpoints (`/api/v1/...`), request/response contracts, authorization.

### Frontend (feature module)
- **Module path:** `frontend/src/modules/<module>/`
- Pages, hooks (`use*`), Zod schemas (`*Schema`), API functions, types.
- State: TanStack Query (server) vs Zustand (client) vs RHF (forms) — see CODING_STANDARDS.
- Reused shared components (`@/shared/components/...`).

### Data & Contracts
- New/changed API shapes (link to or inline the DTOs).
- DB schema changes + migration name.

## 8. Edge Cases, Risks & Open Questions
- Edge case: ...
- Risk: ...
- ❓ Open question (needs human/clarification): ...

## 9. Test Plan (test-first)
> These are written and committed BEFORE implementation. See the test pyramid in TESTING_GUIDE.

| Layer | Framework | What it covers |
|---|---|---|
| Domain unit | xUnit | aggregate/value-object invariants |
| Application unit | xUnit + NSubstitute | handler logic, validation |
| Backend integration | WebApplicationFactory | endpoint behavior, status codes, auth |
| Frontend unit | Vitest + Testing Library + MSW | hooks, stores, components |
| E2E | Playwright (5 browsers) | full user flow; tag critical path `@smoke` |

## 10. Success Metrics / Definition of Done
- [ ] All acceptance criteria have passing automated tests.
- [ ] Coverage targets met (90% line / 85% branch).
- [ ] `npm run type-check && npm run lint && npm run test` green (frontend).
- [ ] `dotnet test` green (backend).
- [ ] E2E flow green on chromium (+ `@smoke` where relevant).
- [ ] Evidence captured (screenshots / test output) in the progress file.
- [ ] Docs updated (this brief, the progress file, and any user-facing docs).
