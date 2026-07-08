# TDD: Couple Messaging

| | |
|---|---|
| **Feature** | Couple Messaging (`couple-messaging`, module `messages`) |
| **Design Tier** | **Comprehensive** |
| **Complexity** | **Complex** (new domain aggregate cluster, cross-couple data flow, media/blob, stateful lifecycle, high couple-isolation blast radius) |
| **Status** | **Ready for Implementation (with stated assumptions)** |
| **Date** | 2026-07-07 |
| **Source spec** | [features/couple-messaging.spec](couple-messaging.spec) |
| **Closest existing pattern to mirror** | `Features/Connect/*`, `Domain/Entities/CoupleConnection.cs`, `modules/connect` |

---

## 1. Overview

### Summary
Replace the placeholder `MessagesPage` with a full messaging module. Two conversation types:
- **Partner** — exactly one per couple, auto-provisioned, pinned first, undeletable, contains the couple's two partners.
- **Group** — created between ≥2 connected couples; every partner of every participating couple is an individual participant; has an owner couple; renamable by owner; expandable by any participant.

Messages carry **text or a single media attachment** (photo/video), are **editable/deletable by their sender only**, support **one curated-emoji reaction per person**, and are **couple-scoped for hide/pin**. Real-time delivery is explicitly **out of scope** but the design keeps all mutations centralized behind handlers that raise domain events, so a future SignalR hub can subscribe without touching the domain or contracts.

### Goals
- End-to-end partner chat + group chat, text + photo + video, edit/delete, reactions, pin, couple-level hide, owner-only rename, add-couple expansion.
- Strict **couple data isolation** — no couple can read or mutate a conversation it does not participate in (or has hidden).
- Full automated test coverage mapped to functional requirements.
- Structurally ready for real-time (domain events + stable DTOs) without implementing it.

### Non-Goals (from spec §6, restated)
Real-time/SignalR, read receipts, delivered/typing indicators, message search, push notifications, moderation/reporting, multiple reactions per person, global (all-participant) conversation deletion.

### Scope & Tier Summary
This touches **every backend layer plus a new frontend module**: **Domain** (new `Conversation` and `Message` aggregates + child entities `ConversationParticipant`, `ConversationCoupleState`, `MessageAttachment`, `MessageReaction`; value objects `ConversationName`, `ReactionEmoji`; enums; domain events), **Application** (a new `Features/Messaging/` folder with ~14 commands/queries), **API** (new `MessagingController` / possibly split conversation vs message controllers), **Infrastructure** (2 repositories, 6 EF configurations, one **EF Core migration**, and blob usage under a new `messages` container), and **Frontend** (`modules/messages` rebuilt: pages, components, hooks, schemas, `messaging.api.ts`, query keys, Zustand UI store). Auth surface is **couple-scoped with connection-gating** on group creation/expansion, which is the primary security risk. Given that blast radius, this is **Comprehensive** tier.

### Key Assumptions (accepted defaults — see §14)
- **A1** Add-couple eligibility = the **acting couple** must have an `Accepted` `CoupleConnection` with the target couple.
- **A2** **Multiple** group chats are allowed for the same set of couples (no membership-uniqueness constraint).
- **A3** Media uses the existing `IBlobStorageService` (Null→local `/uploads` in dev, Azure Blob in prod), container `messages`, with size/type limits; **no transcoding/thumbnailing**.
- **A4** Reactions are a **fixed curated allowlist** validated server-side.

---

## 2. Functional Requirements

Numbered for test traceability (see §16). Each maps to spec §4/§7.

**Conversations**
- **FR-1** Every couple has exactly one `Partner` conversation, provisioned automatically and available immediately after registration.
- **FR-2** The partner conversation is always sorted first ("pinned") and its pin/hide state cannot be changed.
- **FR-3** The partner conversation cannot be deleted/hidden.
- **FR-4** A `Group` conversation can be created only between the creator couple and **≥1 other couple to which the creator is `Accepted`-connected** (≥2 couples total).
- **FR-5** Accepting a `CoupleConnection` does **not** create any conversation.
- **FR-6** Creating a group conversation adds **all individual partners** of every participating couple as participants; the creator couple is the **owner couple**.
- **FR-7** Only the **owner couple** may rename a group conversation.
- **FR-8** Any participant may add another couple that is `Accepted`-connected **to their own couple** (A1); adding a couple adds **both** its partners.
- **FR-9** Message history remains readable after couples later disconnect (disconnect does not cascade to conversations/participants).
- **FR-10** Conversation list returns, per conversation: name, participant summary, last-message preview, last-activity time, pin state, and type.
- **FR-11** Non-partner conversations can be pinned/unpinned **per couple**.
- **FR-12** Non-partner conversations can be hidden **per couple**; hiding removes it for **both** partners of the acting couple only, leaving other couples' copies intact.

**Messages**
- **FR-13** Text messages can be sent and listed.
- **FR-14** Photo messages can be sent and listed (single attachment).
- **FR-15** Video messages can be sent and listed (single attachment).
- **FR-16** Messages record the **individual sender partner** identity (name/role/avatar).
- **FR-17** Only the sender may edit their message; edited messages expose an `IsEdited`/`EditedAt` marker.
- **FR-18** Only the sender may delete their message; deleted messages are tombstoned — original body/media no longer returned.
- **FR-19** A non-sender attempting edit/delete is rejected (403).
- **FR-20** Messages are paginated (newest-first, cursor-based).

