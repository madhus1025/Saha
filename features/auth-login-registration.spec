# PM Spec: Login & Registration — "Hearth" Redesign

**Feature:** Login & Registration ("Hearth" redesign)
**Slug:** `auth-login-registration`
**Module:** `auth`
**Date:** 2026-07-10
**Status:** `Ready for review-spec (with stated assumptions)`

**Design references (authoritative):** [`docs/design/auth/`](../docs/design/auth/README.md)

| Screen | Reference image | Deck caption |
| --- | --- | --- |
| Login | [`01-login.png`](../docs/design/auth/01-login.png) | *Either name opens the same door.* |
| Register step 1 of 3 | [`02a-register-step1-your-half.png`](../docs/design/auth/02a-register-step1-your-half.png) | *You only ever fill in your own details.* |
| Register step 2 of 3 | [`02b-register-step2-one-key.png`](../docs/design/auth/02b-register-step2-one-key.png) | *One password for one home; it belongs to both of you.* |
| Register step 3 of 3 | [`02c-register-step3-togetherid.png`](../docs/design/auth/02c-register-step3-togetherid.png) | *The name on your door — how other couples find you.* |

Copy in the reference images is **normative**. Where this spec quotes a string, that string ships.

---

## Executive Summary

Saha registers a couple in a single atomic transaction that demands thirteen fields — both partners' username, name, date of birth, email, and phone, plus a TogetherID, a shared password, and a confirmation. One person sits at a keyboard and types their partner's date of birth. The new design deck rejects this outright: *"You only ever fill in your own details."*

This spec replaces the single-page registration form with a three-step wizard that collects **only the registering partner's half**, then the couple's one shared password, then the couple's public TogetherID. The second partner supplies their own details when they accept an invitation. It also replaces the Login screen with the deck's "Welcome home" card.

The consequence is structural, not cosmetic. A `Couple` may now exist — and be signed into — with a single partner present. The couple acquires a lifecycle: `AwaitingPartner` until the invitation is accepted, `Complete` thereafter. Until a couple is `Complete`, its home is closed: the registrant signs in to a waiting threshold, the couple is invisible to other couples, and no partner conversation exists. This ripples into Messaging, Connect, Profile, and password reset, each of which currently assumes two partners exist the instant a couple does.

The invitation and acceptance **screens** are out of scope here (they are not among the four reference images), but the couple lifecycle they drive is specified below, because login and registration are unbuildable without it.

---

## Background

Today, `RegisterCoupleCommand` accepts `HusbandUsername`, `HusbandName`, `HusbandDateOfBirth`, `HusbandEmail`, `HusbandPhoneNumber`, the same five for the wife, plus `TogetherID`, `Password`, and `ConfirmPassword`. `Couple.Register` constructs both `Partner` entities and raises `CoupleRegisteredEvent`. The aggregate exposes `Husband` and `Wife` as `_partners.Single(p => p.Role == …)` — expressions that throw when a partner is absent.

`docs/design-request-missing-screens.md` posed this exact question to the designer, offering three possibilities: registration is being simplified; registration exists but the deck doesn't show it; or registration is split across cards. The returned deck — `Together - Hearth Desktop II.pdf` — answers with a fourth option the request did not anticipate: **registration collects one partner, and the couple completes itself through invitation.**

No invitation flow exists anywhere in the codebase today. A repository-wide search for `invit` returns no matches in `backend/src` or `frontend/src`.

---

## Problem Statement

1. **A person cannot consent on another person's behalf.** Registration requires one partner to enter the other's date of birth, email, and phone before that partner has ever seen the product. Age (16+) is a legal gate being asserted by a third party.
2. **The thirteen-field form is the highest-friction moment in the product** and it sits at the top of the funnel, before any value has been demonstrated.
3. **The password policy contradicts the product's voice.** The live rules demand uppercase, lowercase, digit, and special character. The deck's strength meter reads *"Good — long and easy to say out loud"* — a passphrase the current policy would reject.
4. **The login screen does not say what it is.** "Welcome back / Sign in to your shared account" fails to convey the product's central fact: either partner's username opens the same door.

---

## Goals

Prioritized.

