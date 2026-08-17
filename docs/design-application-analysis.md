# Design Application Analysis — "Together · Hearth Desktop"

**Status:** Awaiting decisions on the 5 blocking questions in §8. No specs written, no code changed.
**Date:** 2026-07-09
**Source design:** `Together - Hearth Desktop.pdf` (28 desktop screens, light + dark)
**Workflow stage:** Phase 4 (analysis) of [`ai-first-development-workflow.md`](./ai-first-development-workflow.md). Next stage is Phase 5 (`create-spec`), gated on §8.

> This document is an evidence-based map of the proposed designs against the
> repository as it stood at commit `e9278d9`. Every claim about current behavior
> cites a file path. Where the designs imply behavior that the repo cannot
> confirm, it is recorded as an assumption (§8) rather than treated as settled.

---

## 1. Summary

The PDF specifies **28 desktop screens across 6 sections, in both light and dark themes** — not a visual refresh of the current app but a **re-founding of its information architecture** around a "rooms in a home" metaphor:

| Section | Screens |
|---|---|
| Start | Welcome, Onboarding 1, Onboarding 2, Invitation |
| Core | Home, Moments, Messages, Calendar |
| Memories | Hub, Album, Timeline, Viewer |
| Plans | Goals, Lists, Date ideas, Trip, Countdowns |
| Us | Notes, Our story, Profile, Together Plus |
| System | Settings, Notifications, Search, Archive |
| States | Empty, Offline, Error & loading |

The through-line is emotional restraint: *"progress that warms, not races"*, *"Loved by both, no counts"*, *"an attic instead of a trash can"*, *"a digest that doesn't nag"*, *"errors apologize like a person"*. These are product constraints, not copy suggestions — "no counts" forbids a like counter, and "never deleted" forbids a destructive delete.

Three things are conspicuously **absent** from the designs, all of which exist in the shipped app today: **Finance**, **Connect**, and — most consequentially — **the entire returning-user auth surface**. The Start section is explicitly *"First-run on the web."* It contains no sign-in screen, no registration form, and no password recovery. The word "register" never appears in the deck.

## 2. Current Product Fit

Fit is **good at the token layer, poor at the architecture layer.**

