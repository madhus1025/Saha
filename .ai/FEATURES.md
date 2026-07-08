# FEATURES — Domains & Business Rules

Rules below are enforced in code (verified). Inferences are marked.

## 1. Authentication & Account (Couple registration/login)
**Purpose:** One shared account per couple with two partners; issue & manage tokens.

- **Folders:** `Saha.Application/Features/Auth/Commands/{Register,Login,RefreshToken,Logout,ForgotPassword,ResetPassword}`; `Saha.API/Controllers/AuthController.cs`; `Domain/Entities/{Couple,Partner,RefreshToken,PasswordResetToken}.cs`. Frontend: `modules/auth`, `shared/stores/auth.store.ts`.
- **Core rules (in `Couple.Register` / `Partner.Create` / value objects):**
  - A couple has **exactly two** partners: one `Husband`, one `Wife` (`PartnerRole`).
  - Husband & wife **usernames must differ** (case-insensitive) — `USERNAMES_MUST_DIFFER`.
  - Husband & wife **emails must differ** (case-insensitive) — `EMAILS_MUST_DIFFER`.
  - **TogetherID:** uppercased, 4–50 chars, `^[A-Z0-9][A-Z0-9\-]{2,48}[A-Z0-9]$`, unique (DB unique index).
  - **Username:** lowercased, 3–30 chars, `^[a-z][a-z0-9_\.]{2,29}$`, unique (DB unique index).
  - **Date of birth:** partner must be **≥ 16** and **≤ 120** years old.
  - **Name:** non-empty, ≤ 100 chars.
  - One **PasswordHash per couple** (Bcrypt); login is by username → resolves couple.
  - **Access token** JWT TTL default 15 min (`Jwt:AccessTokenTtlMinutes`); `sub` claim = PartnerId.
  - **Refresh token** default 30 days (`Jwt:RefreshTokenTtlDays`), stored **hashed**, delivered as HttpOnly cookie.
  - `ChangePassword` and `Deactivate` **revoke all** refresh tokens.
  - **Password reset:** creating a new reset token **invalidates prior active** ones; reset code verified via hasher; used/expired tokens rejected.
- **Domain events:** `CoupleRegisteredEvent`, `PasswordChangedEvent` (dispatched on `SaveChanges`; consumers not found — likely email/audit hooks, *inferred*).
- **Extension points:** email delivery via `IEmailService` (Null/SMTP); token strategy via `ITokenService`.

## 2. Couple Connections (couple-to-couple linking)
**Purpose:** Couples find and connect with other couples.

- **Folders:** `Features/Connect/{Commands/{SendConnectionRequest,AcceptConnectionRequest,RejectConnectionRequest},Queries/{GetConnections,SearchCouple}}`; `ConnectController.cs`; `Domain/Entities/CoupleConnection.cs`. Frontend: `modules/connect`.
- **Core rules (in `CoupleConnection`):**
  - A couple **cannot connect with itself** — `SELF_CONNECTION`.
  - New request status = `Pending` (`ConnectionRequestStatus`: Pending/Accepted/Rejected).
  - Only a **Pending** request can be **Accepted** or **Rejected** — else `INVALID_STATUS`.
  - Accept/Reject stamp `AcceptedAt`/`RejectedAt`. `InitiatedByCoupleId` records the requester.
  - Accept/Reject are authorized against the current couple; wrong couple → 403 (*inferred from `[ProducesResponseType(403)]` + handler passing `_currentUser.CoupleId`*).
  - Search is by `TogetherID`.
- **Domain events:** `ConnectionRequestSentEvent`, `ConnectionAcceptedEvent`.
- **Depends on:** Auth (current-user context, TogetherID).

## 3. Profile
**Purpose:** View/update partner profile; upload profile picture.

- **Folders:** `Features/Profile/{Queries/GetProfile,Commands/{UpdateProfile,UploadProfilePicture}}`; `ProfileController.cs`; `Domain/Entities/Partner.cs`. Frontend: `modules/profile`.
- **Core rules:**
  - `GET me` returns current partner's profile; `GET partner` returns the *other* partner in the couple.
  - `UpdateProfile` re-validates name/DOB/email/phone via the same domain rules as registration.
  - **Picture upload** limited to **5 MB** (`[RequestSizeLimit(5_242_880)]`); stored via `IBlobStorageService` (Null saves to local `/uploads` in dev, Azure Blob in prod).
- **Domain concepts:** `ProfilePictureUrl` (nullable) on `Partner`.

## 4. Partner View (frontend-only)
**Purpose:** Let a logged-in partner "view as" the other partner.

- **Folders:** `shared/stores/partner-view.store.ts`, `shared/components/layout/PartnerViewBanner.tsx`.
- **Rules:** Client-side Zustand toggle (`isViewingAsPartner`, `partnerName`); a banner shows while active. No backend enforcement — presentation only (*verified: store holds only UI flags*).

## 5. Telemetry ingest
**Purpose:** Accept batched frontend telemetry events.

- **Folders:** `TelemetryController.cs` (`POST /telemetry/events`, `AllowAnonymous`, `telemetry` rate limiter); frontend `core/telemetry`.
- **Rules:** Anonymous; separate 60/min rate limit. See `docs/telemetry/TELEMETRY.md`.

## Placeholder features (routed, not implemented)
`finance`, `memories`, `goals`, `messages`, `calendar`, `settings` render `ComingSoonModule`. No backend endpoints or domain entities exist for them yet. These are the natural **extension points** for new features — follow the Connect/Profile module + CQRS pattern.