1. Registration collects **only the registering partner's own details**. No field on any screen asks about the other person.
2. A couple can exist, and be signed into, with one partner present — safely, without faulting any downstream consumer.
3. Ship the four reference screens with their copy and structure intact.
4. Replace the character-class password policy with a length-based passphrase policy that never scolds.
5. Registration is a 3-step wizard whose state survives back-navigation between steps.
6. An `AwaitingPartner` couple is invisible to every other couple in the product.

## Non-Goals

- The **invite** and **invitation-acceptance** screens. Their existence and contract are specified here; their visual design is not, and is not among the four reference images. Tracked as a dependent spec.
- **Forgot password** and **Reset password** screens (deck screens 3 and 4). Out of scope by explicit instruction, though `ForgotPasswordCommandHandler` requires a defect fix under FR-27.
- Change password, deactivate, sign out, session expiry, rate-limit screens (deck screens 5–9).
- Dark theme. The reference images are the `Auth · Light` section.
- Social / OAuth sign-in. Saha has none and this spec introduces none.
- Same-sex couple support (see **A5**).

---

## User Personas & Access Rules

| Persona | Definition | Access |
| --- | --- | --- |
| **Visitor** | Unauthenticated, no account | Login, all 3 registration steps, invitation acceptance |
| **Registrant** | Created the couple; couple is `AwaitingPartner` | Sign in; reaches only the waiting threshold. No app modules. May resend or re-address the invitation. |
| **Invitee** | Named in an invitation, not yet accepted | May accept via invitation link; supplies own half; inherits TogetherID and password |
| **Partner** | Member of a `Complete` couple | Full app access. No Husband/Wife privilege asymmetry. |
| **Connected couple** | A couple linked via Connect | Sees a couple **only** when that couple is `Complete` |

**Role has no privileges.** `Husband` and `Wife` are identity labels, not permission tiers. This spec introduces no asymmetry between them.

**The registrant/invitee asymmetry is real and must be surfaced.** The registrant unilaterally chooses the TogetherID (permanent, public) and the shared password. The invitee inherits both without having chosen either. FR-24 requires the invitee be shown the TogetherID before they commit.

---

## User Stories

**US-1 — Either name opens the same door.**
As a partner, I sign in with *my own* username and our shared password, so that I never have to remember whose account it is.
*Acceptance:* Either partner's username, with the couple's password, authenticates the same couple.

**US-2 — I only fill in my own half.**
As a registrant, I enter only my name, username, date of birth, role, email, and phone, so that I never assert facts about my partner.
*Acceptance:* No field on steps 1–3 refers to the other partner.

**US-3 — One key for one home.**
As a registrant, I choose one password that belongs to both of us, described as something we would both remember.
*Acceptance:* A 12+ character passphrase with no digits, symbols, or capitals is accepted.

**US-4 — The name on our door.**
As a registrant, I choose a public TogetherID and learn immediately whether it is available.
*Acceptance:* Availability resolves inline beneath the field without submitting the form.

**US-5 — The home opens when we are both here.**
As a registrant, after opening our home I am told my person has not yet arrived, rather than being dropped into a half-empty product.
*Acceptance:* Signing in as an `AwaitingPartner` registrant reaches the waiting threshold, never a module.

**US-6 — My partner arrives on their own terms.**
As an invitee, I supply my own details, see the TogetherID I am joining, and only then enter the home.
*Acceptance:* Acceptance transitions the couple to `Complete` and both partners gain full access.

**US-7 — Nothing scolds me.**
As a registrant, when I make a mistake, the product tells me plainly and warmly, without red panels or exclamation marks.
*Acceptance:* No error state in this feature uses red as its primary signal.

**US-8 — I know where to go.**
As a visitor who was invited, I find the invitation path from the login screen.
*Acceptance:* Login footer renders `New here? Create our home · I have an invitation`.

---

## Functional Requirements

### Login — ref. [`01-login.png`](../docs/design/auth/01-login.png)

- **FR-1** The system shall render a single centered card on a cream field, headed **"Welcome home"** with the subheading **"Either of your usernames opens the door."**
- **FR-2** The system shall present two fields: `Username` (plain text) and `Your shared password` (masked, with a visibility toggle).
- **FR-3** The system shall authenticate a couple when the submitted username matches **either** partner of that couple and the password matches the couple's shared password.
- **FR-4** The system shall present a single full-width primary action, **"Sign in"**.
- **FR-5** The system shall present a **"Forgot our password?"** link below the primary action.
- **FR-6** The system shall present the footer `New here? **Create our home** · **I have an invitation**`, linking respectively to registration step 1 and to invitation acceptance.
- **FR-7** On authentication failure the system shall present one message that distinguishes neither which field was wrong nor whether the username exists.
- **FR-8** On successful authentication of an `AwaitingPartner` couple, the system shall route to the waiting threshold (FR-20), not to any application module.