**Reactions**
- **FR-21** A person may add exactly **one** reaction (from the curated set) per message.
- **FR-22** A person may change their reaction (replaces prior).
- **FR-23** A person may remove their reaction.
- **FR-24** Reactions are persisted and visible to all participants (aggregated counts + which partner reacted).

**Cross-cutting**
- **FR-25** All messaging endpoints require authentication; every read/write enforces couple-participation + not-hidden.
- **FR-26** Architecture is real-time-ready (mutations raise domain events; DTOs stable) but no real-time transport ships.
- **FR-27** UI is responsive (desktop + mobile), no overlap/layout shift, with loading/empty/error states for every view.

---

## 3. User Flows (Saha terms)

1. **Partner chat** — Partner opens `/messages` → list loads with Partner conversation pinned first → selects it → composer sends text → thread shows message attributed to the sending partner (Husband/Wife).
2. **Create group** — Partner opens "New chat" → picks from *accepted connections* → confirm → group created (owner = their couple), all 4 partners are participants, thread opens.
3. **Rename (owner)** — Owner-couple partner opens chat settings → rename → new name propagates on next fetch/invalidate.
4. **Rename blocked (non-owner)** — Non-owner partner sees rename control disabled; API rejects with 403 if forced.
5. **Add couple** — Any participant opens settings → "Add couple" lists *their* accepted connections not already in the chat → select → both partners added.
6. **Pin** — Partner pins a group conversation → it sorts into the pinned band below the (always-first) Partner conversation, for their couple only.
7. **Hide** — Partner hides a group conversation → it disappears from the list for **both** their partners; other couples still see it.
8. **Message actions** — Sender sends → edits (marker shows) → deletes (tombstone shows).
9. **React** — Participant reacts → changes → removes; counts and per-partner state update.
10. **Media** — Participant picks photo/video → local preview → send (multipart upload) → attachment renders in thread.

---

## 4. Permissions Matrix

Couple isolation is enforced in **every** handler by loading the conversation's participants and checking `ICurrentUserContext.CoupleId`. Partner-role is only relevant for "sender" checks (per-partner), never for couple-scope reads.

| Action | Partner conv. | Group conv. | Rule |
|---|---|---|---|
| List conversations | own couple | own couple, not hidden | `CoupleId` participates & not hidden |
| Read conversation / messages | both partners of the couple | any partner of a participant couple, not hidden | participation check |
| Send message | either partner | any partner of a participant couple | participation check |
| Edit / delete message | message sender only | message sender only (`senderPartnerId == PartnerId`) | sender check → 403 |
| React / change / remove reaction | any participant partner | any participant partner | participation check; own reaction only |
| Create group | n/a | requester couple + `Accepted`-connected target(s) | connection-gate (A1) |
| Rename | ❌ (immutable name) | **owner couple only** | `ownerCoupleId == CoupleId` → 403 |
| Add couple | n/a | any participant; target `Accepted`-connected to **acting couple** (A1) | participation + connection-gate |
| Pin / unpin | ❌ (always pinned) | any participant couple (per couple) | participation check |
| Hide / delete | ❌ (undeletable) | any participant couple (per couple, affects both its partners) | participation check |

**Couple-isolation invariant (non-negotiable):** a `NotFoundException` (not 403) is returned when the current couple is not a participant, so existence of others' conversations is never leaked. 403 is reserved for authenticated-participant-but-insufficient-privilege (non-owner rename, non-sender edit).

---

## 5. Domain Model

### 5.1 Aggregate boundaries (Decision D1)
Two aggregate roots, not one, to avoid loading full history and to allow message pagination + future real-time per-message events:

- **`Conversation`** (AggregateRoot) owns `ConversationParticipant` (per-partner rows) and `ConversationCoupleState` (per-couple pin/hide). It holds `Type`, `Name`, `OwnerCoupleId`, and a denormalized `LastActivityAt` / `LastMessagePreview` for the list.
- **`Message`** (AggregateRoot, references `ConversationId`) owns `MessageAttachment` (0..1) and `MessageReaction` (0..*).

> Rationale: messages grow unbounded; making them a child collection of `Conversation` would force loading them to touch the conversation. Referencing by `ConversationId` mirrors how `CoupleConnection` references couples by id rather than nesting them.

### 5.2 Enums (`Domain/Enums`)
- `ConversationType { Partner, Group }`
- `MessageContentType { Text, Image, Video }`

### 5.3 Value objects (`Domain/ValueObjects`) — `sealed record`, private ctor, static `Create`, implicit `string`
- **`ConversationName`** — group names 1–80 chars, trimmed, non-empty; `DomainValidationException("INVALID_CONVERSATION_NAME")`. (Partner conversations have `null` name; UI derives "You & <partner>".)
- **`ReactionEmoji`** — validates against the curated allowlist `{ "heart", "laugh", "wow", "sad", "thumbsup", "fire" }` (stored as stable tokens, rendered to emoji on FE). Off-list → `DomainValidationException("INVALID_REACTION")`. (A4)

