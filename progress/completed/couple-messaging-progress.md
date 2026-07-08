# Feature: Couple Messaging

**Slug:** `couple-messaging`
**Status:** Complete
**Brief:** [./couple-messaging-brief.md](./couple-messaging-brief.md)
**TDD:** [../../features/couple-messaging.tdd.md](../../features/couple-messaging.tdd.md)
**Started:** 2026-07-08
**Last Updated:** 2026-07-08
**AI Session:** claude-opus-4-8 (2026-07-08)

## Clarifications & Key Decisions
- 2026-07-08 Following TDD decisions D1–D10 and assumptions A1–A4 verbatim. No product questions outstanding.
- Two aggregates: `Conversation` and `Message` (message references conversation by id). (D1)
- Non-participant → 404 not 403 (isolation). (D3)
- New message un-hides for all couples (D4). Delete = tombstone, clears body+attachment+reactions (D5).
- Per-couple pin/hide in `ConversationCoupleState` (D6). Reaction stored as token (D7).

## Chunk Plan
1. Domain: enums, VOs, `Conversation`/`Message` aggregates + child entities + events. **[done]**
2. Application: repo interfaces, commands/queries/handlers/validators, DTOs. **[done]**
3. Infrastructure: EF configs, DbSets, repos, `AddMessaging` migration. **[done]**
4. API: `ConversationsController` + `MessagesController` + integration tests. **[done]**
5. Frontend data: `messaging.api.ts`, query keys, types, zod schemas, hooks, store. **[done]**
6. Frontend UI: pages/components with loading/empty/error/mobile states. **[done]**
7. E2E smoke + final verification. **[done]**

## Steps & Checklist
- [x] Reviewed spec & TDD (brief approved)
- [x] Created this progress file + brief
- [x] Wrote comprehensive tests — Domain (45 new ✅), Application (20 new ✅), Infra (16 new ✅), API (17 new ✅), FE unit (9 new ✅), E2E (5 new ✅)
- [x] Ran full test suite to capture green BASELINE (pre-change) — see Test Evidence (drift documented)
- [x] Implemented backend — Domain ✅, Application ✅, Infrastructure ✅ (migration + repo tests), API ✅ (2 controllers + integration tests)
- [x] Implemented frontend (module, hooks, pages, schemas, store, dialogs, mobile master-detail)
- [x] Verification loop completed — all NEW + existing tests green (only pre-existing failures remain)
- [x] Captured evidence below
- [x] Moved to progress/completed/ and updated STATUS.md