### Registration step 1 — "First, you" — ref. [`02a-register-step1-your-half.png`](../docs/design/auth/02a-register-step1-your-half.png)

- **FR-9** The system shall label the step **"Step 1 of 3 · Your half"**, head it **"First, you"**, and subhead it **"Your person fills in their own half when they arrive — you never type for them."**
- **FR-10** The system shall collect exactly six fields of the registrant: `Your name`, `Username` (helper: *lowercase, yours alone*), `Date of birth` (helper: *16+*), `Role`, `Email`, `Phone`.
- **FR-11** The system shall present `Role` as a two-option segmented control: **Wife** and **Husband**. Selection is required.
- **FR-12** The system shall validate, on **Continue**, that the username is well-formed (`^[a-z][a-z0-9_.]{2,29}$`) **and globally unattested**, presenting a collision inline on the username field. *(see A3)*
- **FR-13** The system shall reject a date of birth yielding an age below 16 or above 120.
- **FR-14** The system shall require all six fields. Email and phone are not optional.
- **FR-15** The system shall not persist any account state at this step.

### Registration step 2 — "One key" — ref. [`02b-register-step2-one-key.png`](../docs/design/auth/02b-register-step2-one-key.png)

- **FR-16** The system shall label the step **"Step 2 of 3 · One key"**, head it **"One key for your home"**, and subhead it **"You'll share this password. Pick something you'd both remember — and only you two would know."**
- **FR-17** The system shall collect `Password` (masked, visibility toggle) and `Once more` (masked, no toggle), and require they match.
- **FR-18** The system shall accept any password of **at least 12 characters**, imposing no uppercase, lowercase, digit, or special-character requirement.
- **FR-19** The system shall display a four-segment qualitative strength meter with warm, non-numeric guidance. A password that is valid but weak shall be **warned about and still accepted** — **Continue** is never disabled on strength grounds.

### Registration step 3 — "Your door" — ref. [`02c-register-step3-togetherid.png`](../docs/design/auth/02c-register-step3-togetherid.png)

- **FR-20** The system shall label the step **"Step 3 of 3 · Your door"**, head it **"The name on your door"**, and subhead it **"Your TogetherID is public — it's how other couples find you. Uppercase, yours forever."**
- **FR-21** The system shall collect `TogetherID`, uppercased, matching `^[A-Z0-9][A-Z0-9\-]{2,48}[A-Z0-9]$`.
- **FR-22** The system shall check TogetherID availability **live and inline**, debounced, without form submission, rendering **"✓ Available — it's all yours"** when free. *(see A2)*
- **FR-23** The system shall label the primary action **"Open our home"** and render the footer note **"Next: invite {partner}. The home opens when you're both here."**
- **FR-24** On **"Open our home"** the system shall atomically create the couple in state `AwaitingPartner` with exactly one partner, hashing the shared password, and shall then route to the invite screen.

### Couple lifecycle

- **FR-25** A `Couple` shall have a lifecycle state of `AwaitingPartner` or `Complete`. It is created `AwaitingPartner` and transitions to `Complete` exactly once, on invitation acceptance. The transition is irreversible.
- **FR-26** The system shall assign the invitee the **complementary** role to the registrant's. *(see A1)*
- **FR-27** While a couple is `AwaitingPartner`, the system shall:
  - **a.** permit the registrant to authenticate, reaching only the waiting threshold;
  - **b.** exclude the couple from TogetherID search results and from all Connect surfaces;
  - **c.** reject the couple as a connection target or group-conversation participant;
  - **d.** expose no "partner profile" resource;
  - **e.** provision **no** partner conversation;
  - **f.** address password-reset correspondence to the **present partner only**.
- **FR-28** On transition to `Complete`, the system shall provision the couple's pinned partner conversation, superseding the current provisioning trigger.
- **FR-29** No consumer of the couple aggregate shall fault when a couple is `AwaitingPartner`.
- **FR-30** The invitee shall be shown the TogetherID they are joining before their acceptance is committed.