The visual foundation already matches: a cream/sandstone/gold palette lives in [tailwind.config.ts:72-82](../frontend/tailwind.config.ts#L72-L82), and light/dark/system theming is fully implemented in [theme.store.ts](../frontend/src/shared/stores/theme.store.ts). The dark-theme half of the design deck therefore costs far less than the page count suggests.

But the designs assume a product model Saha does not have. Today Saha is a **shared account created atomically**: [`Couple.Register`](../backend/src/Saha.Domain/Entities/Couple.cs#L27-L71) constructs *both* partners in one call with one shared `PasswordHash`. The designs' "Invitation — two circles waiting to overlap" implies a partner joins *after* the couple exists. That single divergence is the largest risk in this document, and it is a blocking question rather than an assumption.

Of the 28 screens, roughly **4 are redesigns of existing surfaces, 2 are enhancements, and 22 require new product behavior.**

## 3. Existing Implementation Found

**Fully built and verified in code:**

- **Auth / shared account** — [AuthController.cs](../backend/src/Saha.API/Controllers/AuthController.cs), [Couple.cs](../backend/src/Saha.Domain/Entities/Couple.cs). JWT access token + HttpOnly refresh cookie.
- **Messaging** — this is real and complete, despite [.ai/FEATURES.md:62](../.ai/FEATURES.md#L62) still listing `messages` as a placeholder. Six entities exist ([Conversation](../backend/src/Saha.Domain/Entities/Conversation.cs), `Message`, `MessageAttachment`, `MessageReaction`, `ConversationParticipant`, `ConversationCoupleState`), plus [ConversationsController.cs](../backend/src/Saha.API/Controllers/ConversationsController.cs) and [MessagesController.cs](../backend/src/Saha.API/Controllers/MessagesController.cs), and a migration `20260707191719_AddMessaging`. **FEATURES.md is stale and should be corrected.**
- **Couple-to-couple Connect** — [ConnectController.cs](../backend/src/Saha.API/Controllers/ConnectController.cs), [CoupleConnection.cs](../backend/src/Saha.Domain/Entities/CoupleConnection.cs).
- **Profile** — [ProfileController.cs](../backend/src/Saha.API/Controllers/ProfileController.cs), incl. 5 MB picture upload via `IBlobStorageService`.
- **Theming** — light/dark/system, already wired into [SettingsPage.tsx](../frontend/src/modules/settings/pages/SettingsPage.tsx).
- **Reactions** — [MessageReaction.cs](../backend/src/Saha.Domain/Entities/MessageReaction.cs) stores one reaction per `(message, partner)` pair. This is *exactly* the shape "Loved by both" needs: partner identity is retained, so both-reacted is derivable without exposing a count.
- **Per-couple hide** — `ConversationCoupleState.IsHidden` ([ConversationCoupleState.cs:30-33](../backend/src/Saha.Domain/Entities/ConversationCoupleState.cs#L30-L33)) is a genuine precedent for the Archive/"attic" concept.

**Stubs — routed, rendering `ComingSoonModule`, zero backend:**
`memories`, `goals`, `calendar`, `finance` ([router.tsx:50-59](../frontend/src/app/router/router.tsx#L50-L59)).

**Partial:** [SettingsPage.tsx](../frontend/src/modules/settings/pages/SettingsPage.tsx) has working Appearance, but Notifications and Privacy & Security are literal "Coming soon" cards.

**Workflow harness:** [docs/ai-first-development-workflow.md](./ai-first-development-workflow.md), [progress/STATUS.md](../progress/STATUS.md), and a worked precedent in [features/couple-messaging.spec](../features/couple-messaging.spec) → [features/couple-messaging.tdd.md](../features/couple-messaging.tdd.md).

## 4. Gaps Identified

**Data model.** There is no story/anniversary date anywhere on `Couple` — required by Onboarding 1, Our Story, and "anniversaries auto-created" in Countdowns. There is no concept of per-couple module preferences ("Choose your rooms"), no entitlement/subscription, no notes, moments, memories, albums, goals, lists, trips, or countdowns.

**Infrastructure.** [.ai/ARCHITECTURE.md:64-66](../.ai/ARCHITECTURE.md#L64-L66) states there is no message queue and no background worker, and domain events dispatch synchronously inside `SaveChanges`. The **Notifications digest and quiet hours require scheduled background execution that does not exist.** Separately, there is no SignalR, no WebSocket, and no `refetchInterval` polling anywhere in the frontend — so **Messages' "home now" presence indicator has no transport.** (The only SignalR string matches in the tree are inside `obj/` build artifacts, not source.)

**Offline.** The Offline screen specifies a banner plus a *queued note* — a durable write queue surviving reload. TanStack Query is present but no persister or mutation queue is configured.

**Search.** "One box across everything" has no backend. This is the single most privacy-sensitive gap, because group conversations already contain messages authored by *other couples* ([Conversation.CreateGroup](../backend/src/Saha.Domain/Entities/Conversation.cs#L50)).

**Semantic conflict — "never deleted."** Archive promises content is tucked away, never deleted. But [`Message.Delete`](../backend/src/Saha.Domain/Entities/Message.cs#L89-L100) sets `IsDeleted`, stamps `DeletedAt`, **and nulls out `Attachment`** — destroying the attachment reference irrecoverably. Archive semantics and current delete semantics are not the same thing and must not be conflated.

**Navigation.** [Sidebar.tsx:26-36](../frontend/src/shared/components/layout/Sidebar.tsx#L26-L36) is a flat 9-item list. The designs require a grouped, sectioned shell.

**Theming edge case.** "The viewer stays dark in both themes." The theme store toggles a `dark` class on `document.documentElement` globally — there is no scoped-theme mechanism for one surface to opt out.

## 5. Design-to-Code Mapping

| # | Design Requirement | Existing Support | Current Files | Gap | Required Action | Risk |
|---|---|---|---|---|---|---|
| 1 | Welcome (one centered decision) | None | — | New screen | New feature required · Spec | Low |
| 2 | Onboarding 1 — names + **story date** | Register form only; no date field | [Couple.cs](../backend/src/Saha.Domain/Entities/Couple.cs) | New column + migration | New feature · Spec · TDD | **High** |
| 3 | Onboarding 2 — "Choose your rooms" | None | [Sidebar.tsx](../frontend/src/shared/components/layout/Sidebar.tsx) | Per-couple prefs + nav gating | New feature · Spec | Medium |
| 4 | **Invitation — two circles** | Atomic 2-partner register | [Couple.cs:27-71](../backend/src/Saha.Domain/Entities/Couple.cs#L27-L71) | Contradicts core model | **Needs clarification** | **Critical** |
| 5 | Home — hearth two-column | Module-grid dashboard | [DashboardPage.tsx](../frontend/src/modules/dashboard/pages/DashboardPage.tsx) | Depends on 6, 15, 20 | Existing enhancement | Medium |
| 6 | Moments — finite feed | None | — | New domain | New feature · Spec · TDD | Medium |
| 7 | Messages — wide composer | Full backend + UI | [MessagesController.cs](../backend/src/Saha.API/Controllers/MessagesController.cs) | Desktop layout only | Minor UI update | Low |
| 8 | Messages — **"home now" presence** | None; no realtime | [.ai/ARCHITECTURE.md:87](../.ai/ARCHITECTURE.md#L87) | No transport | New feature · Spec | **High** |
| 9 | Calendar — month grid + dots | Stub | [CalendarPage.tsx](../frontend/src/modules/calendar/pages/CalendarPage.tsx) | New domain | New feature · Spec · TDD | Medium |
| 10 | Memories hub / Album / Timeline | Stub | [MemoriesPage.tsx](../frontend/src/modules/memories/pages/MemoriesPage.tsx) | New domain + media | New feature · Spec · TDD | **High** |
| 11 | Album "shared ownership line" | Cross-couple only in chat | [Conversation.cs:50](../backend/src/Saha.Domain/Entities/Conversation.cs#L50) | New visibility class | New feature · **Spec** | **Critical** |
| 12 | Viewer — dark in both themes | Global `dark` class | [theme.store.ts](../frontend/src/shared/stores/theme.store.ts) | No scoped theme | Minor logic update | Low |
| 13 | Viewer — "Loved by both", no counts | Per-partner reactions | [MessageReaction.cs](../backend/src/Saha.Domain/Entities/MessageReaction.cs) | Reuse shape for media | New feature (pattern exists) | Medium |
| 14 | Goals — progress that warms | Stub | [GoalsPage.tsx](../frontend/src/modules/goals/pages/GoalsPage.tsx) | New domain | New feature · Spec · TDD | Low |
| 15 | Lists (Bucket/Wishlist/Date ideas) | None | — | New domain | New feature · Spec · TDD | Low |
| 16 | Date ideas — "draw a card" | None | — | Selection semantics unclear | New feature · Spec | Low |
| 17 | Trip — plan + packing | None | — | New domain | New feature · Spec · TDD | Low |
| 18 | Countdowns — **anniversaries auto-created** | None | — | Depends on #2 | New feature · Spec · TDD | Medium |
| 19 | Notes — fridge/corkboard | None | — | New domain | New feature · Spec · TDD | Medium |
| 20 | Our story — "numbers that warm" | None | — | Cross-domain read model | New feature · Spec | Medium |
| 21 | Us (Profile) — couple is the profile | Per-partner profile | [ProfileController.cs](../backend/src/Saha.API/Controllers/ProfileController.cs) | Reframe to couple | Existing enhancement | Medium |
| 22 | **Together Plus — paywall** | None | — | Billing + entitlements | New feature · **Spec** | **Critical** |
| 23 | Settings — privacy card up top | "Coming soon" card | [SettingsPage.tsx](../frontend/src/modules/settings/pages/SettingsPage.tsx) | No privacy backend | New feature · Spec | **High** |
| 24 | Notifications — digest, quiet hours | "Coming soon" card | [.ai/ARCHITECTURE.md:64-66](../.ai/ARCHITECTURE.md#L64-L66) | No worker/scheduler | New feature · Spec · TDD | **High** |
| 25 | **Search — one box across everything** | None | — | Cross-domain, leak-prone | New feature · **Spec** | **Critical** |
| 26 | Archive — "never deleted" | `IsHidden` precedent | [ConversationCoupleState.cs:30](../backend/src/Saha.Domain/Entities/ConversationCoupleState.cs#L30) | Conflicts w/ `Message.Delete` | Existing enhancement · Spec | **High** |
| 27 | Offline — banner + queued note | None | — | No durable queue | New feature · Spec | **High** |
| 28 | Error & loading — cream skeletons | Partial | [shared/components/feedback/](../frontend/src/shared/components/feedback/) | Skeletons + copy | Minor UI update | Low |
| 29 | Empty — "the shelf is ready" | `ComingSoonModule` only | [ComingSoonModule.tsx](../frontend/src/shared/components/feedback/ComingSoonModule.tsx) | Per-room empties | Minor UI update | Low |
| 30 | Sectioned nav shell | Flat 9-item list | [Sidebar.tsx:26-36](../frontend/src/shared/components/layout/Sidebar.tsx#L26-L36) | Regroup | Minor UI update | Low |
| 31 | **Finance absent from designs** | Routed stub + card | [FinancePage.tsx](../frontend/src/modules/finance/pages/FinancePage.tsx) | Intent unknown | **Needs clarification** | Medium |
| 32 | **Connect absent from designs** | Fully built | [ConnectController.cs](../backend/src/Saha.API/Controllers/ConnectController.cs) | Group chat depends on it | **Needs clarification** | **High** |
| 33 | **Login / Register / Forgot / Reset absent from designs** | All four shipped | [modules/auth/pages/](../frontend/src/modules/auth/pages/) | Deck is first-run only; no returning-user or recovery flow drawn | **Needs clarification** | **High** |

**Risk legend rationale.** Critical items each cross a release-blocking line: #4 mutates the auth/account aggregate; #11 and #25 create or expose cross-couple visibility; #22 introduces payment consent on a *shared* account where either partner's action binds both.

## 6. New Features Required

Ordered by risk, not by design-deck order.

### A. Search — `create-spec` required (mandatory)
Needed because "one box across everything" is the only screen that reads *every* domain at once. User impact: high discoverability. **Privacy impact — severe:** a naive index scoped by `CoupleId` will surface, in your results, message bodies authored by partners of *other* couples inside shared group conversations. The spec must define whether group content is searchable at all, and by whom.
*Files likely affected:* new `Features/Search/`, `SearchController.cs`, frontend `modules/search`.

### B. Together Plus — `create-spec` required (mandatory)
Needed for monetization. **Consent impact — severe:** Saha has one password and one account per couple ([Couple.cs](../backend/src/Saha.Domain/Entities/Couple.cs)). Either partner can therefore authorize a recurring charge binding both. The spec must state who may purchase, who may cancel, what the other partner sees, and what happens to Plus-gated content on lapse.
*Files likely affected:* new `Domain/Entities/Subscription.cs`, entitlement middleware, `modules/plus`.

### C. Memories + Album sharing — `create-spec` required
"Shared ownership line" implies an album may belong to more than one couple. Today the *only* cross-couple visibility surface is a group `Conversation`. Extending sharing to media is a new visibility class with real data-exposure risk. Spec this **separately** from the Memories viewer/timeline UI.
*Files likely affected:* `Domain/Entities/{Album,Memory}.cs`, `IBlobStorageService`, `modules/memories`.

### D. Partner presence ("home now") — `create-spec` required
Requires transport that doesn't exist. Presence is also a privacy signal — it reveals when a person is active.
*Files likely affected:* SignalR hub or polled `/presence` endpoint, `modules/messages`.

### E. Notifications: digest + quiet hours — `create-spec` required
Requires a scheduler/worker Saha does not have.
*Files likely affected:* background service, `Domain/Entities/NotificationPreference.cs`.

### F. Archive / "the attic" — `create-spec` required
Must reconcile "never deleted" against [`Message.Delete`](../backend/src/Saha.Domain/Entities/Message.cs#L89-L100), which nulls `Attachment`. Data-loss risk if the two are merged carelessly.

### G. Offline queue — `create-spec` required
Durable, survives reload; conflict resolution on replay. Data-loss risk.

### H. Story date + Countdowns + Our Story — one spec
`Couple.StoryDate` (nullable, backfill), auto-created anniversaries, warm stats. Migration + backward compatibility for existing couples.

### I. Lower-risk new domains — one spec each, no cross-couple exposure
Moments, Calendar, Notes, Goals, Lists + Date ideas, Trip.

## 7. Existing Features That Need Updates

- **Dashboard → Home** — [DashboardPage.tsx](../frontend/src/modules/dashboard/pages/DashboardPage.tsx) becomes the hearth. Blocked on Moments and Notes existing.
- **Profile → Us** — [ProfileController.cs](../backend/src/Saha.API/Controllers/ProfileController.cs) currently returns *per-partner* profiles (`/me`, `/partner`). "The couple is the profile" needs a couple-level read model.
- **Settings** — replace the two "Coming soon" cards with a real Privacy card.
- **Messages** — desktop layout + presence.
- **Sidebar** — regroup into sections.
- **Theme store** — add a scoped forced-dark surface for the Viewer.
- **[.ai/FEATURES.md](../.ai/FEATURES.md)** — correct the stale claim that `messages` is an unimplemented placeholder (line 62).

## 8. Open Questions

Four, all genuinely blocking.

1. **Does "Invitation" mean partner-invites-partner, or couple-invites-couple? Relatedly: what is Welcome's "one centered decision"?**
   Blocking because the answers are architecturally opposite. If partner→partner, `Couple` must tolerate a one-partner state — and today it cannot: [`Couple.Husband`](../backend/src/Saha.Domain/Entities/Couple.cs#L20) is `_partners.Single(...)`, which **throws** when the partner is absent, and [`Conversation.CreatePartner`](../backend/src/Saha.Domain/Entities/Conversation.cs#L29) requires both `husbandId` and `wifeId`. That is a change to the auth aggregate, the login DTO, and messaging bootstrap. If couple→couple, it is a re-skin of the existing Connect module and costs almost nothing.

   The **absent login screen is evidence bearing on this question.** Welcome is specified as *"Nothing else on screen competes with the one decision being made"* — but a returning user, a new couple, and an invited partner each need a *different* decision. If the one decision is "Start our home" vs. "Join my partner," the deck is implicitly asserting the partner-invite model. If it is "Sign up" vs. "Sign in," it is a re-skin of [AuthLayout](../frontend/src/shared/components/layout/AuthLayout.tsx). The deck does not say.

2. **Do Login, Forgot password, and Reset password survive un-redesigned, or is a second deck pending?**
   All four auth pages ship today ([modules/auth/pages/](../frontend/src/modules/auth/pages/)). Password recovery cannot simply be dropped: [`AuthController`](../backend/src/Saha.API/Controllers/AuthController.cs) exposes `/forgot-password` and `/reset-password`, and reset is entered from an emailed link rather than from inside the app. Left un-redesigned, these four screens will read as visually foreign against the new cream-field Start section.

3. **Is Finance being dropped, or merely absent from this deck?** It is currently routed, in the sidebar, and on the dashboard. Removing it is a user-visible regression; leaving it in contradicts the deck's IA.

4. **Is Connect surviving as a distinct room?** It is absent from the designs, but group messaging depends on `CoupleConnection` — silently removing its entry point would strand a shipped feature.

5. **In Search, is group-conversation content in scope?** Group messages are authored by other couples. Including them is a cross-couple disclosure decision that must be made deliberately, not defaulted.

### Assumptions being carried (non-blocking, documented rather than asked)

- Dark theme reuses existing tokens; no new palette.
- "Loved by both" is a presentation rule over existing per-partner reactions, not a new counter.
- Mobile is out of scope for this deck ("— desktop" on every section); existing responsive behavior is preserved.
- "Choose your rooms" gates navigation only; it does not delete data or revoke access.

## 9. Recommended Execution Plan

### Phase A — Specs to create (`create-spec`), in this order
Ordered by risk, not by user-visible value, because each of the first three constrains everything downstream.

1. Story date + Countdowns + Our Story *(unblocks Home, Calendar, Onboarding)*
2. Archive / attic semantics *(settles delete-vs-archive before any new domain writes data)*
3. Search *(privacy-defining; determines what every later domain must expose)*
4. Together Plus *(consent-defining)*
5. Memories + Album sharing
6. Presence
7. Notifications
8. Offline queue
9–14. Moments, Calendar, Notes, Goals, Lists + Date ideas, Trip *(one spec each)*
15. Navigation shell + Home hearth + Empty/Error/Loading *(pure UI; last)*

### Phase B — `review-spec` → TDD
Each spec reviewed individually. The Search, Together Plus, Memories-sharing, and Archive TDDs must each carry an explicit **privacy-enforcement section** and a **migration/backward-compat section** (existing couples have no `StoryDate`; existing messages have `IsDeleted` rows that predate archive semantics).

### Phase C — Implementation order (`tdd-implement`), vertical slices
Nav shell → Story date → Countdowns/Our Story → Notes → Moments → Home hearth → Calendar → Memories → Archive → Search → Presence → Notifications → Offline → Plans domains → **Together Plus last**.

Together Plus goes last deliberately: it gates other rooms, so it should not be built until those rooms exist to gate.

### Phase D — Test/validation plan
Per the existing pyramid (xUnit / Vitest / Playwright, [TESTING_GUIDE.md](./development/TESTING_GUIDE.md)):

- Domain-invariant unit tests for every new aggregate.
- `WebApplicationFactory` integration tests asserting **cross-couple access returns 403/404, not empty results**.
- A dedicated negative-authorization suite for Search and Album sharing.
- Playwright coverage for onboarding, offline queue replay, and paywall gating.
- Every new EF change ships as a migration — [.ai/ARCHITECTURE.md:82](../.ai/ARCHITECTURE.md#L82) warns dev uses `EnsureCreated` while prod uses `Migrate`, so model-only changes drift prod silently.

## 10. Recommendation

**Clarify first, then split — do not proceed to specs yet.**

Three reasons. The deck is ~22 new features; implementing it as one program would violate the repo's own small-slice workflow. Question 1 (Invitation / Welcome's "one decision") can invalidate the auth aggregate design, and any spec written before it is answered risks being thrown away. And four requirements — Search, Together Plus, Album sharing, Invitation — touch privacy, consent, or cross-couple visibility, which are release-blocking concerns for Saha.

A further caution on scope: the deck is **first-run only** on the auth side. It is not a complete replacement IA, so "implement the designs" cannot mean "delete what isn't drawn."

Concrete proposal: **answer the five questions in §8, then write only spec #1 (Story date + Countdowns + Our Story) and spec #2 (Archive semantics).** Those two are low-blast-radius, unblock the most downstream work, and will validate that the `create-spec` → `review-spec` → `tdd-implement` loop produces the required quality bar before it is spent on the critical-risk specs.
