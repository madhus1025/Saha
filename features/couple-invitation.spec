# PM Spec: Couple Invitation — Invite & Accept

**Feature:** Couple Invitation (invite your person · accept an invitation)
**Slug:** `couple-invitation`
**Module:** `auth`
**Date:** 2026-07-12
**Status:** `Ready for review-spec (with stated assumptions)`

**Depends on / completes:** [`features/auth-login-registration.spec`](./auth-login-registration.spec) assumption **A6**, and Chunk 3 of [`features/auth-login-registration.tdd.md`](./auth-login-registration.tdd.md).
**Design voice (normative):** [`docs/design/auth/README.md`](../docs/design/auth/README.md)

> **Scope correction.** The originating request assumed these screens need no backend change. They do — **two read endpoints** (§Functional Requirements, FR-2 and FR-12). The invitation *write* path (`POST /auth/invitations`, `POST /auth/invitations/accept`) is already built and tested; nothing here re-specifies it. But nothing can *read* an invitation without accepting it, and the invite link is returned exactly once, so the invitee cannot see what they're joining and the registrant cannot recover a lost link. Both are read-only additions to an entity that already exists.

---

## Executive Summary

A Saha couple is created with one partner. It is not a home until the second partner arrives. These two screens are how they arrive: the registrant invites their person, and their person accepts. Until they ship, every couple that registers is stranded at the waiting threshold — which is why registration is currently flagged off in production.

The invite screen lets the signed-in registrant name their partner and hand them a link. The acceptance screen lets that partner fill in their own half — the same half the registrant filled in for themselves — see the home they're joining, and step inside. The moment they accept, the couple becomes `Complete`: the pinned partner chat appears, and the couple becomes findable by other couples.

The hard truths this feature has to tell plainly, in the deck's voice and never as a scold: the invitee inherits a password they didn't choose (so the screen tells them to ask their partner for it), and they inherit a public, permanent TogetherID they didn't choose (so the screen shows it to them before the button, per FR-30). Nothing about waiting is framed as an error; the deck treats it as anticipation.

---

## Background

The completed backend (verified in `backend/src/Saha.Domain/Entities/Couple.cs` and `Features/Auth/Commands/{CreateInvitation,AcceptInvitation}`):

- `POST /auth/invitations` (authenticated): mints a 512-bit token, returns it in plain text **once**, stores only its SHA-256 hash, supersedes any still-pending invitation, and rejects with `409` if the couple is already `Complete`.
- `POST /auth/invitations/accept` (anonymous): resolves the couple by token hash, rejects an unknown token with `404` and an expired/used one with `409`, assigns the invitee the **complementary** role, raises `CoupleCompletedEvent` (which provisions the pinned partner chat), and signs the invitee in.
- `Invitation:TokenTtlHours` defaults to **168** (7 days).
- The couple lifecycle, the pinned-chat provisioning, and Connect discoverability of `Complete` couples are all done and out of scope here.

Frontend stubs to replace: `frontend/src/modules/auth/pages/InvitePage.tsx` (route `/invite`, authenticated) and `AcceptInvitationPage.tsx` (route `/invite/accept`, guest). The waiting threshold `WaitingPage.tsx` already polls `GET /auth/session` for completion.

---

## Problem Statement