### Removals

- **FR-31** The system shall remove the thirteen-field two-partner registration contract. No caller, fixture, or test shall construct a couple with two partners in one operation. *(see A4)*

---

## Non-Functional Requirements

- **Availability check latency.** TogetherID availability resolves within 300 ms at p95, debounced at 400 ms after last keystroke.
- **Abuse.** The availability endpoint is unauthenticated and rate-limited using the existing limiter infrastructure. *(A2)*
- **Accessibility.** All four screens meet WCAG 2.1 AA. The `Role` segmented control is keyboard-operable and exposes its selected state to assistive technology. The strength meter's state is conveyed by text, never by colour alone. Password visibility toggles are labelled.
- **Wizard resilience.** Back-navigation between steps 1→2→3 preserves entered values within the session. Steps 1 and 2 persist nothing server-side.
- **Atomicity.** Couple creation at FR-24 is all-or-nothing. A failure leaves no partial couple, no orphaned username, and no reserved TogetherID.
- **Tone.** No error, warning, or empty state in this feature uses red as its primary signal, an exclamation mark, or the words *invalid*, *failed*, or *error*.

---

## Key User Flows & UX Considerations

**Flow A — New couple.**
Login → *Create our home* → Step 1 (your half) → Step 2 (one key) → Step 3 (your door) → **Open our home** → couple created `AwaitingPartner`, registrant authenticated → invite screen → waiting threshold.

**Flow B — The invitee.**
Invitation link → sees TogetherID and who invited them → supplies own half (name, username, DOB, email, phone; role shown read-only) → accepts → couple becomes `Complete` → partner conversation provisioned → both partners hold full access.

**Flow C — Returning partner, complete couple.**
Login → either username + shared password → application.

**Flow D — Returning registrant, awaiting partner.**
Login → waiting threshold: who was invited, where the invitation went, resend, re-address. **Not** an error state; the deck's voice frames it as anticipation.

**UX considerations.**

- The wizard's three steps are one decision each. Step 1 is a two-column grid; steps 2 and 3 are single-column. This is deliberate — the deck narrows as the stakes rise.
- Helper text sits **inline with the label** (`Username · lowercase, yours alone`), never below the field.
- Fields have no border at rest and a dark-green 2px border on focus.
- Exactly one primary action per card.
- The TogetherID field renders in monospace and uppercases as the user types.
- "Uppercase, yours forever" is the only warning about permanence, and it appears **before** the field, not after submission — consistent with the deck's rule that consequences precede buttons.

---

## High-Level Data Entities, Ownership & Visibility Rules

| Entity | Ownership | Visibility |
| --- | --- | --- |
| **Couple** | Shared | TogetherID is public **only when `Complete`**. Lifecycle state is internal; the registrant sees it as the waiting threshold. |
| **Partner** | Partner-scoped identity, couple-scoped account | Name and picture visible to connected couples once `Complete`. **Email, phone, and date of birth are never visible to another couple.** |
| **Shared password** | Couple | Never rendered. Chosen by the registrant, inherited by the invitee. |
| **Invitation** | Couple | Addressed to the invitee. Confers the right to become the couple's second partner. |

- A couple has **at most two** partners and, once `Complete`, **exactly two** — one `Wife`, one `Husband`.
- Username is globally unique, lowercase. TogetherID is globally unique, uppercase, **immutable**.
- An `AwaitingPartner` couple is not a participant in the social graph. It cannot connect, be connected to, be searched, or join a group conversation.

---

## Privacy, Security & Consent Considerations

**Consent is the point of this change.** The current flow has one person assert another's legal age, email address, and phone number before that person has consented to anything. The new flow makes each partner the sole author of their own identity. This requirement is load-bearing and must not be traded away for funnel conversion.

**The inherited-credential asymmetry.** The invitee did not choose the TogetherID (public, permanent) or the shared password. FR-30 requires the TogetherID be shown before acceptance. The invitee cannot be shown the password — it is hashed — so the invitation flow must establish it by other means; that mechanism belongs to the dependent invite spec.

**Half-formed homes are private.** FR-27b/c ensures an `AwaitingPartner` couple never surfaces to another couple. Without it, `SearchCoupleQueryHandler` would either fault or expose a couple whose second half never agreed to be discoverable.