## Current Focus / Next Step
> **Resume here.** Chunk 3 (Infrastructure) is **DONE**. `AddMessaging` migration generated (SqlServer-typed,
> matches prod/InitialCreate), 6 tables + 11 indexes, `has-pending-model-changes` → none. 16 new Infra repo
> tests pass (34 total; only pre-existing Bcrypt failure remains).
>
> ⚠️ **Migration gotcha (recorded so it isn't re-hit):** `appsettings.Development.json` uses a **SQLite**
> connection string, so `dotnet ef migrations add` first scaffolded a **SQLite-typed** migration that also
> emitted ~100 `AlterColumn` calls rewriting every existing (SqlServer) table to TEXT/INTEGER — this would
> drift prod. Fix: force the SqlServer provider by exporting a SqlServer conn string before EF commands:
> `export ConnectionStrings__DefaultConnection="Server=localhost;Database=SahaDev;Trusted_Connection=True;TrustServerCertificate=True;"`
> then `dotnet ef migrations remove --force` (skips the DB liveness check) and re-`add`. Snapshot now
> nvarchar/datetime2/uniqueidentifier. Any FUTURE `ef` command MUST set that env var first.
> Infra tests use **SQLite in-memory** (`MessagingDbContextFactory`, new `Microsoft.EntityFrameworkCore.Sqlite`
> pkg) via `EnsureCreated` so unique/filtered indexes are actually enforced (InMemory ignores them).
>
> **Chunk 4 (API) is DONE.** `ConversationsController` (`api/v1/conversations`) + `MessagesController`
> (`api/v1/conversations/{conversationId}/messages`) per TDD §8, thin actions (commands read couple/partner
> from `ICurrentUserContext`). 17 integration tests in `MessagingApiTests.cs` — **all green** — cover
> FR-1/2/10 (partner auto-provisioned, pinned first), FR-13/20 (send+paginate newest-first w/ cursor),
> FR-14 (media), FR-17/18/19 (edit/delete/non-sender-403), FR-21–24 (react/change/remove + bad-emoji-400),
> FR-25 (cross-couple → 404), FR-4/6 (group create connected✓/unconnected→409, 4 participants), FR-7
> (owner rename✓/non-owner→403), FR-8 (add couple → 6 participants), FR-12 (hide per-couple).
>
> **Two test-infra fixes were required (root causes, not messaging bugs):**
> 1. `SahaWebApplicationFactory` swapped in InMemory but left the SqlServer provider registered → EF threw
>    "two providers in one container" (500 on every DB call — the *actual* reason AuthControllerTests fail,
>    not the nested body). Fixed by giving InMemory its **own internal service provider**
>    (`.UseInternalServiceProvider(new ServiceCollection().AddEntityFrameworkInMemoryDatabase()...)`).
> 2. Parallel `WebApplicationFactory<Program>` init races ("entry point exited without ever building an
>    IHost"). Fixed with assembly-level `[CollectionBehavior(DisableTestParallelization = true)]`.
> Also: unsealed `SahaWebApplicationFactory`; added `MessagingWebApplicationFactory` (permissive rate limiter
> so register/login of 3 couples doesn't trip the 5/min `auth` limiter — reconfigured via
> `Configure<RateLimiterOptions>` after removing the prod limiter's `IConfigureOptions`).
>
> **Pre-existing API failures unchanged in scope:** 11 `AuthControllerTests` still fail (they POST a *nested*
> register body vs the current *flat* `RegisterCoupleCommand`; the DB fix flipped one from 500→pass so it's
> 11 not 12 now). Not messaging — left as-is.
>
> **Resume at Chunk 5 (Frontend data):** rebuild `modules/messages` — `messaging.api.ts`, query keys in
> `core/constants/query-keys.ts`, TS types + zod schemas, TanStack Query hooks (`useConversations`,
> `useConversationDetail`, `useMessages` infinite, mutations w/ optimistic updates), Zustand UI-only store.
> Then Chunk 6 (UI: ConversationList/ChatThread/MessageComposer/etc. w/ loading/empty/error/mobile) and
> Chunk 7 (Playwright E2E smoke). Mirror `modules/connect`. See TDD §9.

## Test Evidence
- Backend `dotnet build Saha.sln` → exit 0.
- **Baseline (2026-07-08), pre-existing state before messaging work:**
  - `Saha.Domain.Tests`: 46 passed (clean).
  - `Saha.Application.Tests`: **did not compile** — `RegisterCoupleCommandHandlerTests` missing new `AuthMetrics` ctor arg. Repaired (1-line). Now 21 passed / **1 pre-existing failure** `Handle_LogsAuditOnSuccess` (NSubstitute redundant-arg-matcher in the audit-log assertion — unrelated to messaging).
  - `Saha.Infrastructure.Tests`: **did not compile** — `CoupleRepositoryTests` written against an old domain API (`DateOnly`, VO args, old `AddRefreshToken`/ctor). Repaired to current API. Now 18 passed / **1 pre-existing failure** `BcryptPasswordHasherTests.Verify_ShouldReturnFalse_WhenHashIsInvalid` (prod `Verify` throws `SaltParseException` on malformed hash instead of returning false — unrelated to messaging).
  - `Saha.API.Tests`: compiles; 1 passed / **12 pre-existing failures** in `AuthControllerTests` — they POST a *nested* register body (`husband:{…}`) but the current API uses a *flat* `RegisterCoupleCommand`. Unrelated to messaging; left as-is (compiles, so new messaging API tests run fine alongside).

> **Pre-existing-drift note:** three backend test projects had drifted from production code. I repaired only the two **compile-blocking** files (so the TDD-mandated Application/Infrastructure messaging tests can be added and run). The residual runtime failures above predate this feature and are out of scope; not chased per tdd-implement guidance.

## Notes, Risks & Open Items
- Highest risk: couple-isolation leak. Cross-couple tests are mandatory at Application + API layers.
- Must generate `AddMessaging` EF migration (prod uses Migrate; dev/tests use EnsureCreated/InMemory).
- Pre-existing drift repaired: `RegisterCoupleCommandHandlerTests` (+AuthMetrics arg), `CoupleRepositoryTests` (current domain API). See baseline note.

## Test Evidence — Chunk 5–7 Frontend (2026-07-08)
- **Data layer:** `core/api/messaging.api.ts` (all conversation + message endpoints incl. multipart media),
  query keys (`messages.conversations/conversation/thread`), types appended to `api.types.ts`, zod schemas
  (`sendMessage`/`rename`/`createGroup`) + curated `REACTIONS` token→emoji map, Zustand UI-only
  `messages.store.ts` (activeConversation + drafts), hooks `use-messaging.ts` (`useConversations`,
  `useConversationDetail`, `useMessages` infinite, `useMessagingMutations`, `useConversationMutations`).
- **UI:** rebuilt `MessagesPage` as responsive master-detail (list route `/messages`, thread route
  `/messages/:conversationId`; list hidden on mobile when a thread is open → no overlap, FR-27). Components:
  `ConversationList` (skeleton/empty/error, pin badge, preview, relative time), `ChatThread`
  (`MessageBubble` w/ sender attribution, edited/deleted states, reaction bar + picker, edit/delete menu,
  media render, composer w/ attach + Enter-to-send, load-earlier), `MessagingDialogs`
  (`NewGroupDialog` multi-select connected couples, `ConversationSettingsDialog` owner-rename + add-couple
  + pin/unpin + hide).
- **Small backend addition:** exposed `CoupleId` on `ConnectionDto` (`GetConnectionsQuery` handler already
  had `otherCoupleId`) so the create-group / add-couple UI can reference connected couples by id. Additive;
  Connect handler tests still pass (41/1 pre-existing).
- **Frontend tests:** `npm run build` (tsc -b + vite) ✅. `vitest run` → **25 passed** (16 pre-existing + 9
  new: `utils.test.ts` ×5, `ConversationList.test.tsx` ×4).
- **E2E (comprehensive, §16):** `tests/e2e/messages/messages.spec.ts` → **20 tests, green on all 5 Playwright
  projects** (chromium, firefox, webkit, Mobile Chrome, Mobile Safari = 100 runs). Backed by a **stateful**
  fake backend (`messaging-fixtures.ts::setupMessagingApi`) so mutation→invalidation→refetch behaves like the
  real app. Covers: sidebar reachability, list + partner-pinned-first, open thread, send text, **create group
  (connected)** + **unconnected-couple-unavailable** + **4 participants**, **owner rename** / **non-owner
  rename control hidden** / **add eligible couple**, **edit own** / **delete own (tombstone)** / **non-sender
  has no edit-delete controls**, **react → change → remove**, **pin/unpin**, **hide (per-couple)**, **photo
  message renders**, mobile no-overlap, unauth→login. NB: the app's own `/messages` route also ends in
  `/messages`, so E2E route mocks scope predicates to `/conversations`.
- **Project lint (`npm run lint`) is broken repo-wide** (ESLint 9 installed but no `eslint.config.js` flat
  config present) — pre-existing tooling gap, not introduced here; `tsc -b` is the working type gate.

## Test Evidence — Chunk 3 & 4 (2026-07-08)
- **Migration:** `AddMessaging` generated SqlServer-typed (matches prod); 6 tables + 11 indexes incl. filtered
  unique `IX_Conversations_PartnerCoupleId` (FR-1) and unique `IX_MessageReactions_Message_Partner` (FR-21);
  `dotnet ef migrations has-pending-model-changes` → none. Snapshot back on nvarchar/datetime2/uniqueidentifier.
- **Infra tests:** `dotnet test tests/Saha.Infrastructure.Tests` → 34 passed / **1 pre-existing** Bcrypt fail.
  16 new (9 `ConversationRepositoryTests` + 7 `MessageRepositoryTests`) via SQLite in-memory (`EnsureCreated`
  enforces the unique/filtered indexes).
- **API tests:** `dotnet test tests/Saha.API.Tests` → 19 passed / 11 failed. All 11 = pre-existing
  `AuthControllerTests` (nested-body drift). 17 new `MessagingApiTests` **all green** (verified via filter:
  17/17). Must run **serially** (assembly `DisableTestParallelization`) or WebApplicationFactory races.
- **Application:** 41 passed / 1 pre-existing `Handle_LogsAuditOnSuccess` NSubstitute fail. **Domain:** 91 passed.

## Session Log
- 2026-07-08 claude-opus-4-8 — Read TDD/spec + all Connect-layer reference files. Set up brief + progress. Backend baseline builds clean. Starting Chunk 1 (Domain).
- 2026-07-08 claude-opus-4-8 — **Chunks 5–7 done (feature COMPLETE).** Frontend data layer (api/keys/types/
  schemas/store/hooks), full responsive messaging UI (list + thread + composer + reactions + dialogs, mobile
  master-detail), 9 vitest + 5 Playwright E2E tests all green; `npm run build` clean. Added `CoupleId` to
  `ConnectionDto` for the create-group/add-couple UI (additive; Connect tests unaffected). Feature marked
  Complete; moved to progress/completed/ and updated STATUS.md.
- 2026-07-08 claude-opus-4-8 — **Chunk 3 done** (generated SqlServer-typed `AddMessaging` migration after
  fixing a SQLite-provider mis-scaffold; 16 new Infra repo tests on SQLite in-memory). **Chunk 4 done**
  (`ConversationsController` + `MessagesController`, 17 green integration tests mapping FR-1..25). Fixed two
  root-cause test-infra bugs: shared factory's dual-EF-provider 500 (now InMemory uses an internal SP), and
  parallel WebApplicationFactory host-build race (assembly `DisableTestParallelization`). Added
  `MessagingWebApplicationFactory` (permissive rate limiter). Suite: Domain 91, App 41/1pre-existing, Infra
  34/1pre-existing, API 19 (17 messaging green) /11 pre-existing AuthController. Next: Chunk 5 frontend data.
- 2026-07-08 claude-opus-4-8 — Repaired 2 compile-blocking pre-existing test files (baseline note). **Chunk 1 done** (Domain: enums, `ConversationName`/`ReactionEmoji` VOs, `Conversation`/`Message` aggregates + child entities + 8 events; 91 Domain tests pass, 45 new). **Chunk 2 done** (Application: `IConversationRepository`/`IMessageRepository`, 11 command + 3 query handlers, validators, DTOs, `MessageCursor`/`MessagingMapper`/`PartnerLookup`/`ConversationAccess`/`MessagePreview` helpers, `ProvisionPartnerConversationHandler` for `CoupleRegisteredEvent`; 20 new Application tests pass). **Chunk 3 ~80%** (6 EF configs, 6 DbSets, 2 repos, DI, `Conversation.PartnerCoupleId` + filtered unique index; backend builds clean). **Left:** generate `AddMessaging` migration + Infra repo tests, then Chunks 4–7 (API, frontend data, frontend UI, E2E). Only pre-existing failures remain in the suite (1 Bcrypt, 1 audit-log NSubstitute, 12 stale AuthController) — all documented, none messaging-related.
