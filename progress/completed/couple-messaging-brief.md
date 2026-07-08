# Feature Brief: Couple Messaging

**Slug:** `couple-messaging`
**Author (AI session):** claude-opus-4-8
**Created:** 2026-07-08
**Module:** messages
**Status:** Approved

> Derived from the approved TDD [features/couple-messaging.tdd.md](../../features/couple-messaging.tdd.md)
> and source spec [features/couple-messaging.spec](../../features/couple-messaging.spec).
> All four blocking product decisions (A1–A4) are resolved in the TDD; remaining §14 assumptions
> are accepted defaults. No blocking product questions outstanding → Approved.

---

## 1. Goal
Replace the placeholder `MessagesPage` with a full messaging module: a private, auto-provisioned
**Partner** chat per couple plus **Group** chats between connected couples, with text/photo/video
messages, sender-only edit/delete, one curated-emoji reaction per person, per-couple pin/hide, and
owner-only rename — all under strict couple data isolation.

## 2. Background & Context
- Replaces the `ComingSoonModule` stub at `/messages` (`frontend/src/modules/messages`).
- Mirrors the `Connect` vertical (`Features/Connect`, `CoupleConnection`, `modules/connect`).
- Real-time (SignalR) is explicitly out of scope; architecture kept real-time-ready via domain events + stable DTOs.

## 3. User Stories
See spec §3. Partner chat, group chat with connected couples, add-couple expansion, owner rename,
pin, per-couple hide, edit/delete own messages, reactions, media sharing.

## 4. Acceptance Criteria
FR-1 … FR-27 in TDD §2 (each mapped to automated tests in TDD §16). Summarized:
- Exactly one auto-provisioned, always-first, undeletable Partner conversation per couple.
- Group create requires ≥1 `Accepted`-connected couple; owner = creator; all partners are participants.
- Owner-only rename; any participant can add an `Accepted`-connected (to acting couple) couple.
- Per-couple pin + hide (hide affects both partners of the couple only; new message un-hides).
- Text/photo/video messages; sender-only edit (marker) + delete (tombstone); paginated newest-first.
- One curated reaction per person; add/change/remove; aggregated visibility.
- Couple isolation: non-participant → 404, not 403. All endpoints authenticated.
- Responsive UI with loading/empty/error states.

## 5. Main User Flows
TDD §3 (1–10): partner chat, create group, rename, blocked rename, add couple, pin, hide,
message actions, react, media.

## 6. Out of Scope
Real-time/SignalR, read receipts, delivered/typing indicators, search, push, moderation,
multiple reactions per person, global conversation deletion. (spec §6)

## 7. Technical Approach
### Backend
- **Domain:** enums `ConversationType`, `MessageContentType`; value objects `ConversationName`,
  `ReactionEmoji`; aggregates `Conversation` (owns `ConversationParticipant`,
  `ConversationCoupleState`) and `Message` (owns `MessageAttachment` 0..1, `MessageReaction` 0..*);
  8 domain events.
- **Application:** `Features/Messaging/` — commands (CreateGroup, Rename, AddCouple, Pin/Unpin, Hide,
  SendText, SendMedia, Edit, Delete, React, RemoveReaction) + queries (GetConversations,
  GetConversationDetail, GetMessages); `IConversationRepository`, `IMessageRepository`;
  `EnsurePartnerConversationAsync` self-heal; `CoupleRegisteredEvent` handler.
- **Infrastructure:** 6 EF configs, 6 new DbSets, 2 repos, `AddMessaging` migration, `messages` blob container.
- **API:** `ConversationsController` (`api/v1/conversations`), `MessagesController`
  (`api/v1/conversations/{conversationId}/messages`).

### Frontend (`modules/messages`)
Master–detail (list + thread; mobile stacked routes). `messaging.api.ts`, query keys under
`messages:`, TanStack hooks (incl. `useInfiniteQuery` thread), Zustand UI-only store, RHF+zod schemas.

### Data & Contracts
6 new tables; `MessageDto` stable (see TDD §7). Migration name: `AddMessaging`.

## 8. Edge Cases, Risks & Open Questions
- Couple-isolation leak (highest) → 404-not-403 + mandatory cross-couple tests.
- Schema drift (dev EnsureCreated vs prod Migrate) → generate + verify `AddMessaging`.
- Deleting message clears reactions (D5); new message un-hides (D4); edit limited to text/caption.
- Media caps: image ≤10 MB, video ≤50 MB; MIME allowlist; reject `image/svg+xml`. (ASSUMPTION)
- No blocking open questions.

## 9. Test Plan (test-first)
Per TDD §16: Domain unit, Application unit (auth/isolation/validators), Infrastructure (repo/persistence),
API integration (WebApplicationFactory), Frontend unit (Vitest/RTL/MSW), E2E (Playwright `messages/`).

## 10. Definition of Done
TDD §Completion checklist: all FRs covered by tests; `dotnet test` green; frontend type-check/lint/test green;
E2E chromium green for user flows; `AddMessaging` migration exists; STATUS ✅; files moved to completed/.