**Enumeration.** The TogetherID availability check is an oracle by design — TogetherID is public and the deck requires a live check. Mitigation is rate limiting, not obscurity. Username validation (FR-12) is a **different** matter: usernames are not public, so a "taken" response is a private-data oracle. The username check must therefore be rate-limited and must be performed as part of step-1 submission rather than as a free-standing lookup endpoint.

**Uniform authentication failure.** FR-7 preserves the existing property that login reveals nothing about account existence.

**Password reset to a solo couple.** `ForgotPasswordCommandHandler` currently emails both `couple.Husband.Email` and `couple.Wife.Email`. Against an `AwaitingPartner` couple this faults. FR-27f fixes it. This is a live defect introduced the moment solo couples exist, not a nicety.

**Passphrase policy.** Dropping character-class rules in favour of a 12-character minimum is a net security improvement, not a relaxation. Class rules produce `Password1!`; a shared passphrase two humans both remember is longer and higher-entropy. Weak passwords are warned, never blocked (FR-19).

---

## Cross-Feature Impact & Dependencies

**Verified consumers that assume two partners exist:**

| Consumer | Current behaviour | Required change |
| --- | --- | --- |
| `ProvisionPartnerConversationHandler:35` | `CreatePartner(coupleId, Husband.Id, Wife.Id)` on `CoupleRegisteredEvent` | Move trigger to the acceptance event (FR-28) |
| `SearchCoupleQueryHandler:42-45` | Projects both partners' names and pictures | Exclude `AwaitingPartner` couples (FR-27b) |
| `GetConnectionsQueryHandler` | Same projection across connections | Cannot occur once FR-27c holds; must not fault |
| `ForgotPasswordCommandHandler:74-82` | Emails both partners | Present partner only (FR-27f) |
| `CreateGroupConversationCommandHandler` | Enumerates both partners as participants | Reject `AwaitingPartner` couples (FR-27c) |
| `AddCoupleToConversationCommandHandler` | Same | Same |
| `Profile` → `GET /profile/partner` | `GetOtherPartner` throws | No partner resource while awaiting (FR-27d) |

**`couple-messaging.spec` conflict.** Two of its accepted criteria are invalidated:

> *"Every registered couple has exactly one private partner chat."*
> *"The private partner chat is automatically available after registration."*

Both become true at **acceptance**, not registration. The messaging spec must be amended.

> **Correction (2026-07-10).** This section previously claimed that "the existing `EnsurePartnerConversationAsync` safety net on the conversation list makes the transition non-breaking." That was **wrong**. At `GetConversationsQueryHandler:73` that method called `Conversation.CreatePartner(coupleId, couple.Husband.Id, couple.Wife.Id)` — the exact expression that throws for a one-partner couple — and it ran on *every* conversation-list load, not just after registration. It was a fault site, not a mitigation. It now early-returns when the couple is not `Complete`.

**Test fixtures requiring rewrite (A4):** `AuthControllerTests`, `RegisterCoupleCommandHandlerTests`, `RegisterCoupleCommandValidatorTests`, `CoupleTests`, `CoupleRepositoryTests`, `MessagingTestData`, `TogethernessWebApplicationFactory`, `MessagingWebApplicationFactory`. Every one of these constructs a couple via the two-partner path. They need a `Complete`-couple helper, or messaging tests will drown in invitation ceremony.

**Dependent spec (blocking):** invite + invitation-acceptance screens. Registration cannot ship a usable product without them — FR-24 routes to a screen this spec does not define.

**Telemetry.** `LOGIN_PAGE_VIEWED` survives. Registration's funnel events must be re-cut per step.

---

## Success Metrics & Analytics Events

| Metric | Definition | Target |
| --- | --- | --- |
| Registration completion | `register_step1_viewed` → `couple_created` | ≥ 60% (no baseline; 13-field form was never instrumented per step) |
| Per-step drop-off | Exits at each step | No single step > 20% |
| Home completion | `couple_created` → `couple_completed` | ≥ 70% within 7 days |
| Time to open a home | Step 1 view → `couple_created` | p50 < 3 min |
| TogetherID retries | `togetherid_unavailable` per `couple_created` | < 1.5 |
| Passphrase adoption | Share of passwords with no digit or symbol | Directional only; validates FR-18 |