### 5.4 `Conversation : AggregateRoot`
State (all private setters): `Guid Id`, `ConversationType Type`, `string? Name`, `Guid? OwnerCoupleId`, `DateTime LastActivityAt`, `string? LastMessagePreview`, `Guid? LastMessageSenderPartnerId`, collections `_participants`, `_coupleStates`.

Methods / invariants:
- `static Conversation CreatePartner(Guid coupleId, Guid husbandId, Guid wifeId)` — Type=Partner, Name=null, Owner=null; adds 2 participants + 1 `ConversationCoupleState`. Raises `PartnerConversationCreatedEvent`.
- `static Conversation CreateGroup(Guid ownerCoupleId, IReadOnlyList<(Guid coupleId, Guid husbandId, Guid wifeId)> couples, string name)` — requires **≥2 couples**, else `DomainException("GROUP_NEEDS_TWO_COUPLES")`; Owner=ownerCoupleId; validates `ConversationName`; adds participants (2×couples) and one coupleState per couple. Raises `GroupConversationCreatedEvent`.
- `void AddCouple(Guid actingCoupleId, Guid newCoupleId, Guid husbandId, Guid wifeId)` — guards: Type==Group (`NOT_A_GROUP`), acting couple participates, couple not already present (`COUPLE_ALREADY_IN_CONVERSATION`). Adds 2 participants + coupleState. Raises `CoupleAddedToConversationEvent`. (Connection-eligibility A1 is checked in the handler, which has repo access — the entity guards structure, the handler guards the connection.)
- `void Rename(Guid actingCoupleId, string newName)` — guards Type==Group, `actingCoupleId == OwnerCoupleId` else `DomainException("NOT_OWNER")`; sets validated `ConversationName`. Raises `ConversationRenamedEvent`.
- `void Pin(Guid coupleId)` / `void Unpin(Guid coupleId)` — guards Type==Group (`CANNOT_MODIFY_PARTNER_PIN`); toggles that couple's `ConversationCoupleState.IsPinned`.
- `void HideForCouple(Guid coupleId)` — guards Type==Group else `DomainException("CANNOT_HIDE_PARTNER")`; sets that couple's `IsHidden=true`. (Re-sending a message un-hides — see D4.)
- `void TouchActivity(string preview, Guid senderPartnerId)` — updates denormalized last-message fields; called by the message-send flow; **un-hides** all coupleStates so a new message resurfaces a previously hidden conversation (D4).
- Helpers: `bool HasCoupleParticipant(Guid coupleId)`, `bool HasPartnerParticipant(Guid partnerId)`, `bool IsHiddenFor(Guid coupleId)`.

### 5.5 `ConversationParticipant : Entity`
`Guid ConversationId`, `Guid CoupleId`, `Guid PartnerId`, `PartnerRole Role`, `DateTime JoinedAt`. One row per individual. (Denormalized `CoupleId`+`Role` avoid extra joins for the participant summary and couple-scope checks.)

### 5.6 `ConversationCoupleState : Entity`
`Guid ConversationId`, `Guid CoupleId`, `bool IsPinned`, `bool IsHidden`. One row per couple — this is where per-couple pin/hide lives (both partners of a couple share it, satisfying FR-12).

### 5.7 `Message : AggregateRoot`
State: `Guid Id`, `Guid ConversationId`, `Guid SenderPartnerId`, `Guid SenderCoupleId`, `MessageContentType ContentType`, `string? Body`, `bool IsEdited`, `DateTime? EditedAt`, `bool IsDeleted`, `DateTime? DeletedAt`, collections `_reactions`, and `MessageAttachment? _attachment`.

Methods / invariants:
- `static Message CreateText(Guid conversationId, Guid senderPartnerId, Guid senderCoupleId, string body)` — body non-empty ≤ 4000 chars (`INVALID_MESSAGE_BODY`). Raises `MessageSentEvent`.
- `static Message CreateMedia(... MessageContentType type, string? caption, MessageAttachment attachment)` — type∈{Image,Video}; attachment required. Raises `MessageSentEvent`.
- `void Edit(Guid partnerId, string newBody)` — guards `partnerId == SenderPartnerId` else `DomainException("NOT_MESSAGE_SENDER")`; guards `!IsDeleted`; only text/caption editable; sets `IsEdited=true`, `EditedAt`. Raises `MessageEditedEvent`.
- `void Delete(Guid partnerId)` — sender guard; sets `IsDeleted=true`, `DeletedAt`, **clears Body + attachment reference** (tombstone — FR-18); reactions retained or cleared (D5: cleared). Raises `MessageDeletedEvent`.
- `void React(Guid partnerId, string emojiToken)` — validates `ReactionEmoji`; upserts the caller's single reaction (replace if exists → FR-22). Raises `MessageReactionChangedEvent`.
- `void RemoveReaction(Guid partnerId)` — removes caller's reaction if present. Raises `MessageReactionChangedEvent`.

### 5.8 `MessageAttachment : Entity`
`Guid MessageId`, `string Url`, `string ContentType` (MIME), `string FileName`, `long SizeBytes`. (Populated after blob upload; §8.)

