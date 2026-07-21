# Feature Brief: Login & Registration — "Hearth" Redesign

**Slug:** `auth-login-registration`
**Author (AI session):** claude-opus-4-8
**Created:** 2026-07-10
**Module:** auth
**Status:** Approved (Chunk 1 only — Chunks 2 & 3 not authorised this session)

**TDD:** [`features/auth-login-registration.tdd.md`](../../features/auth-login-registration.tdd.md)
**Spec:** [`features/auth-login-registration.spec`](../../features/auth-login-registration.spec)
**Design refs:** [`docs/design/auth/`](../../docs/design/auth/README.md)

---

## 1. Goal

Let one partner register a couple by filling in **only their own half**, so nobody
asserts their partner's legal age, email, or phone before that partner has consented.
The second partner supplies their own details when they accept an invitation.

## 2. Background & Context

Today `Couple.Register` builds both `Partner` entities in one 13-field transaction, and
`Couple.Husband`/`Wife` are `_partners.Single(...)` — expressions that **throw** when a
partner is absent. Allowing a one-partner couple therefore breaks the aggregate and
everything transitively reading it.

Prior art to mirror: `PasswordResetToken` (for `CoupleInvitation`), `Features/Connect`
(CQRS folder shape), `LoginCommandHandler` (token issuance).

## 3. User Stories

- As a **registrant**, I want to enter only my own name, username, DOB, role, email and phone, so that I never type for my partner.
- As a **registrant**, I want to sign in while my partner has not yet joined, and be told they haven't arrived rather than dropped into a half-empty product.
- As an **invitee**, I want to supply my own details and inherit the couple's TogetherID and shared password.
- As **another couple**, I want never to see a half-formed home in search or connections.

## 4. Acceptance Criteria (Chunk 1 — backend only)

- [ ] AC1 — `Couple.Register` creates a couple with exactly one partner in state `AwaitingPartner`.
- [ ] AC2 — `Couple.AcceptPartner` assigns the **complementary** role and transitions to `Complete`.
- [ ] AC3 — `AcceptPartner` on a `Complete` couple throws `COUPLE_ALREADY_COMPLETE`.
- [ ] AC4 — `AcceptPartner` rejects a username or email equal to the registrant's.
- [ ] AC5 — `Couple.Husband`/`Wife` are nullable; no consumer faults on an `AwaitingPartner` couple.
- [ ] AC6 — `POST /auth/register` returns the login response shape **and** sets the refresh cookie.
- [ ] AC7 — Password: ≥12 chars, ≤72 UTF-8 bytes, **no character-class rules**.
- [ ] AC8 — `GET /auth/availability` reports username and TogetherID availability; rate-limited 30/min.
- [ ] AC9 — Partner conversation is provisioned on `CoupleCompletedEvent`, **not** on registration.
- [ ] AC10 — `SearchByTogetherIDAsync` excludes couples not in state `Complete`.
- [ ] AC11 — Forgot-password emails only the partners that exist.
- [ ] AC12 — A TogetherID or username claimed between check and submit yields `409`, never `500`.
- [ ] AC13 — Unique index prevents two partners sharing a role within a couple.
- [ ] AC14 — `GET /auth/session` returns the caller's current `coupleState`.
- [ ] AC15 — The 13-field two-partner register payload is rejected (`400`).

## 5. Main User Flows (Chunk 1 exercises these via API, not UI)

1. **Register:** `POST /auth/register` (one partner) → `201` + tokens + cookie → couple `AwaitingPartner`.
2. **Invite:** `POST /auth/invitations` (authenticated registrant) → `201` + hashed token.
3. **Accept:** `POST /auth/invitations/accept` → couple `Complete` → partner conversation provisioned → `200` + tokens for the new partner.
4. **Solo login:** `POST /auth/login` as the registrant → `200`, `coupleState: AwaitingPartner`.

## 6. Out of Scope (this session)

- Chunk 2: login screen + 3-step registration wizard UI.
- Chunk 3: invite + invitation-acceptance screens (**blocked** — no design exists).
- Forgot/Reset password **screens**. The solo-couple defect fix in `ForgotPasswordCommandHandler` **is** in scope.
- `SearchCoupleQueryHandler` N+1 and its partial-match semantics (TDD R-7, pre-existing).

## 7. Key Decisions Carried In

- **D-1** Register issues tokens like login. **D-2** Backend-first chunking. **D-3** Password capped at 72 UTF-8 bytes (BCrypt truncation boundary). **D-4** Wizard state in memory (Chunk 2).
- **OQ-1 resolved 2026-07-10:** build `GET /auth/availability` for **both** username and TogetherID, accepting the username enumeration oracle, mitigated by a 30/min limiter, a boolean-only response, and audit logging. This knowingly deviates from spec assumption **A3**.
- **DL-1** `Husband`/`Wife` become `Partner?` so the compiler enumerates every fault site.