**Events:** `register_step1_viewed`, `register_step1_completed`, `register_step2_viewed`, `register_step2_completed`, `register_step3_viewed`, `togetherid_checked` (`{available}`), `togetherid_unavailable`, `couple_created` (`{role}`), `invitation_sent`, `invitation_accepted`, `couple_completed`, `waiting_threshold_viewed`, `login_succeeded` (`{coupleState}`), `login_failed`.

No event carries a username, email, phone, TogetherID, or any password material.

---

## Edge Cases, Failure Modes & Error Handling

| # | Case | Product behaviour |
| --- | --- | --- |
| 1 | Username taken | Inline on step 1's username field, on **Continue**. Warm phrasing; wizard state preserved. |
| 2 | TogetherID taken | Inline below the field, replacing the availability line. Never blocks typing. |
| 3 | TogetherID taken **between** the check and **Open our home** | Race is real. Return to step 3 with the field intact and the availability line updated. Nothing else is lost. |
| 4 | Availability check fails (network) | Field shows no verdict. **Open our home** stays enabled; uniqueness is enforced authoritatively on submit. Never block on a failed convenience check. |
| 5 | Passwords do not match | Inline on `Once more`. |
| 6 | Password < 12 chars | Meter shows lowest segment with guidance. **Continue** disabled — this is a validity floor, not a strength judgement. |
| 7 | Password ≥ 12 but weak | Meter warns. **Continue** enabled (FR-19). |
| 8 | Age < 16 | Inline on date of birth, plainly, without accusation. |
| 9 | Age > 120 | Same treatment. |
| 10 | Registrant abandons after step 2 | Nothing persisted (FR-15). No account, no reserved username. |
| 11 | Registrant abandons after **Open our home** | Couple exists, `AwaitingPartner`. Registrant may sign in and resume from the waiting threshold. |
| 12 | Registrant signs in while awaiting | Waiting threshold. Not an error. |
| 13 | Invitee's chosen username collides with registrant's | Rejected — usernames must differ within a couple, as today. |
| 14 | Invitee's email collides with registrant's | Rejected — emails must differ within a couple, as today. |
| 15 | Forgot password on an awaiting couple | Reset code emailed to the present partner only (FR-27f). |
| 16 | Another couple searches an awaiting couple's TogetherID | Not found. Indistinguishable from a nonexistent TogetherID. |
| 17 | Login with correct username, wrong password | Uniform failure message (FR-7). |
| 18 | Couple creation partially fails | Atomic rollback. Username and TogetherID remain free. |

---

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| A `Couple` with one partner faults five verified handlers | **High** | FR-27, FR-29. Every `.Husband`/`.Wife` read audited against the lifecycle state before merge. |
| Homes never complete; product fills with solo couples | **High** | Track `couple_completed` ≥ 70% / 7d. The waiting threshold must make resending trivial. |
| Registration ships before the invite screens exist | **High** | Dependent spec is blocking. FR-24 has nowhere to route without it. |
| `couple-messaging.spec` acceptance criteria silently break | Medium | Amend that spec in the same change; rely on `EnsurePartnerConversationAsync` as the net. |
| Test fixtures rewritten under time pressure lose coverage | Medium | Introduce a `Complete`-couple test helper before touching production code. |
| Availability endpoint abused for enumeration | Low | Rate-limited. TogetherID is public by design. |
| Passphrase policy read as a security regression | Low | Document the entropy argument; 12-char minimum with no class rules exceeds `Password1!`. |
| Invitee rejects an inherited, permanent TogetherID | Low | FR-30 shows it before commitment. Accepted product cost. |

---

## Alternatives Considered

**Keep the two-partner form, restyle it.** Cheapest. Rejected: it preserves the consent defect, which is the reason the deck was commissioned.

**Collect the partner's email in step 1 so the invite can be addressed.** Tempting, and it would make step 3's *"Next: invite Arun in"* coherent without a further screen. Rejected: it contradicts the step's own subheading — *"you never type for them"* — and deviates from the reference image. The invite screen absorbs this instead.

**Shareable invite link with no addressee.** Removes the email dependency entirely. Rejected for now: it forces the deck's step-3 footer copy to change, and it makes the waiting threshold ("invitation sent to arun@post.com") vacuous. Retained as a **future enhancement** for couples who would rather send the link themselves.