1. **A registered couple cannot become usable.** With no invite/accept UI, the second partner has no way in. This is the single blocker keeping registration flagged off.
2. **The invitee would commit blind.** FR-30 requires they see the TogetherID before accepting. No endpoint can read an invitation without accepting it, so today they couldn't.
3. **The registrant can lose the only copy of the invite link.** It is returned once. A page reload loses it, with no way to see it again or to know whether the invitation is still pending.
4. **Two inherited facts are jarring if unexplained.** The invitee never chose the shared password (and it can never be shown to them — it's a hash) or the TogetherID (public and permanent). Both must be surfaced honestly, before the button.

---

## Goals

Prioritized.

1. A registrant can invite their partner and hand them a working link.
2. An invited partner can see what they're joining — the TogetherID, who invited them, their role — **before** committing (FR-30).
3. Accepting completes the couple and drops both partners into a working home.
4. The invitee learns how to get the shared password without the product ever storing or emailing it.
5. A registrant who loses the link, or whose invitation lapses, can resend or re-address it from the waiting threshold.
6. Every failure state reads as calm and non-scolding.

## Non-Goals

- **Any change to the invitation write path or the couple lifecycle.** Built and tested.
- Reaping couples whose invitation lapsed and was never resent (a broader account-lifecycle decision — see **A5**).
- Per-partner passwords or any second credential. Saha has one shared password per couple, deliberately.
- Emailing the invitation as the *primary* channel. Link-first; email is an optional extra (**D-3**).
- Dark theme.

---

## User Personas & Access Rules

| Persona | Definition | What they may do here |
| --- | --- | --- |
| **Registrant** | Signed in; couple is `AwaitingPartner` | Create/resend/re-address the invitation; see its status; copy the link |
| **Invitee** | Holds an invitation token; not signed in | Preview the invitation; supply their own half; accept |
| **Partner** (post-accept) | Member of a now-`Complete` couple | Full app access (governed by the login/registration spec, not here) |
| **Anyone else** | — | Nothing. A token they don't hold reveals nothing. |

- The invite screen is **couple-scoped and registrant-only** in practice (only an `AwaitingPartner` couple has a registrant with no partner). A `Complete` couple reaching `/invite` is sent to the app.
- The preview is **token-scoped**: possession of the token is the entire authorization. There is no couple session.

---

## User Stories

**US-1 — I hand my person a way in.**
As a registrant, I name my partner and get a link I can send them however I like.
*Acceptance:* After creating the invitation, a copy-able link is shown, and the screen states who it's for.

**US-2 — I don't lose the link.**
As a registrant who closed the tab, I can return and see the pending invitation and its link again.
*Acceptance:* Returning to `/invite` shows the pending invitation's recipient, status, and a fresh link.

**US-3 — I see what I'm joining before I commit.**
As an invitee, before I fill anything in I see the TogetherID, who invited me, and the role I'll take.
*Acceptance:* The acceptance screen shows all three before the form is submittable (FR-9, satisfies FR-30).

**US-4 — I fill in only my own half.**
As an invitee, I enter my own name, username, DOB, email, and phone — never my partner's.
*Acceptance:* No field asks about the registrant.

**US-5 — I'm told how to get the password.**
As an invitee, the screen tells me the shared password is the one my partner chose, and to ask them.
*Acceptance:* The acceptance screen states this plainly and never prompts me to set a password.

**US-6 — Accepting opens the home.**
As an invitee, when I accept I'm signed in and both of us have a working home.
*Acceptance:* Acceptance transitions the couple to `Complete` and lands me in the app.

**US-7 — A stale link doesn't strand us.**
As a registrant, if my invitation expired or I mistyped the email, I can resend or re-address it.
*Acceptance:* The waiting threshold offers Resend and Change-email; each issues a fresh invitation.

**US-8 — Nothing scolds me.**
As an invitee hitting an expired or already-used link, I'm told calmly what happened and what to do.
*Acceptance:* No failure state uses red as its primary signal or the words *invalid*, *failed*, or *error*.

---

## Functional Requirements

`TDD-FR-*` denotes the new backend reads this spec introduces; everything else is UI over the existing write path.

### Invite screen — `/invite` (authenticated registrant)

- **FR-1** The system shall let a registrant of an `AwaitingPartner` couple enter their partner's **name** and **email**, and create an invitation from them.
- **TDD-FR-2** The system shall provide an **authenticated read** of the couple's current pending invitation, returning the invitee's name, email, status, and expiry — so the screen survives a reload and can show what was sent. *(New endpoint; see §Scope correction.)*
- **FR-3** After an invitation exists, the system shall display a **copy-able invite link** containing the token, and a one-tap copy affordance.
- **FR-4** The system shall present emailing the link to the invitee's address as an **optional secondary** action, clearly not required. *(D-3; if `NullEmailService` is active the action may be hidden or state that email is unavailable — a config concern for the TDD.)*
- **FR-5** The system shall state, in the deck's voice, who the invitation is for and that the home opens when they arrive.
- **FR-6** Creating a second invitation while one is pending shall **supersede** the first (the prior link stops working) and the screen shall make clear only the newest link is live.
- **FR-7** A registrant whose couple is already `Complete` reaching `/invite` shall be routed into the app, not shown this screen.

### Waiting threshold — `WaitingPage.tsx` (additions only)

- **FR-8** Using TDD-FR-2, the waiting threshold shall name the invited partner and the address the invitation went to, and offer **Resend** and **Change their email**, each of which issues a fresh invitation (superseding the pending one).

### Accept screen — `/invite/accept` (guest, token-scoped)

- **FR-9** Before the form is submittable, the system shall show the invitee: the **TogetherID** they are joining, **who invited them** (the inviter's name), and their **role** (read-only, auto-derived). *(Satisfies auth spec FR-30.)*
- **TDD-FR-10** The system shall provide a **public read of an invitation by token**, returning only: TogetherID, inviter's name, the invitee's own name, the invitee's role, and expiry. It shall **not** return the registrant's email, phone, DOB, or any couple content. *(New endpoint; see §Privacy.)*
- **FR-11** The system shall collect the invitee's own **name, username, date of birth (16+), email, phone** — and nothing about the registrant.
- **FR-12** The system shall **prefill** the invitee's email from the invitation and allow them to correct it. Acceptance shall **not** require the submitted email to match the invited address. *(D-4.)*
- **FR-13** The system shall **not** ask the invitee to choose or set a password. It shall state that the shared password is the one their partner chose, and to ask them for it. *(D-2.)*
- **FR-14** The role shown shall be the complement of the registrant's, shown read-only; the invitee cannot change it.
- **FR-15** On successful acceptance the system shall sign the invitee in and route them into the app (the couple is now `Complete`).
- **FR-16** The system shall validate username and TogetherID inputs to the same rules as registration, in the same non-scolding voice.

### Product-visible failure states (accept screen), all non-scolding

- **FR-17** **Token unknown** (`404`): "This invitation doesn't lead anywhere anymore." Offer a path to sign in / request a fresh link.
- **FR-18** **Token expired** (`409`): "This invitation has gently expired. Ask your person to send a fresh one." No red, no alarm.
- **FR-19** **Token already used** / **couple already complete** (`409`): "This home is already open. Try signing in." Route to login.
- **FR-20** **Username already taken** (`409`): inline on the username field, warmly; the rest of the form is preserved.
- **FR-21** **Invitee's username or email equals the registrant's** (`400` from `USERNAMES_MUST_DIFFER` / `EMAILS_MUST_DIFFER`): a **field-level** message ("You and your partner need different usernames"), not a generic error banner. *(See **OQ-2** — this currently surfaces as a raw 400.)*

---

## Non-Functional Requirements

- **Tone.** No failure state in this feature uses red as its primary signal, an exclamation mark, or the words *invalid*, *failed*, or *error*.
- **Accessibility.** WCAG 2.1 AA. The read-only role and TogetherID are conveyed as text; the copy-link control is keyboard-operable and announces success; form errors are announced.
- **The link is a secret.** The invite link carries a live credential. It must never appear in analytics, logs, or any telemetry event (§Success Metrics).
- **Reload resilience.** The invite screen reconstructs its state from TDD-FR-2, not from client memory — the token is not persisted client-side.
- **Preview latency.** The public preview should resolve fast enough to gate the form without a jarring wait (target < 300 ms p95); it is a single indexed read.

---

## Key User Flows & UX Considerations

**Flow A — Invite (registrant).**
Register → land on `/invite` → enter partner's name + email → invitation created → copy link (or optionally email it) → go to the waiting threshold, which now names the invited partner and where the link went.

**Flow B — Reload / recover (registrant).**
Return to `/invite` (or `/waiting`) later → the pending invitation is read back (TDD-FR-2) → the link is shown again → Resend or Change-email available.

**Flow C — Accept (invitee).**
Open link → preview loads (TDD-FR-10): "You've been invited to **MAYA-ARUN** by Maya. You'll be the Husband." → fill in own half → see "the shared password is Maya's — ask her" → Accept → signed in, home open.

**Flow D — Stale link (invitee).**
Open an expired/used link → calm explanation (FR-18/19) → path to sign in or request a fresh one.

**UX considerations.**

- The preview (who invited you, which home, which role) sits **above** the form — consequences before the button, matching the deck.
- The password note is informational, styled as reassurance, not a warning.
- Copy-link gives immediate, visible confirmation ("Copied").
- The invite screen's primary action is the link; email is visibly secondary.

---

## High-Level Data Entities, Ownership & Visibility Rules

No new entities. `CoupleInvitation` (name, email, hashed token, expiry, status) already exists as a child of the `Couple` aggregate.

| Read | Audience | Reveals | Must never reveal |
| --- | --- | --- | --- |
| Public preview (TDD-FR-10) | Anyone holding the token | TogetherID (already public), inviter's name, invitee's own name + role, expiry | Registrant's email/phone/DOB; the invitee's email in full (**A3**); any couple content |
| Pending-invitation read (TDD-FR-2) | The registrant (authenticated) | Invitee name, invitee email (in full — the registrant typed it), status, expiry | — |

- The plain token exists only in the link. It is never stored, never re-derivable, never logged.
- An invitation is single-use and belongs to exactly one couple.

---

## Privacy, Security & Consent Considerations

**The token is the whole authorization for the preview.** Possession = the right to see the invitation and to become the couple's second partner. This is deliberate and adequate: 512 bits, single-use, 7-day expiry. But it means the preview is an unauthenticated read, so its payload is a security decision, not a convenience:

- **What it may reveal:** the TogetherID (public by design), the inviter's *name* (the invitee is about to share a home with them), and the invitee's own name/role.
- **What it must not:** the registrant's email, phone, or DOB; the couple's conversations; anything about connected couples. **(A3)** The invitee's own email should appear **masked** on the public preview (e.g. `a•••@post.com`) or be omitted — a token-holder is not necessarily the intended person, and echoing a full address confirms it to them.

**Consent is preserved end to end.** The invitee authors their own identity (FR-11); the registrant never typed it. The one thing the invitee inherits without choosing — the TogetherID — is shown before they commit (FR-9).

**No email binding (D-4).** Not requiring the submitted email to match the invited address is acceptable *because the token already is the credential*. Documented as a deliberate decision: the invitation **names** a person it does not **bind**. The mitigation for a leaked token is its short life and single use, not the email field.

**The password is never transmitted or stored on the invitee's behalf (D-2).** The screen routes the invitee to their partner. This is safe specifically because the alternative isn't: letting the invitee set a password calls `Couple.ChangePassword`, which revokes all refresh tokens and would sign the registrant out of their own home, possibly with a password they don't know. Recovery for an invitee who never learns it: once `Complete`, forgot-password emails both partners.

**Auditing.** `INVITATION_CREATED` and `INVITATION_ACCEPTED` already exist. The two new reads should be rate-limited (preview is anonymous and token-guessing-adjacent, though the token space makes brute force infeasible) and must not log the token.

---

## Cross-Feature Impact & Dependencies

- **Login/Registration spec:** this completes its A6. Registration's `/invite` route and login's "I have an invitation" link now lead somewhere real. Registration's production flag can flip on once this ships.
- **Messaging:** on acceptance, `CoupleCompletedEvent` provisions the pinned partner chat. Already built; depended on, not re-specified.
- **Connect:** the couple becomes discoverable at `Complete`. Already built.
- **Waiting threshold:** gains content from TDD-FR-2; its completion-polling is unchanged.
- **Regression risk:** low and concentrated in the two new reads (over-disclosure) and in FR-21 (raw 400s). No write-path change.

---

## Success Metrics & Analytics Events

| Metric | Definition | Target |
| --- | --- | --- |
| Home completion rate | `invitation_created` → `couple_completed` | ≥ 70% within 7 days |
| Time to completion | `invitation_created` → `couple_completed` | p50 < 24h |
| Resend rate | resends per completed couple | < 0.5 |
| Preview-to-accept | `invitation_previewed` → `couple_completed` | ≥ 80% |
| Link-lost recovery | sessions that re-read a pending invitation | directional (validates TDD-FR-2) |

**Events:** `invite_screen_viewed`, `invitation_created`, `invite_link_copied`, `invitation_emailed`, `invitation_resent`, `invitation_readdressed`, `invitation_previewed` (`{outcome: ok|expired|used|unknown}`), `accept_screen_viewed`, `couple_completed`.

**No event may carry the token, the invitee's email, or any password material.**

---

## Edge Cases, Failure Modes & Error Handling

| # | Case | Behaviour |
| --- | --- | --- |
| 1 | Registrant reloads `/invite` after creating the invitation | Pending invitation re-read (TDD-FR-2); link shown again |
| 2 | Registrant creates a second invitation | First superseded; only the newest link works; screen says so (FR-6) |
| 3 | Invitee opens an expired link | Calm expiry message; prompt to ask for a fresh one (FR-18) |
| 4 | Invitee opens an already-used link, or couple completed another way | "This home is already open. Try signing in." (FR-19) |
| 5 | Invitee opens an unknown/garbled token | "This invitation doesn't lead anywhere anymore." (FR-17) |
| 6 | Invitee's chosen username is taken | Inline, warm; form preserved (FR-20) |
| 7 | Invitee's username or email equals the registrant's | Field-level message, not a banner (FR-21; **OQ-2**) |
| 8 | Invitee corrects the prefilled email | Allowed; no binding (FR-12) |
| 9 | Invitee is under 16 | Same 16+ rule and voice as registration |
| 10 | Registrant re-addresses to a new email | Fresh invitation supersedes the old; new link |
| 11 | Two people open the same link and both accept | First wins; the second sees case 4 |
| 12 | Signed-in, already-complete partner opens a live-looking link | Treated as case 4; routed to the app |

---

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Public preview over-discloses the registrant's PII | **High** | TDD-FR-10 whitelists its payload; invitee email masked (**A3**); explicit in Privacy |
| Invitee never learns the password and is locked out after first sign-in | Medium | Screen tells them to ask their partner (FR-13); forgot-password recovers once `Complete` |
| Registrant loses the only link | Medium | TDD-FR-2 re-reads it; Resend issues a fresh one |
| `EMAILS_MUST_DIFFER` / `USERNAMES_MUST_DIFFER` surface as raw 400s | Medium | FR-21; resolve **OQ-2** so they're field-level |
| Leaked/forwarded token lets a stranger join | Low | Short-lived, single-use; the deliberate cost of link-based invites (D-4) |
| Email action confuses in `NullEmailService` environments | Low | FR-4 hides or disables it when email isn't configured |

---

## Alternatives Considered

**Email-only delivery.** Cleaner (token never leaves the server) but untestable in dev/e2e without SMTP, and puts email on the critical path. Rejected as *primary*; kept as optional (D-3).

**Let the invitee set the shared password at acceptance.** Rejected — `Couple.ChangePassword` revokes all refresh tokens and would sign the registrant out, possibly locking both out. The out-of-band model is safer *and* zero-build.

**Relax FR-30 (no preview endpoint).** Would keep this purely frontend, but the invitee would commit blind to a permanent, public identifier chosen by someone else. Rejected; the read endpoint is small.

**Strict email binding.** Marginal security gain — a token-holder already knows the address — at the cost of making a registrant's typo unrecoverable. Rejected in favour of prefill-and-correct (D-4).

---

## Future Enhancements

- Email-first delivery once SMTP is a hard dependency in all environments.
- Invitation revocation (cancel outright, not just supersede).
- A short human-readable invite code as an alternative to a long link.
- Reaping or archiving couples whose invitation lapsed and was never resent (**A5**).
- Showing the invitee a preview of who they're about to share a home with (photos) before accepting.

---

## Acceptance Criteria

QA-testable without further product input.

### Invite screen

- [ ] A registrant can enter a partner name + email and create an invitation.
- [ ] After creation, a copy-able link is shown and the copy control confirms success.
- [ ] Reloading `/invite` shows the pending invitation's recipient and a working link (not a blank form).
- [ ] Creating a second invitation invalidates the first link.
- [ ] Emailing the link is present but visibly secondary; it is hidden or disabled when email is not configured.
- [ ] A `Complete` couple visiting `/invite` is routed into the app.

### Waiting threshold

- [ ] Names the invited partner and the address the invitation went to.
- [ ] Resend issues a fresh invitation; the old link stops working.
- [ ] Change-email issues a fresh invitation to the new address.

### Accept screen

- [ ] Before the form can be submitted, the TogetherID, the inviter's name, and the invitee's role are all visible.
- [ ] The public preview never exposes the registrant's email, phone, or DOB.
- [ ] The invitee's email on the preview is masked or absent.
- [ ] The form collects only the invitee's own five fields; nothing about the registrant.
- [ ] The email field is prefilled and editable; a corrected email is accepted.
- [ ] There is no password field; the screen states the password is the partner's to share.
- [ ] The role is shown read-only and equals the complement of the registrant's.
- [ ] Accepting signs the invitee in and lands them in the app; the couple is `Complete`.
- [ ] An expired token shows the calm expiry message (no red).
- [ ] An already-used token / already-complete couple routes to sign-in with the "already open" message.
- [ ] An unknown token shows the calm not-found message.
- [ ] A taken username shows inline and preserves the rest of the form.
- [ ] A username or email equal to the registrant's shows a **field-level** message, not a generic banner.
- [ ] The 16+ rule applies with the same wording as registration.
- [ ] No analytics event contains the token, the invitee email, or password material.

---

## Clarification Log & Explicit Assumptions

### Resolved with the requester (2026-07-12)

| # | Decision | Drives |
| --- | --- | --- |
| **D-1** | Add both read endpoints — public preview by token, and authenticated read of the couple's pending invitation. | TDD-FR-2, TDD-FR-10, FR-9, FR-8 |
| **D-2** | The registrant tells the invitee the password out of band; the accept screen says so; no password field. | FR-13 |
| **D-3** | Copy-able link is primary; email is optional; still collect partner name + email. | FR-1, FR-3, FR-4 |
| **D-4** | No email binding on acceptance; prefill and allow correction. | FR-12 |

### Open questions / assumptions carried forward

- **OQ-1** *(TDD)* — The public preview's exact payload is a security boundary. This spec whitelists it (TDD-FR-10) and masks the invitee email (**A3**); the TDD must not widen it.
- **OQ-2** *(defect to confirm)* — `EMAILS_MUST_DIFFER` / `USERNAMES_MUST_DIFFER` currently throw `DomainException` → **400**, which the accept screen would render as a generic error. FR-21 requires field-level treatment; the TDD must map these to a form-field error, or the domain must surface them distinctly. **Confirm with product/eng.**
- **OQ-3** *(TDD, deferred)* — Couples whose invitation lapses and is never resent remain `AwaitingPartner` indefinitely. Assumed acceptable; reaping is **A5**, out of scope.
- **A3** — The invitee's email is masked (or omitted) on the anonymous preview; shown in full only to the authenticated registrant. **If wrong**, the preview payload widens and the Privacy section needs revisiting.
- **A5** — No reaping of stranded couples in this feature.
- **A6** — The two read endpoints are the only backend additions; the write path and lifecycle are unchanged. Confirmed against the code.
- **A7** *(deviation)* — Saved as `features/couple-invitation.spec`, matching the repo's `.spec` convention.

---

## Status

`Ready for review-spec (with stated assumptions)`

Two backend read endpoints (TDD-FR-2, TDD-FR-10) take this out of "frontend-only" territory — `review-spec` should treat them as first-class, with the preview payload (OQ-1/A3) as the central design decision. Resolve **OQ-2** (raw 400s on same-username/email collisions) before implementation, or the accept screen cannot render FR-21 cleanly.