### 5.9 `MessageReaction : Entity`
`Guid MessageId`, `Guid PartnerId`, `Guid CoupleId`, `string Emoji` (token), `DateTime CreatedAt`. **Unique (MessageId, PartnerId)** enforces one-per-person (FR-21).

### 5.10 Domain events (`Domain/Events`, all `IDomainEvent`)
`PartnerConversationCreatedEvent`, `GroupConversationCreatedEvent`, `ConversationRenamedEvent`, `CoupleAddedToConversationEvent`, `MessageSentEvent`, `MessageEditedEvent`, `MessageDeletedEvent`, `MessageReactionChangedEvent`. These are the **real-time seam** (FR-26): a future `SignalRBroadcastHandler : INotificationHandler<MessageSentEvent>` broadcasts without any domain change. **Timestamps** (`CreatedAt`/`UpdatedAt`) are stamped by `AuditableEntityInterceptor` — never set manually.

### 5.11 Partner-conversation provisioning (Decision D2)
- **Primary:** an `INotificationHandler<CoupleRegisteredEvent>` in `Features/Messaging` creates the partner conversation (satisfies "created after registration" + the spec's "Register couple creates partner chat" integration test). Events dispatch in `DomainEventDispatchInterceptor.SavedChangesAsync`, so the handler does its own `AddAsync` + `SaveChangesAsync`.
- **Safety net:** `GetConversationsQueryHandler` calls an idempotent `EnsurePartnerConversationAsync(coupleId)` (creates only if none exists) so pre-existing couples and any failed post-registration creation self-heal. Idempotency guard: unique index on `(Type, first-couple)` for Partner rows (§6).

---

## 6. Persistence (EF Core) & Migration

New `IApplicationDbContext` DbSets: `Conversations`, `ConversationParticipants`, `ConversationCoupleStates`, `Messages`, `MessageAttachments`, `MessageReactions`.

Six `IEntityTypeConfiguration` classes in `Infrastructure/Persistence/Configurations` (mirror `CoupleConnectionConfiguration`: `ToTable`, `HasKey`, `ValueGeneratedNever` on Id, enum-as-string, explicit indexes):

| Table | Key columns / notes | Indexes |
|---|---|---|
| `Conversations` | `Type` (string≤20), `Name` (≤80, null), `OwnerCoupleId` (null), `LastActivityAt`, `LastMessagePreview` (≤200) | `IX_..._Type`, filtered unique `IX_..._Partner_Couple` on owning couple for Partner rows to guarantee FR-1 |
| `ConversationParticipants` | FK `ConversationId` (cascade), `CoupleId`, `PartnerId`, `Role` (string) | unique `(ConversationId, PartnerId)`; `IX (PartnerId)`; `IX (CoupleId)` for list queries |
| `ConversationCoupleStates` | FK `ConversationId` (cascade), `CoupleId`, `IsPinned`, `IsHidden` | unique `(ConversationId, CoupleId)`; `IX (CoupleId, IsHidden)` |
| `Messages` | FK `ConversationId`, `SenderPartnerId`, `SenderCoupleId`, `ContentType` (string), `Body` (≤4000, null), `IsEdited`, `EditedAt`, `IsDeleted`, `DeletedAt` | `IX (ConversationId, CreatedAt)` (pagination); `IX (SenderPartnerId)` |
| `MessageAttachments` | FK `MessageId` (cascade, 1:1), `Url`, `ContentType`, `FileName`, `SizeBytes` | PK/unique `MessageId` |
| `MessageReactions` | FK `MessageId` (cascade), `PartnerId`, `CoupleId`, `Emoji` (≤20) | **unique `(MessageId, PartnerId)`** (FR-21) |

**Migration:** `dotnet ef migrations add AddMessaging -p Saha.Infrastructure -s Saha.API`. **Critical (per ARCHITECTURE.md high-risk note):** dev/IntegrationTest use `EnsureCreated` (model-driven) while prod uses `Migrate`; the migration MUST be generated or prod drifts. Verify the migration compiles and `dotnet ef database update` succeeds against a scratch SQLite db before merge.

**PII / retention:** message bodies + media are user content (personal). Deletion is a **tombstone** (D5) — body/attachment nulled, row retained for thread integrity. Media blobs SHOULD be deleted from storage on message delete (`IBlobStorageService.DeleteAsync(url, "messages")`). No hard-delete/retention job in this version (note in §15).

---

## 7. Application Layer

New folder `Saha.Application/Features/Messaging/` (mirror `Features/Connect`). Each use case = `<Name>Command|Query.cs` + `<Name>Handler.cs` (+ `Validator.cs` where input needs it). Results/DTOs are `sealed record`.

**Repositories (Domain/Interfaces/Repositories):**
- `IConversationRepository` — `GetByIdAsync`, `GetListForCoupleAsync(coupleId)` (joins participant + coupleState, excludes hidden), `PartnerConversationExistsAsync(coupleId)`, `AddAsync`, `UpdateAsync`.
- `IMessageRepository` — `GetByIdAsync` (incl. attachment+reactions), `GetPageAsync(conversationId, beforeCursor, take)`, `AddAsync`, `UpdateAsync`.

**Commands**
| Use case (folder) | Guards (beyond FluentValidation) | Events | Result |
|---|---|---|---|
| `Commands/CreateGroupConversation` | each target `Accepted`-connected to requester (A1); ≥1 target | `GroupConversationCreatedEvent` | `{ ConversationId }` (201) |
| `Commands/RenameConversation` | owner couple only → 403 | `ConversationRenamedEvent` | 204 |
| `Commands/AddCoupleToConversation` | participant; target `Accepted`-connected to acting couple (A1); not already in | `CoupleAddedToConversationEvent` | 204 |
| `Commands/PinConversation` / `UnpinConversation` | participant; group only | — | 204 |
| `Commands/HideConversation` | participant; group only | — | 204 |
| `Commands/SendTextMessage` | participant | `MessageSentEvent` (+ `Conversation.TouchActivity`) | `MessageDto` (201) |
| `Commands/SendMediaMessage` | participant; valid uploaded attachment (see §8) | `MessageSentEvent` | `MessageDto` (201) |
| `Commands/EditMessage` | sender only → 403; not deleted | `MessageEditedEvent` | `MessageDto` |
| `Commands/DeleteMessage` | sender only → 403; blob cleanup | `MessageDeletedEvent` | 204 |
| `Commands/ReactToMessage` | participant; curated emoji | `MessageReactionChangedEvent` | 204 |
| `Commands/RemoveReaction` | participant | `MessageReactionChangedEvent` | 204 |

**Queries**
| Use case | Returns |
|---|---|
| `Queries/GetConversations` | `IReadOnlyList<ConversationSummaryDto>` (name/derived, participant summary, last preview, `LastActivityAt`, `IsPinned`, `Type`, `IsOwner`), partner first then pinned then recent; calls `EnsurePartnerConversationAsync` (D2) |
| `Queries/GetConversationDetail` | `ConversationDetailDto` (participants incl. partner name/role/avatar, owner flag) |
| `Queries/GetMessages` | cursor page `MessagePageDto { items: MessageDto[], nextCursor }` newest-first |

**`MessageDto`** (stable, real-time-ready): `Id, ConversationId, SenderPartnerId, SenderName, SenderRole, ContentType, Body?, Attachment? { url, contentType, fileName, sizeBytes }, IsEdited, EditedAt?, IsDeleted, CreatedAt, Reactions: [{ emoji, count, partnerIds }]`. Deleted → `Body=null, Attachment=null, IsDeleted=true`.

**Handler conventions (mirror `AcceptConnectionRequestCommandHandler`):** inject `ICurrentUserContext`; **first line asserts couple-scope**; load aggregate via repository; call entity method (invariants inside); `UpdateAsync`; write `_auditLogger.LogAsync(...)` for sensitive actions (create group, add couple, rename, delete message, hide). Validation lives in FluentValidation validators (not handlers) per the Validation behavior. Do **not** set timestamps.

**Transaction note:** send-message touches two aggregates (`Message` insert + `Conversation.TouchActivity` update). Both are saved in one `SaveChangesAsync` (single unit of work via the shared `ApplicationDbContext`), so they commit atomically and their domain events dispatch together.

---

## 8. API Design

Base route `api/v{version:apiVersion}/[controller]`, `ApiControllerBase` (`[ApiController][Authorize]`), thin actions pulling `CoupleId`/`PartnerId` from `ICurrentUserContext` (mirror `ConnectController`). Two controllers for cohesion:

**`ConversationsController`** (`api/v1/conversations`)
| Method | Route | Body / query | Success | Errors |
|---|---|---|---|---|
| GET | `/` | — | 200 `ConversationSummaryDto[]` | 401 |
| GET | `/{id:guid}` | — | 200 `ConversationDetailDto` | 404 (non-participant), 401 |
| POST | `/group` | `{ name, targetCoupleIds[] }` | 201 `{ conversationId }` | 400, 403/409 (not connected), 404 |
| PUT | `/{id:guid}/name` | `{ name }` | 204 | 403 (not owner), 404 |
| POST | `/{id:guid}/couples` | `{ targetCoupleId }` | 204 | 400, 403/409, 404 |
| PUT | `/{id:guid}/pin` · `/unpin` | — | 204 | 400 (partner conv.), 404 |
| DELETE | `/{id:guid}` | — (hide) | 204 | 400 (partner conv.), 404 |

**`MessagesController`** (`api/v1/conversations/{conversationId:guid}/messages` — nested for clarity)
| Method | Route | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/` | `?before=<cursor>&take=30` | 200 `MessagePageDto` | 404 |
| POST | `/` | `{ body }` | 201 `MessageDto` | 400, 404 |
| POST | `/media` | multipart: `file` + `caption?` + `contentType` | 201 `MessageDto` | 400 (type/size), 404, 413 |
| PUT | `/{messageId:guid}` | `{ body }` | 200 `MessageDto` | 403 (not sender), 404 |
| DELETE | `/{messageId:guid}` | — | 204 | 403, 404 |
| PUT | `/{messageId:guid}/reaction` | `{ emoji }` | 204 | 400 (bad emoji), 404 |
| DELETE | `/{messageId:guid}/reaction` | — | 204 | 404 |

**Media endpoint (A3):** `[RequestSizeLimit]` per type — images **≤10 MB**, videos **≤50 MB** (mirrors Profile's `[RequestSizeLimit(5_242_880)]` idiom; ASSUMPTION on exact caps). Allowed MIME allowlist: `image/jpeg,image/png,image/webp,image/gif`; `video/mp4,video/webm,video/quicktime`. Handler streams to `IBlobStorageService.UploadAsync(stream, fileName, contentType, "messages")` then persists `MessageAttachment`. Reject others with `400 { code: "UNSUPPORTED_MEDIA_TYPE" }`.

**Error mapping** (existing `ExceptionHandlingMiddleware` → `{ code, message, errors|null }`, camelCase):
`DomainException`/`DomainValidationException` → 400/409 by code; `ApplicationValidationException` → 400; `NotFoundException` → 404; `ForbiddenException` → 403; `ConflictException` → 409. **Non-participation returns 404, not 403** (isolation, §4). `api` rate limiter (100/min) applies.

---

## 9. Frontend Design (`modules/messages`)

Rebuild the placeholder `MessagesPage`. Structure per CONVENTIONS: `pages/`, `components/`, `hooks/`, `schemas/`, plus `core` wiring.

**Routing/layout:** existing `/messages` under `ProtectedRoute`/`AppLayout`. Master–detail: conversation list + thread; on mobile, list and thread are separate stacked views (route `/messages` = list, `/messages/:conversationId` = thread) to avoid overlap (FR-27).

**API client:** `modules/messages/messaging.api.ts` (or `core/api/messaging.api.ts`) — all calls via `apiClient` (bearer + `traceparent` + 401 refresh handled centrally). Media send uses `multipart/form-data` through the same instance.

**Server state — TanStack Query** (new keys in `core/constants/query-keys.ts`):
```ts
messages: {
  conversations: ['messages', 'conversations'] as const,
  conversation: (id: string) => ['messages', 'conversation', id] as const,
  thread: (id: string) => ['messages', 'thread', id] as const, // useInfiniteQuery
}
```
- `useConversations` (list), `useConversationDetail(id)`, `useMessages(id)` (`useInfiniteQuery`, cursor).
- Mutations (`useSendMessage`, `useEditMessage`, `useDeleteMessage`, `useReact`, `usePin`, `useHide`, `useCreateGroup`, `useRename`, `useAddCouple`) do **optimistic updates** on the thread/list cache then invalidate on settle. **No server data in Zustand.**

**Client state — Zustand** `messages.store.ts`: UI-only (`activeConversationId`, composer draft per conversation, media-preview state, open dialog). Respect **Partner View**: it's presentation-only, so the composer's "acting sender" for display may reflect the viewed partner, but the API always sends as the authenticated partner — never fake sender identity to the backend.

**Components:** `ConversationList` + `ConversationListItem` (pin badge, preview, relative time), `ChatThread` + `MessageBubble` (sender attribution, edited/deleted states, reaction bar), `MessageComposer` (text + attach), `MediaPicker`/`MediaPreview`, `ReactionPicker` (curated set only), `RenameChatDialog` (owner-gated), `AddCoupleDialog` (lists own accepted connections not already present), `MessageActionsMenu` (edit/delete for own messages).

**Forms/validation:** react-hook-form + zod in `schemas/` — `sendMessageSchema` (body ≤4000), `renameSchema` (1–80), `createGroupSchema` (≥1 target). Client mirrors server limits (defense in depth); server is authoritative.

**States (every view — FR-27):** list/thread skeletons (loading); empty ("No conversations yet" / "Say hello 👋"); error via `core/utils/error.utils.ts` → toast. Media: upload progress + failed-upload retry.

**Animation (Framer Motion, purposeful):** conversation switch cross-fade, message entrance (slide+fade), reaction pop, media preview scale-in, pin/hide list reorder (`layout`), dialog transitions. Respect `prefers-reduced-motion`.

**Accessibility:** keyboard-navigable list/thread, focus management on dialog open/close, ARIA on reaction buttons and message actions, labelled controls, no color-only state.

---

## 10. Security

- **Couple isolation (core):** every handler asserts `CoupleId` participation before any read/write; non-participants get 404. Cross-couple access attempts are a mandatory test (§16 regression).
- **Connection-gating:** group create + add-couple verify an `Accepted` `CoupleConnection` between acting couple and target (A1) via `IConnectionRepository` — a couple can't pull an unconnected couple into a chat.
- **Sender authority:** edit/delete/react bind to `PartnerId` from claims (`sub`), never from the request body.
- **Media:** MIME + size allowlist server-side (client checks are advisory); store under `messages` container; consider `Content-Disposition`/no-inline-HTML concerns — only image/video MIME accepted, never `text/html`/`svg` execution vectors (reject `image/svg+xml`). Blob URLs are the existing pattern (dev `/uploads` static, prod Azure Blob).
- **Abuse:** existing `api` rate limiter (100/min) covers sends this version; note a per-conversation send throttle as a future hardening (§15).
- **Secrets/config:** no new secrets; blob + DB selection follow the existing config-presence pattern (Null/local vs Azure/SQL).

---

## 11. Performance & Scalability

- **List query:** single query joining `ConversationParticipants`+`ConversationCoupleStates` filtered by `CoupleId` and `IsHidden=false`; denormalized `LastActivityAt`/`LastMessagePreview` on `Conversation` avoid an N+1 "last message" lookup. Avoid the per-row `GetByIdAsync` loop seen in `GetConnectionsQueryHandler` — project in one query.
- **Thread:** cursor pagination on `IX (ConversationId, CreatedAt)`, `take=30`, newest-first; reactions/attachment loaded with the page (`Include`) to avoid N+1.
- **Statelessness:** no in-memory state (App Service scale-out safe); all state in DB + client cache. This is what makes the future SignalR addition require a backplane, not a redesign (note §15).
- **Media:** streamed to blob, not buffered fully in memory beyond framework limits; DB stores only metadata.

---

## 12. Observability

- **Serilog** structured logs already wrap handlers via `LoggingBehavior`; `PerformanceBehavior` flags slow sends.
- **`IAuditLogger`** entries for sensitive actions: `GROUP_CONVERSATION_CREATED`, `COUPLE_ADDED_TO_CONVERSATION`, `CONVERSATION_RENAMED`, `MESSAGE_DELETED`, `CONVERSATION_HIDDEN` (mirror `CONNECTION_ACCEPTED`).
- **OpenTelemetry:** `traceparent` already propagated FE→BE by `apiClient`; media upload spans included automatically.
- Consider a `Saha.Messaging` meter (messages sent, media bytes) as a future add (not required this tier).

---

## 13. Migration & Rollout

1. Add entities + configs + DbSets; generate `AddMessaging` EF migration; verify against scratch SQLite + (if available) SQL Server.
2. Ship `CoupleRegisteredEvent` handler + `EnsurePartnerConversationAsync` self-heal so existing couples get a partner conversation on first `/messages` load (no data backfill script required — D2 covers it lazily).
3. No feature flag required (net-new module replacing a placeholder); could gate the nav item behind a build-time flag if a phased rollout is wanted (optional).
4. Deploy: backend → Azure App Service (migration runs via `Migrate` on prod startup); frontend → Static Web App. **Rollback:** the migration only adds tables (no destructive change to existing ones), so rollback = redeploy prior build; new tables can be dropped by a down-migration if needed.

---

## 14. Open Questions & Explicit Assumptions

Resolved interactively (defaults accepted):
- **A1** Add-couple eligibility = connected to the **acting couple**. *(FR-8, §4, §7 AddCouple)*
- **A2** Multiple group chats per couple-set allowed; **no** membership-uniqueness index. *(§5.4 CreateGroup, §6)*
- **A3** Media via `IBlobStorageService`, container `messages`, no transcoding. *(§8 media)*
- **A4** Reactions = fixed curated token set. *(§5.3 ReactionEmoji)*

Remaining assumptions (tagged, non-blocking — flag if any is wrong):
- **ASSUMPTION** Media size caps: image ≤10 MB, video ≤50 MB; MIME allowlist as in §8; `image/svg+xml` rejected. *(§8, §10)*
- **ASSUMPTION** Message body ≤4000 chars; group name 1–80 chars. *(§5.3, §5.7)*
- **ASSUMPTION** Sending a new message **un-hides** the conversation for all couples (D4). *(§5.4 TouchActivity)*
- **ASSUMPTION** Deleting a message **clears its reactions** (D5); tombstone row retained. *(§5.7 Delete)*
- **ASSUMPTION** Editing is limited to **text body/caption**; you cannot swap the media of a media message. *(§5.7 Edit)*
- **ASSUMPTION** "Participant summary" = partner display names grouped by couple; exact string format is a UI detail. *(FR-10)*
- **ASSUMPTION** Curated reaction tokens = `{heart, laugh, wow, sad, thumbsup, fire}` (final emoji set is a product/design call). *(§5.3)*

---

## 15. Risks, Trade-offs & Mitigations

| Risk | Mitigation |
|---|---|
| **Couple-isolation bug leaks another couple's chat** (highest) | 404-not-403 for non-participants; mandatory cross-couple access tests at Application + API layers (§16 regression). |
| **Schema drift** (dev `EnsureCreated` vs prod `Migrate`) | Generate + verify the `AddMessaging` migration before merge; CI check that model has no pending migration. |
| **Two-aggregate write (message + conversation touch)** partially applied | Single `SaveChangesAsync` unit of work → atomic; events dispatch post-save together. |
| **N+1 in list/thread** (as in `GetConnectionsQueryHandler`) | Projected single queries + `Include`; denormalized last-message fields. |
| **Real-time later needs backplane** | Domain events + stable DTOs isolate the change to a new `INotificationHandler` + hub; note Redis backplane needed for App Service scale-out (future). |
| **Media abuse / large uploads** | Size+MIME limits, `[RequestSizeLimit]`, reject executable MIME; future per-conversation send throttle. |
| **Orphaned blobs on delete** | `DeleteAsync` on message delete; accept eventual best-effort (a future sweep job is out of scope). |
| **Over-engineering** | Deliberately deferred: transcoding, thumbnails, search, retention jobs, custom meter — all listed, none built. |

---

## 16. Testing Strategy (Comprehensive — traceable)

No FR without coverage. Layers mirror existing test projects.

**Domain unit (`Saha.Domain.Tests`)** — invariants & value objects:
- FR-1/6 conversation factories (partner: 2 participants; group: ≥2 couples else `GROUP_NEEDS_TWO_COUPLES`). FR-4/6/7/8 `CreateGroup`/`Rename`(owner guard)/`AddCouple`(dup guard). FR-2/3 partner pin/hide guards throw. FR-13–18 `Message` create/edit(sender guard)/delete(tombstone). FR-21–23 reaction upsert/replace/remove; `ReactionEmoji` allowlist (FR-24/A4). `ConversationName` bounds.

**Application (`Saha.Application.Tests`)** — handlers, validators, authorization:
- FR-25 couple-isolation: every handler rejects non-participant (→ NotFound). FR-4 connection-gate on create (unconnected → conflict). FR-7 non-owner rename → Forbidden. FR-8 add-couple eligibility (A1). FR-17/19 edit/delete non-sender → Forbidden. FR-12 hide affects only acting couple's state. Validators for send/rename/create.

**Infrastructure (`Saha.Infrastructure.Tests`)** — repositories/persistence:
- `IConversationRepository.GetListForCoupleAsync` excludes hidden, orders partner-first. Unique `(MessageId, PartnerId)` prevents duplicate reactions. Cursor pagination correctness. Partner-conversation uniqueness index.

**API integration (`Saha.API.Tests`, `WebApplicationFactory`)** — one per endpoint + spec §9.2:
- FR-1 register → partner chat exists. FR-4 create group connected ✓ / unconnected ✗. FR-10/2 list returns partner pinned first. FR-7 rename owner-only. FR-8 add eligible couple. FR-13/14/15 send+list text/media. FR-17/18/19 edit/delete authz. FR-21–24 react/change/remove. FR-12 hide hides for current couple only.

**Frontend unit (Vitest + Testing Library + MSW)** — spec §9.3:
- List render, partner pinned top, pin/unpin, delete/hide, select conversation, render text/photo/video bubbles, send, edit-own, delete-own, reaction add/change/remove, owner-gated rename UI, add-couple flow, loading/empty/error states.

**E2E (Playwright, `frontend/tests/e2e/messages/`)** — spec §9.4:
- Open Messages from sidebar; partner chat pinned; send in partner chat; create group with connected couple; unconnected couple unavailable; four individuals in a 2-couple group; owner rename ✓ / non-owner ✗; add eligible couple; text appears; photo/video select→preview→thread; edit own; delete own; react + change/remove; pin/unpin; hide for current couple; **mobile viewport no overlap**.

**Regression checklist (high-impact):** (1) couple isolation — cross-couple read/write/react/edit all blocked; (2) connection-gating on create + add-couple; (3) partner conversation immutability (no delete/hide/pin change, always first); (4) sender-only mutation; (5) one-reaction-per-person; (6) migration applies cleanly on both SQLite and SQL Server.

**De-scoped (justified):** load/perf tests beyond index design (no scale targets given — §14); real-time/concurrency broadcast tests (feature out of scope). Concurrency test retained for the one true race: two partners of one couple reacting/hiding simultaneously → last-write-wins on the single coupleState/reaction row (covered by the unique-index test).

---

## 17. Decision Log

| # | Decision | Why |
|---|---|---|
| **D1** | Two aggregates: `Conversation` and `Message` (message references conversation by id, not nested) | Unbounded history; enables pagination + per-message real-time events without loading the conversation. |
| **D2** | Partner conversation created via `CoupleRegisteredEvent` handler **and** idempotent `EnsurePartnerConversationAsync` on list | Satisfies "auto-created after registration" + self-heals existing couples and any post-commit failure. |
| **D3** | Non-participant → **404**, not 403 | Prevents leaking existence of other couples' conversations (isolation). |
| **D4** | New message **un-hides** the conversation for all couples | A hidden chat resurfacing on new activity matches messaging-app expectation; avoids "lost" messages. |
| **D5** | Message delete = **tombstone**, clears body+attachment(+reactions), keeps row | Preserves thread ordering/context; meets "don't expose deleted content" without breaking pagination. |
| **D6** | Per-couple pin/hide in `ConversationCoupleState` (not per-partner) | FR-12: hide affects **both** partners of a couple; couple is the unit. |
| **D7** | Reaction stored as stable **token** not raw emoji | Server-validatable allowlist (A4), render-flexible, avoids Unicode edge cases. |
| **D8** | Denormalized `LastActivityAt`/`LastMessagePreview` on `Conversation` | Fast list without N+1 (contrast `GetConnectionsQueryHandler`). |
| **D9** | Media reuses `IBlobStorageService` + Null-service local pattern; no transcoding | Consistency with Profile upload; keeps scope disciplined (A3). |
| **D10** | Domain events for every mutation as the real-time seam | FR-26 without building transport; future `INotificationHandler` + SignalR hub is additive. |

---

## Final Status: **Ready for Implementation (with stated assumptions)**

All four blocking product decisions (A1–A4) are resolved. Remaining items in §14 are non-blocking defaults an implementer can proceed on; flag any that conflict with product intent (most likely: exact media caps and the final curated reaction set).