**Full app access while awaiting, with degraded surfaces.** Rejected: it requires `Husband`/`Wife` to become nullable across five handlers, and contradicts *"The home opens when you're both here."* Every module in Saha is built around two people; a solo experience would need designing from scratch.

**Block weak passwords.** Rejected: a disabled button is a scold, and the deck's section rule is explicit. Below 12 characters is a validity floor, not a strength judgement — that distinction is why case 6 blocks and case 7 does not.

---

## Future Enhancements

- Shareable invite link as an alternative to email delivery.
- Same-sex and non-binary couples, retiring the Husband/Wife role pair (see **A5**).
- Passkeys / WebAuthn — awkward under a shared-credential model; needs product thought.
- Allowing an `AwaitingPartner` couple limited read-only access to seed content before the partner arrives.
- Dark-theme variants of all four screens.

---

## Acceptance Criteria

QA-testable without further product input. Each traces to a requirement.

### Login (FR-1 – FR-8)

- [ ] Heading reads exactly **"Welcome home"**; subheading exactly **"Either of your usernames opens the door."**
- [ ] Password field is labelled **"Your shared password"** and has a working visibility toggle.
- [ ] The husband's username + shared password authenticates the couple.
- [ ] The wife's username + the same password authenticates the same couple.
- [ ] Primary action reads **"Sign in"** and is full width.
- [ ] **"Forgot our password?"** appears below the primary action.
- [ ] Footer reads `New here? Create our home · I have an invitation`; both links resolve.
- [ ] A nonexistent username and an existing username with a wrong password produce the **identical** message.
- [ ] No login failure state renders red as its primary signal.
- [ ] A registrant of an `AwaitingPartner` couple who signs in lands on the waiting threshold and can reach no application module by URL.

### Registration step 1 (FR-9 – FR-15)

- [ ] Step label reads **"Step 1 of 3 · Your half"**; heading **"First, you"**.
- [ ] Exactly six inputs are present; none names or describes the other partner.
- [ ] `Role` offers exactly **Wife** and **Husband**; **Continue** is blocked until one is chosen.
- [ ] Username helper renders inline with the label as `Username · lowercase, yours alone`.
- [ ] `MAYA.K` is rejected as a username (uppercase); `maya.k` is accepted.
- [ ] A username already held by another account is reported inline on **Continue**, and all other step-1 values are preserved.
- [ ] A date of birth 15 years and 364 days ago is rejected; exactly 16 years ago is accepted.
- [ ] A date of birth 121 years ago is rejected.
- [ ] Abandoning after step 1 creates no account and leaves the username claimable.

### Registration step 2 (FR-16 – FR-19)

- [ ] Step label reads **"Step 2 of 3 · One key"**; heading **"One key for your home"**.
- [ ] `correct horse battery staple` (no digit, symbol, or capital) is **accepted**.
- [ ] `Sh0rt!` (11 chars, all four classes) is **rejected** for length alone.
- [ ] Exactly 12 characters is accepted.
- [ ] The strength meter renders four segments and no numeric score.
- [ ] A 12-character weak password shows guidance and leaves **Continue** enabled.
- [ ] A password below 12 characters leaves **Continue** disabled.
- [ ] Mismatched `Once more` blocks submission with an inline message on that field.
- [ ] `Password` has a visibility toggle; `Once more` does not.

### Registration step 3 (FR-20 – FR-24)

- [ ] Step label reads **"Step 3 of 3 · Your door"**; heading **"The name on your door"**.
- [ ] Typing `maya-arun` renders `MAYA-ARUN` in the field.
- [ ] An available TogetherID renders **"✓ Available — it's all yours"** without form submission.
- [ ] A taken TogetherID replaces that line with a non-red unavailability message.
- [ ] The availability check fires no more than once per 400 ms of typing.
- [ ] If the availability check errors, **"Open our home"** remains enabled.
- [ ] Primary action reads **"Open our home"**.
- [ ] **"Open our home"** creates a couple with exactly one partner in state `AwaitingPartner` and routes to the invite screen.
- [ ] A TogetherID claimed between check and submit returns the user to step 3 with values intact.
- [ ] A failure during creation leaves the username and TogetherID both claimable.

### Couple lifecycle (FR-25 – FR-31)

- [ ] A newly created couple has exactly one partner and state `AwaitingPartner`.
- [ ] An invitee accepting is assigned the complementary role to the registrant's.
- [ ] While `AwaitingPartner`: TogetherID search by another couple returns not-found.
- [ ] While `AwaitingPartner`: the couple cannot be sent a connection request nor added to a group conversation.
- [ ] While `AwaitingPartner`: no partner-profile resource is reachable.
- [ ] While `AwaitingPartner`: no partner conversation exists.
- [ ] While `AwaitingPartner`: forgot-password emails the present partner only, and does not fault.
- [ ] On acceptance: state becomes `Complete`, and the pinned partner conversation is provisioned exactly once.
- [ ] On acceptance: the couple becomes discoverable by TogetherID search.
- [ ] `Complete` never reverts to `AwaitingPartner`.
- [ ] An invitee is shown the TogetherID before their acceptance commits.
- [ ] An invitee's username equal to the registrant's is rejected.
- [ ] An invitee's email equal to the registrant's is rejected.
- [ ] No API accepts a two-partner registration payload.
- [ ] Exercising every Connect, Messaging, and Profile surface against an `AwaitingPartner` couple raises no unhandled fault.

---

## Clarification Log & Explicit Assumptions

### Resolved with the requester (2026-07-10)

| # | Question | Decision |
| --- | --- | --- |
| Q1 | What can a registrant do before the partner joins? | **Waiting room** until both present. Drives FR-8, FR-27. |
| Q2 | Where does partner identity for the invitation come from? | **Post-registration invite screen.** The four reference screens stay pixel-faithful. Drives FR-24 and the dependent spec. |
| Q4 | What replaces the character-class password policy? | **Length-based (12 min), warn not block.** Drives FR-18, FR-19. |
| Q5 | What happens to the 13-field register endpoint? | **Replace outright**, rewriting fixtures in the same change. Drives FR-31, **A4**. |

### Assumptions — carried forward, unverified

- **A1** *(FR-26, from Q3 default, unconfirmed)* — The invitee's role is auto-assigned as the complement of the registrant's, shown read-only. **If wrong,** the invitation must carry a role choice and the "exactly one Husband, one Wife" invariant needs re-examination.
- **A2** *(FR-22, from Q6 default, unconfirmed)* — TogetherID availability is a public, unauthenticated, rate-limited endpoint. Justified because TogetherID is public by design. **If wrong,** step 3's live check collapses into submit-time validation and the deck's availability line cannot be honoured.
- **A3** *(FR-12, from Q7 default, unconfirmed)* — Username collisions surface on **Continue** out of step 1, not at final submit. Usernames are **not** public, so this must not become a free-standing lookup endpoint; it is validated as part of step-1 submission. **If wrong,** a user can complete three steps and lose the work.
- **A4** *(FR-31, from Q5)* — Saha is pre-launch with no production couples to migrate. **If wrong,** existing two-partner couples must be backfilled to `Complete` and this spec needs a migration section.
- **A5** — Couples remain one Husband and one Wife. The deck's binary segmented control is treated as a faithful reflection of current product intent, not an oversight. This spec does not widen it, and flags it as a future enhancement. **This assumption deserves an explicit product decision** rather than inheritance from the existing schema.
- **A6** — The invite and invitation-acceptance screens will be specified separately before implementation begins. This spec defines their contract (FR-24, FR-25, FR-26, FR-30) but not their design.
- **A7** — The strength meter's four thresholds are a design decision deferred to the TDD, constrained only by FR-19: the meter is qualitative, and it never disables **Continue**.
- **A8** *(deviation)* — Saved as `features/auth-login-registration.spec`, matching the existing `couple-messaging.spec` convention rather than the skill's default `.spec.md`.

### Design-deck discrepancies surfaced

- **D1** — Step 3's footer reads *"Next: invite Arun in."*, naming a partner whose name is collected on **no in-scope screen**. Resolved by Q2: the invite screen collects it. Until then, FR-23 renders the copy with a `{partner}` placeholder, and the deck's literal string is unreachable at step 3.
- **D2** — The deck shows no availability indicator on step 1's `Username`, though usernames are globally unique — while step 3's `TogetherID` has one. The asymmetry is defensible (usernames are private, TogetherIDs are public) and is preserved deliberately, not corrected. See **A3**.

---

## Status

`Ready for review-spec (with stated assumptions)`

Blocking dependency: the invite and invitation-acceptance spec (**A6**). Registration routes to a screen this spec does not define.
