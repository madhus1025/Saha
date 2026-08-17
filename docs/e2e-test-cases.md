# End-to-End Test Cases

## 1. Product Understanding

### Verified from code/docs

Saha is a couples application that gives one Couple account two Partner identities. A couple has a stable `TogetherID`, exactly two partners, and one shared password. Either partner can sign in with their own username and the shared password. The frontend is a React SPA; the backend is an ASP.NET Core API using Clean Architecture, MediatR, EF Core, JWT access tokens, and HttpOnly refresh cookies.

Primary journeys are registration, login/session handling, password reset, dashboard navigation, profile management, connecting with other couples, and messaging. Messaging includes an auto-provisioned partner conversation, group conversations with connected couples, text/media messages, edit/delete, reactions, pinning, hiding, renaming, and adding couples.

Important business/security rules include: access tokens are not persisted in localStorage; refresh tokens are stored in Secure HttpOnly SameSite=Strict cookies; auth endpoints are rate limited; password-reset lookup must not reveal whether an account exists; profile partner data is read-only in the UI; conversations are isolated by couple; non-participant conversation access returns 404 rather than revealing existence; only message senders can edit/delete; media type and size are server-enforced; frontend telemetry must not contain PII and backend telemetry sanitizes PII keys.

### Inferred from code/docs

Partner-view mode is a frontend-only read-only context switch and is intentionally not persisted because the Zustand store is not configured with persistence. Coming-soon modules are navigable placeholders only; their listed capabilities are not implemented product behavior yet. Some frontend E2E tests use mocked API routes, while `frontend/tests/e2e/real/*` and backend API tests cover more production-like flows.

### Unknown or needs product clarification

The exact production reset-code delivery and testability strategy is unclear because local email can be console/null backed. There is no explicit product spec for account deactivation, account deletion, audit-log UI, notification preferences, privacy settings, or feature flags. Accessibility acceptance criteria exist in manual tests but not consistently as automated checks. Offline behavior is not explicitly implemented beyond request failure handling.

## 2. Source Documents and Code Reviewed

| Source | Type | Why It Matters |
| --- | --- | --- |
| `README.md` | Product/technical overview | Defines Saha purpose, tech stack, runtime, and repository layout. |
| `docs/architecture/ARCHITECTURE_OVERVIEW.md` | Architecture doc | Defines Couple/Partner model, auth flow, token storage, refresh behavior, and security architecture. |
| `docs/architecture/DATABASE_SCHEMA.md` | Data model doc | Defines Couples, Partners, RefreshTokens, PasswordResetTokens, CoupleConnections, and AuditLogs. |
| `docs/testing/MANUAL_TEST_CASES.md` | Existing QA artifact | Provides existing manual test ideas for auth, profile, connect, security, accessibility, responsiveness, and performance. |
| `docs/development/TESTING_GUIDE.md` | Test strategy doc | Defines test pyramid, Playwright browser matrix, smoke tagging, and test data strategy. |
| `docs/telemetry/TELEMETRY.md` | Observability doc | Defines telemetry events, no-PII rule, Grafana dependencies, trace correlation, and metrics. |
| `frontend/src/app/router/router.tsx` | Frontend routing | Defines guest/protected routes and modules. |
| `frontend/src/shared/components/layout/*` | Layout/navigation | Defines sidebar navigation, logout behavior, partner-view banner, mobile sidebar, and app shell. |
| `frontend/src/shared/stores/auth.store.ts` | Auth state | Proves access tokens are intentionally excluded from persisted localStorage state. |
| `frontend/src/core/api/axios-instance.ts` | API client | Defines authorization header injection, traceparent propagation, 401 refresh queueing, logout on refresh failure. |
| `frontend/src/modules/auth/**` | Auth UI/forms/API | Defines registration wizard, login, forgot/reset password forms, and client validation. |
| `backend/src/Saha.API/Controllers/AuthController.cs` | Auth API | Defines auth endpoints, refresh cookie flags, logout, reset flow, and rate-limited anonymous endpoints. |
| `backend/src/Saha.Application/Features/Auth/**` | Auth application logic | Defines validation, login partner identification, audit logging, token creation, forgot/reset handlers. |
| `frontend/src/modules/profile/pages/ProfilePage.tsx` and `backend/src/Saha.API/Controllers/ProfileController.cs` | Profile feature | Defines own/partner profile views, self-edit, profile picture upload, and partner read-only behavior. |
| `frontend/src/modules/connect/pages/ConnectPage.tsx` and `backend/src/Saha.API/Controllers/ConnectController.cs` | Connect feature | Defines search, accepted/pending lists, send/accept/reject request APIs, and UI states. |
| `features/couple-messaging.spec`, `features/couple-messaging.tdd.md` | Messaging spec/TDD | Product source for messaging behavior and acceptance criteria. |
| `frontend/src/modules/messages/**` | Messaging UI | Defines conversation list, thread, composer, media attachment, reactions, dialogs, pin/hide/group actions. |
| `backend/src/Saha.API/Controllers/ConversationsController.cs`, `MessagesController.cs` | Messaging API | Defines conversation and message endpoints, statuses, request limits, and response contracts. |
| `backend/src/Saha.Application/Features/Messaging/**` | Messaging business rules | Defines access isolation, validators, media rules, sender-only edits/deletes, group rules, reactions. |
| `backend/src/Saha.Domain/Entities/*`, `ValueObjects/*`, `Enums/*` | Domain model | Defines aggregate constraints, message limits, conversation names, roles, statuses, and reaction allowlist. |
| `frontend/tests/e2e/**`, `backend/tests/**` | Existing tests | Establishes current UI/API/unit coverage and gaps. |

## 3. Feature Inventory

| Feature | User Goal | Risk Level | Key Files / Docs |
| --- | --- | --- | --- |
| Registration | Create a Couple account with two Partner identities and shared password. | Critical | `RegisterPage.tsx`, `register.schema.ts`, `RegisterCoupleCommandValidator.cs`, `AuthController.cs`, `DATABASE_SCHEMA.md` |
| Login, Session, Logout, Auth Guards | Authenticate as either partner, protect private routes, refresh sessions, and sign out safely. | Critical | `LoginPage.tsx`, `auth.store.ts`, `axios-instance.ts`, `AuthController.cs`, `LoginCommandHandler.cs`, `ProtectedRoute.tsx`, `Sidebar.tsx` |
| Forgot/Reset Password | Request a reset code without account enumeration and set a new shared password. | Critical | `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `AuthController.cs`, `ForgotPasswordCommandHandler.cs`, `ResetPasswordCommandHandler.cs` |
| Dashboard and Navigation | Land in the shared home and navigate implemented/placeholder modules. | Medium | `DashboardPage.tsx`, `router.tsx`, `Sidebar.tsx`, `ComingSoonModule.tsx` |
| Profile and Partner View | View/edit own profile, view partner profile read-only, upload avatar, and enter read-only partner view. | High | `ProfilePage.tsx`, `ProfileController.cs`, `UpdateProfileCommandValidator.cs`, `UploadProfilePictureCommandHandler.cs`, `partner-view.store.ts` |
| Connect | Discover couples by Together ID and manage pending/accepted connection requests. | Critical | `ConnectPage.tsx`, `ConnectController.cs`, `SearchCoupleQueryHandler.cs`, `SendConnectionRequestCommandHandler.cs`, `AcceptConnectionRequestCommandHandler.cs` |
| Messaging | Communicate in partner/group conversations with text, media, reactions, and conversation management. | Critical | `MessagesPage.tsx`, `ChatThread.tsx`, `MessagingDialogs.tsx`, `ConversationsController.cs`, `MessagesController.cs`, `ConversationAccess.cs` |
| Settings and Theme | Change appearance preference and see future settings sections. | Low | `SettingsPage.tsx`, `theme.store.ts`, `settings.spec.ts` |
| Telemetry and Observability | Capture safe auth funnel telemetry without PII and correlate browser/backend traces. | High | `TELEMETRY.md`, `telemetry.service.ts`, `events.ts`, `TelemetryController.cs`, `axios-instance.ts` |
| Security, Privacy, Accessibility, Responsive | Validate cross-cutting release risks across auth, data visibility, headers, keyboard/mobile behavior. | Critical | `ApplicationBuilderExtensions.cs`, `AuthController.cs`, `ProtectedRoute.tsx`, `docs/testing/MANUAL_TEST_CASES.md`, `playwright.config.ts` |

## 4. Test Case Summary

| Feature | Critical | High | Medium | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Registration | 2 | 3 | 2 | 1 | 8 |
| Login, Session, Logout, Auth Guards | 4 | 3 | 2 | 1 | 10 |
| Forgot/Reset Password | 2 | 2 | 1 | 1 | 6 |
| Dashboard and Navigation | 1 | 1 | 2 | 1 | 5 |
| Profile and Partner View | 2 | 3 | 2 | 1 | 8 |
| Connect | 3 | 3 | 1 | 1 | 8 |
| Messaging | 5 | 5 | 3 | 2 | 15 |
| Settings and Theme | 0 | 0 | 1 | 2 | 3 |
| Telemetry and Observability | 1 | 2 | 1 | 1 | 5 |
| Security, Privacy, Accessibility, Responsive | 3 | 2 | 2 | 1 | 8 |
| **Total** | **23** | **24** | **17** | **12** | **76** |

## 5. Test Cases by Feature

### Feature: `Registration`

#### Critical Test Cases

##### TC-REG-001: Register a new couple with two partners and shared password

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | New couple |
| Preconditions | User is logged out; unique Together ID, usernames, emails available. |
| Test Data | Together ID `E2E-<unique>`, husband/wife usernames, valid DOBs age 16+, unique emails, valid phones, password `SecurePass@123!`. |
| Steps | Open `/register`; complete Together, Husband, Wife, and Password steps; submit. |
| Expected Result | API returns 201; success UX is shown; user can navigate to `/login`; created couple has two partners and shared password works for both. |
| Negative / Edge Conditions | Repeat with duplicate Together ID must not create second account. |
| Automation Priority | P0 |
| Suggested Test Type | UI E2E, API E2E, Smoke |
| Dependencies | Backend API, database, auth rate limiter. |
| Source Evidence | `RegisterPage.tsx`; `register.schema.ts`; `AuthController.cs`; `RegisterCoupleCommandValidator.cs`; `Couple.cs`; `AuthControllerTests.cs` |
| Notes / Open Questions | Existing UI E2E validates wizard screens but not a full real registration through backend in the default mocked suite. |

##### TC-REG-002: Enforce uniqueness for Together ID, usernames, and partner emails

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | New couple |
| Preconditions | Existing couple already registered. |
| Test Data | Existing Together ID; existing husband or wife username; duplicate partner email. |
| Steps | Attempt registration using duplicate identifiers in separate runs. |
| Expected Result | API returns conflict/validation error; UI shows a safe error; no partial Couple or Partner records are usable for login. |
| Negative / Edge Conditions | Duplicate username can be in either husband or wife field. |
| Automation Priority | P0 |
| Suggested Test Type | API E2E, Regression |
| Dependencies | Database unique indexes. |
| Source Evidence | `DATABASE_SCHEMA.md`; `CoupleConfiguration.cs`; `PartnerConfiguration.cs`; `RegisterCoupleCommandHandler.cs`; `AuthControllerTests.cs` |
| Notes / Open Questions | Exact user-facing duplicate email message should be confirmed. |

#### High Test Cases

##### TC-REG-003: Validate Together ID format and auto-uppercase behavior

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | New couple |
| Preconditions | User is on registration step 1. |
| Test Data | `madhu-priya`, `AB`, invalid symbols, leading/trailing hyphen, 50 and 51 character values. |
| Steps | Enter each value; attempt Continue. |
| Expected Result | Input uppercases lowercase values; only uppercase letters, numbers, and internal hyphens within server/client limits are accepted. |
| Negative / Edge Conditions | Client min appears 3, server regex requires at least 4 due pattern length; verify and clarify expected minimum. |
| Automation Priority | P1 |
| Suggested Test Type | UI E2E, API E2E |
| Dependencies | None beyond app shell. |
| Source Evidence | `RegisterPage.tsx`; `register.schema.ts`; `RegisterCoupleCommandValidator.cs`; `TogetherID.cs`; `register.spec.ts` |
| Notes / Open Questions | Product docs/manual test say 4-character minimum, frontend message says 3; resolve before automation asserts exact copy. |

##### TC-REG-004: Validate partner fields and cross-partner differences

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | New couple |
| Preconditions | Valid Together ID entered. |
| Test Data | Username shorter than 3, uppercase username, invalid email, invalid phone, DOB under 16, same username/email for both partners. |
| Steps | Complete husband/wife steps with invalid values and attempt Continue. |
| Expected Result | Inline validation blocks progression; same username/email is rejected; DOB must be at least 16 years old and not implausibly old. |
| Negative / Edge Conditions | Server also rejects invalid payload if client is bypassed. |
| Automation Priority | P1 |
| Suggested Test Type | UI E2E, API E2E |
| Dependencies | Date-sensitive DOB generation. |
| Source Evidence | `register.schema.ts`; `RegisterCoupleCommandValidator.cs`; `Username.cs`; `PhoneNumber.cs`; `EmailAddress.cs`; `RegisterCoupleCommandValidatorTests.cs` |
| Notes / Open Questions | Use dynamic DOB dates in automation to avoid age-boundary drift. |

##### TC-REG-005: Validate shared password complexity and confirmation

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | New couple |
| Preconditions | User reaches Password step. |
| Test Data | Too short, missing uppercase, missing lowercase, missing number, missing special character, >128 chars, mismatched confirmation. |
| Steps | Enter each invalid password; submit. |
| Expected Result | Client and server reject invalid passwords; matching valid password creates account. |
| Negative / Edge Conditions | Verify shared password works for both partner usernames after registration. |
| Automation Priority | P1 |
| Suggested Test Type | UI E2E, API E2E |
| Dependencies | None. |
| Source Evidence | `register.schema.ts`; `RegisterCoupleCommandValidator.cs`; `BcryptPasswordHasher.cs`; `register.spec.ts` |
| Notes / Open Questions | Manual docs mention 12-character minimum but code enforces 8. Product decision needed. |

#### Medium Test Cases

##### TC-REG-006: Preserve entered values when moving back and forward through wizard

| Field | Details |
| --- | --- |
| Criticality | Medium |
| User Role | New couple |
| Preconditions | User has entered Step 1 and Step 2 data. |
| Test Data | Valid Together ID and husband details. |
| Steps | Continue to next step; click Back; inspect values; continue again. |
| Expected Result | Previously entered values remain; user does not lose progress. |
| Negative / Edge Conditions | Page refresh may lose unsaved form data unless persistence is intentionally added. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E, Regression |
| Dependencies | Browser state only. |
| Source Evidence | `RegisterPage.tsx`; `register.spec.ts` |
| Notes / Open Questions | No explicit persistence requirement across refresh. |

##### TC-REG-007: Complete registration wizard on mobile viewport

| Field | Details |
| --- | --- |
| Criticality | Medium |
| User Role | Mobile new couple |
| Preconditions | Mobile viewport, logged out. |
| Test Data | Valid unique registration data. |
| Steps | Complete all steps on 375px wide viewport. |
| Expected Result | Inputs and buttons remain visible and tappable; no horizontal scroll; step indicator does not overlap form content. |
| Negative / Edge Conditions | Long validation messages wrap cleanly. |
| Automation Priority | P2 |
| Suggested Test Type | Cross-platform, UI E2E |
| Dependencies | Playwright mobile projects. |
| Source Evidence | `playwright.config.ts`; `RegisterPage.tsx`; `docs/development/TESTING_GUIDE.md` |
| Notes / Open Questions | Add visual regression if mobile layout churns often. |

#### Low Test Cases

##### TC-REG-008: Registration page view telemetry is emitted without PII

| Field | Details |
| --- | --- |
| Criticality | Low |
| User Role | Logged-out visitor |
| Preconditions | Telemetry endpoint available or intercepted. |
| Test Data | None. |
| Steps | Open `/register`; wait for telemetry flush or force flush in test hook. |
| Expected Result | `auth.register.page_viewed` is queued/sent with safe environment/device metadata and no username/email/name/password. |
| Negative / Edge Conditions | Telemetry endpoint failure must not break registration UI. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E, Observability |
| Dependencies | Telemetry batching interval. |
| Source Evidence | `RegisterPage.tsx`; `telemetry.service.ts`; `events.ts`; `TelemetryController.cs`; `TELEMETRY.md` |
| Notes / Open Questions | Consider adding a deterministic telemetry flush test helper. |

### Feature: `Login, Session, Logout, Auth Guards`

#### Critical Test Cases

##### TC-AUTH-001: Husband and wife can each log in with own username and shared password

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Husband, Wife |
| Preconditions | Registered active couple. |
| Test Data | Husband username, wife username, shared password. |
| Steps | Log in as husband; verify dashboard identity; log out; log in as wife; verify wife identity. |
| Expected Result | Both logins succeed; response identifies correct partner ID, username, role, Together ID, and profile picture URL. |
| Negative / Edge Conditions | Wrong password fails without identifying which field was wrong. |
| Automation Priority | P0 |
| Suggested Test Type | UI E2E, API E2E, Smoke |
| Dependencies | Auth API and database. |
| Source Evidence | `LoginPage.tsx`; `LoginCommandHandler.cs`; `AuthController.cs`; `AuthControllerTests.cs` |
| Notes / Open Questions | Existing API tests cover partner identity; add real browser smoke with seeded users. |

##### TC-AUTH-002: Private routes require authentication and guest routes redirect authenticated users

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Anonymous user, authenticated partner |
| Preconditions | Browser has no auth state, then valid auth state. |
| Test Data | `/dashboard`, `/messages`, `/profile`, `/login`, `/register`. |
| Steps | Visit protected routes logged out; then visit guest routes while authenticated. |
| Expected Result | Logged-out user redirects to `/login`; authenticated user visiting login/register redirects to `/dashboard`. |
| Negative / Edge Conditions | Current ProtectedRoute does not preserve original requested destination after login. |
| Automation Priority | P0 |
| Suggested Test Type | UI E2E, Smoke |
| Dependencies | Router/localStorage state. |
| Source Evidence | `router.tsx`; `ProtectedRoute.tsx`; `GuestRoute.tsx`; `login.spec.ts`; `messages.spec.ts`; `profile.spec.ts` |
| Notes / Open Questions | Manual test expects redirect back to original destination; implementation currently redirects to login without return URL. |

##### TC-AUTH-003: Refresh cookie and token storage comply with security rules

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Authenticated partner |
| Preconditions | Successful login over HTTPS or secure test server. |
| Test Data | Valid credentials. |
| Steps | Log in; inspect Set-Cookie and localStorage `saha-auth`; call refresh endpoint. |
| Expected Result | Refresh cookie name `X-Refresh-Token` is HttpOnly, Secure, SameSite=Strict, scoped to `/api/v1/auth`; access token is not persisted in localStorage; refresh returns a new access token. |
| Negative / Edge Conditions | Missing/invalid refresh cookie returns 401 and browser state is cleared after failed refresh path. |
| Automation Priority | P0 |
| Suggested Test Type | API E2E, Security Regression |
| Dependencies | Secure cookie-capable test client. |
| Source Evidence | `AuthController.cs`; `auth.store.ts`; `axios-instance.ts`; `AuthControllerTests.cs`; `auth.store.test.ts` |
| Notes / Open Questions | Cookie `Path` limits automatic cookie send to `/api/v1/auth`; verify this is intentional for refresh/logout only. |

##### TC-AUTH-004: Logout revokes client state, clears query cache, and redirects to login

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Authenticated partner |
| Preconditions | User has loaded private cached data. |
| Test Data | Authenticated couple with profile/messages loaded. |
| Steps | Click Sign out in sidebar; inspect UI, localStorage state, and subsequent protected-route access. |
| Expected Result | Logout API is called; auth store is cleared; TanStack Query cache is cleared; user lands on `/login`; protected routes are inaccessible. |
| Negative / Edge Conditions | API logout failure still clears local client state. |
| Automation Priority | P0 |
| Suggested Test Type | UI E2E, Security Regression |
| Dependencies | Sidebar visible or mobile menu open. |
| Source Evidence | `Sidebar.tsx`; `auth.api.ts`; `AuthController.cs`; `auth.store.ts` |
| Notes / Open Questions | Verify server-side refresh token revocation details in logout handler with API tests. |

#### High Test Cases

##### TC-AUTH-005: Invalid login errors do not allow account enumeration

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Anonymous user |
| Preconditions | Login page available. |
| Test Data | Existing username + wrong password; nonexistent username + any password; SQL-like username string. |
| Steps | Submit each credential set. |
| Expected Result | All invalid credentials produce equivalent unauthorized UX; no field-specific existence leak; no SQL/database error. |
| Negative / Edge Conditions | Ensure audit logs record failure without leaking password. |
| Automation Priority | P1 |
| Suggested Test Type | UI E2E, API E2E, Security |
| Dependencies | Auth API. |
| Source Evidence | `LoginCommandHandler.cs`; `ExceptionHandlingMiddleware.cs`; `AuthControllerTests.cs`; `docs/testing/MANUAL_TEST_CASES.md` |
| Notes / Open Questions | UI copy may differ from backend `Invalid username or password.`. |

##### TC-AUTH-006: Auth endpoint rate limiting blocks excessive attempts

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Anonymous user |
| Preconditions | Rate limiting enabled. |
| Test Data | Repeated invalid login attempts. |
| Steps | Send more requests than auth policy allows within one minute. |
| Expected Result | At least one request returns 429; UI shows a non-crashing error. |
| Negative / Edge Conditions | Parallel attempts and sequential attempts should both be considered. |
| Automation Priority | P1 |
| Suggested Test Type | API E2E, Security Regression |
| Dependencies | Non-shared rate limiter state per test. |
| Source Evidence | `AuthController.cs`; `ServiceCollectionExtensions.cs`; `AuthControllerTests.cs`; `docs/architecture/ARCHITECTURE_OVERVIEW.md` |
| Notes / Open Questions | Exact configured limit should be asserted from service configuration, not docs only. |

##### TC-AUTH-007: 401 response triggers a single queued refresh and retries failed requests

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Authenticated partner with expired access token |
| Preconditions | Access token expired; valid refresh cookie present. |
| Test Data | Multiple concurrent protected API requests. |
| Steps | Trigger several API calls that return 401; observe refresh behavior. |
| Expected Result | Exactly one `/auth/refresh` call is made; queued requests retry with new access token; user stays on current page. |
| Negative / Edge Conditions | If refresh fails, all queued requests reject and auth state is cleared. |
| Automation Priority | P1 |
| Suggested Test Type | UI E2E, API E2E, Race Condition |
| Dependencies | Ability to force expired token or mock 401 responses. |
| Source Evidence | `axios-instance.ts`; `AuthController.cs`; `RefreshTokenCommandHandler.cs`; `ARCHITECTURE_OVERVIEW.md` |
| Notes / Open Questions | Add deterministic interceptor-level tests if browser E2E is flaky. |

#### Medium Test Cases

##### TC-AUTH-008: Login form validation and password visibility toggle work accessibly

| Field | Details |
| --- | --- |
| Criticality | Medium |
| User Role | Anonymous user |
| Preconditions | `/login` loaded. |
| Test Data | Empty username/password and sample password. |
| Steps | Submit empty form; toggle password visibility twice; navigate with keyboard. |
| Expected Result | Required validation appears; toggle changes input type and aria-label; fields/buttons are keyboard reachable. |
| Negative / Edge Conditions | Max length validations prevent overlong input. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E, Accessibility |
| Dependencies | None. |
| Source Evidence | `LoginPage.tsx`; `login.schema.ts`; `login.spec.ts`; `docs/testing/MANUAL_TEST_CASES.md` |
| Notes / Open Questions | Add axe checks for error association if accessibility is release-blocking. |

##### TC-AUTH-009: Refresh failure or network failure returns user to a safe unauthenticated state

| Field | Details |
| --- | --- |
| Criticality | Medium |
| User Role | Authenticated partner |
| Preconditions | Auth state persisted, no valid refresh cookie or refresh endpoint unavailable. |
| Test Data | Mock 401 on protected API and 401/500/network error on refresh. |
| Steps | Load a protected page; trigger API call. |
| Expected Result | Auth store clears; protected data is not shown after failure; user must sign in again. |
| Negative / Edge Conditions | Stale cached data should not remain visible after logout. |
| Automation Priority | P1 |
| Suggested Test Type | UI E2E, Regression |
| Dependencies | API interception. |
| Source Evidence | `axios-instance.ts`; `auth.store.ts`; `Sidebar.tsx` |
| Notes / Open Questions | Query cache is cleared on explicit logout, not interceptor logout; consider clearing cache on refresh failure too. |

#### Low Test Cases

##### TC-AUTH-010: Login page and submit telemetry events are emitted safely

| Field | Details |
| --- | --- |
| Criticality | Low |
| User Role | Anonymous user |
| Preconditions | Telemetry endpoint intercepted. |
| Test Data | Any login submission. |
| Steps | Open `/login`; submit login; inspect telemetry payload. |
| Expected Result | `auth.login.page_viewed` and login submit event are emitted with safe metadata and no username/password. |
| Negative / Edge Conditions | Telemetry failure does not block login attempt. |
| Automation Priority | P2 |
| Suggested Test Type | Observability, UI E2E |
| Dependencies | Telemetry batching. |
| Source Evidence | `LoginPage.tsx`; `useLogin.ts`; `telemetry.service.ts`; `TelemetryController.cs`; `TELEMETRY.md` |
| Notes / Open Questions | Verify `LOGIN_BUTTON_CLICKED` is actually tracked in `useLogin.ts` before asserting. |

### Feature: `Forgot/Reset Password`

#### Critical Test Cases

##### TC-PWD-001: Forgot password request returns safe success for existing and nonexistent identifiers

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Logged-out partner |
| Preconditions | At least one registered couple exists. |
| Test Data | Existing Together ID, existing username, nonexistent identifier. |
| Steps | Submit forgot-password form for each identifier. |
| Expected Result | UI shows success in all cases; API returns 204; response does not reveal account existence. |
| Negative / Edge Conditions | Rate limiting still applies and should not reveal existence. |
| Automation Priority | P0 |
| Suggested Test Type | API E2E, UI E2E, Security |
| Dependencies | Email service mock/null service. |
| Source Evidence | `ForgotPasswordPage.tsx`; `AuthController.cs`; `ForgotPasswordCommandHandler.cs`; `AuthControllerTests.cs` |
| Notes / Open Questions | Confirm whether username lookup is a supported public contract; UI says Together ID or username. |

##### TC-PWD-002: Reset shared password with valid code and verify both partners use new password

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Husband, Wife |
| Preconditions | Reset code generated and retrievable in test environment. |
| Test Data | Valid identifier, valid 6-digit code, new strong password. |
| Steps | Submit reset-password form; then log in as husband and wife with old and new passwords. |
| Expected Result | Reset succeeds; old shared password fails; new shared password works for both partners. |
| Negative / Edge Conditions | Existing sessions/refresh tokens revocation behavior needs confirmation. |
| Automation Priority | P0 |
| Suggested Test Type | API E2E, Integration E2E |
| Dependencies | Test hook or fake email service exposing reset code. |
| Source Evidence | `ResetPasswordPage.tsx`; `ResetPasswordCommandHandler.cs`; `PasswordResetToken.cs`; `frontend/tests/e2e/integration/password-reset-flow.spec.ts` |
| Notes / Open Questions | Clarify whether password reset should revoke all active refresh tokens. |

#### High Test Cases

##### TC-PWD-003: Invalid, expired, or reused reset code cannot change password

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Logged-out partner |
| Preconditions | Reset code generated; ability to manipulate time or use expired fixture. |
| Test Data | Wrong 6-digit code, expired code, already-used code. |
| Steps | Attempt reset with each invalid code. |
| Expected Result | Reset fails with safe generic error; password remains unchanged; used code cannot be reused. |
| Negative / Edge Conditions | Non-numeric or non-6-digit code is blocked client-side. |
| Automation Priority | P1 |
| Suggested Test Type | API E2E, Security Regression |
| Dependencies | Clock control or seeded expired token. |
| Source Evidence | `ResetPasswordPage.tsx`; `ResetPasswordCommandValidator.cs`; `ResetPasswordCommandHandler.cs`; `PasswordResetTokenConfiguration.cs` |
| Notes / Open Questions | Manual doc says 15-minute expiry; verify handler/config value before hard-coding. |

##### TC-PWD-004: New password validation mirrors registration complexity

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Logged-out partner |
| Preconditions | `/reset-password` loaded. |
| Test Data | Too short, missing character classes, mismatched confirm password, >128 chars. |
| Steps | Enter invalid new passwords and submit. |
| Expected Result | Client and server reject invalid passwords; valid password is accepted only with valid code. |
| Negative / Edge Conditions | Client currently enforces min 8; verify server validator also enforces same min. |
| Automation Priority | P1 |
| Suggested Test Type | UI E2E, API E2E |
| Dependencies | Reset code if testing successful path. |
| Source Evidence | `ResetPasswordPage.tsx`; `ResetPasswordCommandValidator.cs`; `RegisterCoupleCommandValidator.cs` |
| Notes / Open Questions | Align copy with registration password rules. |

#### Medium Test Cases

##### TC-PWD-005: Forgot/reset form navigation and resend flow are usable

| Field | Details |
| --- | --- |
| Criticality | Medium |
| User Role | Logged-out partner |
| Preconditions | User starts at login page. |
| Test Data | Any identifier. |
| Steps | Click Forgot password; submit identifier; click Enter reset code; click Resend code. |
| Expected Result | Navigation moves between `/forgot-password`, `/reset-password`, and back; no stale form state blocks resubmission. |
| Negative / Edge Conditions | Browser back button returns to usable pages. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E, Regression |
| Dependencies | None with mocked API. |
| Source Evidence | `LoginPage.tsx`; `ForgotPasswordPage.tsx`; `ResetPasswordPage.tsx`; `forgot-password.spec.ts`; `reset-password.spec.ts` |
| Notes / Open Questions | None. |

#### Low Test Cases

##### TC-PWD-006: Forgot password telemetry event is safe and non-blocking

| Field | Details |
| --- | --- |
| Criticality | Low |
| User Role | Logged-out partner |
| Preconditions | Telemetry endpoint intercepted or unavailable. |
| Test Data | Identifier that looks like Together ID and username. |
| Steps | Submit forgot-password form; inspect telemetry payload and UX. |
| Expected Result | Event name `auth.forgot_password.clicked` is emitted without identifier; telemetry failure does not alter success message. |
| Negative / Edge Conditions | Backend sanitizer strips PII keys if frontend accidentally sends them. |
| Automation Priority | P2 |
| Suggested Test Type | Observability, Security |
| Dependencies | Telemetry batching. |
| Source Evidence | `ForgotPasswordPage.tsx`; `telemetry.service.ts`; `TelemetryController.cs`; `TELEMETRY.md` |
| Notes / Open Questions | Add explicit test for sanitizer with a crafted telemetry payload. |

### Feature: `Dashboard and Navigation`

#### Critical Test Cases

##### TC-DASH-001: Authenticated user lands on dashboard with correct couple context

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Authenticated partner |
| Preconditions | Valid auth state and profile API available. |
| Test Data | Partner username, role, Together ID, partner profile. |
| Steps | Log in or seed auth; open `/dashboard`. |
| Expected Result | Dashboard displays greeting, current date, Together ID, own/partner avatars, and module cards. |
| Negative / Edge Conditions | Missing profile data should not crash the page. |
| Automation Priority | P0 |
| Suggested Test Type | UI E2E, Smoke |
| Dependencies | Profile API. |
| Source Evidence | `DashboardPage.tsx`; `profile.api.ts`; `dashboard.spec.ts` |
| Notes / Open Questions | Dashboard greeting uses username, not display name. Confirm desired copy. |

#### High Test Cases

##### TC-DASH-002: Module cards and sidebar navigate to correct routes

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Authenticated partner |
| Preconditions | User is on dashboard. |
| Test Data | Finance, Memories, Goals, Messages, Connect, Calendar links. |
| Steps | Click each dashboard card and sidebar nav item. |
| Expected Result | Browser navigates to the expected route; implemented modules render live pages and future modules render coming-soon page. |
| Negative / Edge Conditions | Active sidebar state follows current route. |
| Automation Priority | P1 |
| Suggested Test Type | UI E2E, Regression |
| Dependencies | Router. |
| Source Evidence | `DashboardPage.tsx`; `Sidebar.tsx`; `router.tsx`; `ComingSoonModule.tsx`; `dashboard.spec.ts` |
| Notes / Open Questions | None. |

#### Medium Test Cases

##### TC-DASH-003: Mobile sidebar opens, closes, and does not overlap content incorrectly

| Field | Details |
| --- | --- |
| Criticality | Medium |
| User Role | Mobile authenticated partner |
| Preconditions | Mobile viewport. |
| Test Data | Any authenticated state. |
| Steps | Tap menu button; navigate using sidebar; tap overlay/close button. |
| Expected Result | Sidebar slides in; overlay appears; navigation closes menu; close/overlay hides menu without content overlap. |
| Negative / Edge Conditions | Settings and Sign out remain reachable at bottom. |
| Automation Priority | P2 |
| Suggested Test Type | Cross-platform, UI E2E |
| Dependencies | Mobile viewport. |
| Source Evidence | `AppLayout.tsx`; `Sidebar.tsx`; `TopBar.tsx`; `docs/testing/MANUAL_TEST_CASES.md` |
| Notes / Open Questions | Consider screenshot assertions for layout overlap. |

##### TC-DASH-004: Unknown routes show Not Found without exposing private layout

| Field | Details |
| --- | --- |
| Criticality | Medium |
| User Role | Anonymous or authenticated visitor |
| Preconditions | None. |
| Test Data | `/unknown-route`. |
| Steps | Navigate to unknown path. |
| Expected Result | Not Found page renders; app does not crash. |
| Negative / Edge Conditions | Confirm whether unknown private-looking paths should require auth first. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E, Regression |
| Dependencies | Router. |
| Source Evidence | `router.tsx`; `NotFoundPage.tsx` |
| Notes / Open Questions | Current wildcard route is outside protected layout. |

#### Low Test Cases

##### TC-DASH-005: Coming-soon modules render declared placeholder content only

| Field | Details |
| --- | --- |
| Criticality | Low |
| User Role | Authenticated partner |
| Preconditions | User can navigate modules. |
| Test Data | `/finance`, `/memories`, `/goals`, `/calendar`. |
| Steps | Visit each route. |
| Expected Result | Page title, description, and feature bullets render; no nonfunctional controls imply implemented behavior. |
| Negative / Edge Conditions | Refreshing each route works through SPA hosting fallback. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E, Smoke |
| Dependencies | Static web app route fallback. |
| Source Evidence | `FinancePage.tsx`; `MemoriesPage.tsx`; `GoalsPage.tsx`; `CalendarPage.tsx`; `ComingSoonModule.tsx`; `staticwebapp.config.json` |
| Notes / Open Questions | Future feature bullets are not current product behavior; avoid deeper tests until implemented. |

### Feature: `Profile and Partner View`

#### Critical Test Cases

##### TC-PROF-001: View own profile and partner profile within same couple

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Authenticated partner |
| Preconditions | User has profile and partner profile data. |
| Test Data | Husband/wife profile details, Together ID. |
| Steps | Open `/profile`; inspect My Profile; switch to Partner tab. |
| Expected Result | Own details show on My Profile; partner details show read-only; Together section references the other partner correctly. |
| Negative / Edge Conditions | Partner profile request must never return another couple's partner. |
| Automation Priority | P0 |
| Suggested Test Type | UI E2E, API E2E |
| Dependencies | Profile API. |
| Source Evidence | `ProfilePage.tsx`; `ProfileController.cs`; `GetProfileQueryHandler.cs`; `profile.spec.ts` |
| Notes / Open Questions | Partner email/phone visibility is currently exposed to the other partner; confirm privacy intent. |

##### TC-PROF-002: Only own profile is editable; partner profile and partner-view mode are read-only

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Authenticated partner |
| Preconditions | User is on profile page. |
| Test Data | Own and partner profile. |
| Steps | Verify Edit/Camera on My Profile; switch partner tab; enter View as partner; inspect edit controls. |
| Expected Result | Edit/upload controls appear only for own profile outside partner-view; partner profile and partner-view hide edit/upload. |
| Negative / Edge Conditions | Direct API update only updates current authenticated partner ID, not supplied partner ID. |
| Automation Priority | P0 |
| Suggested Test Type | UI E2E, Security Regression |
| Dependencies | Partner profile API. |
| Source Evidence | `ProfilePage.tsx`; `ProfileController.cs`; `partner-view.store.ts`; `PartnerViewBanner.tsx`; `profile.spec.ts` |
| Notes / Open Questions | Partner-view currently changes UI state, not backend identity. |

#### High Test Cases

##### TC-PROF-003: Edit own profile with valid data and reject invalid data

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Authenticated partner |
| Preconditions | Own profile loaded. |
| Test Data | New name/email/phone/DOB; empty name; invalid email; invalid phone. |
| Steps | Open edit form; submit valid data; reload; then attempt invalid values. |
| Expected Result | Valid update persists and refreshes UI; invalid values are blocked client/server with error messages. |
| Negative / Edge Conditions | Duplicate email across partners/couples should be clarified and tested if enforced. |
| Automation Priority | P1 |
| Suggested Test Type | UI E2E, API E2E, Regression |
| Dependencies | Profile API and database. |
| Source Evidence | `ProfilePage.tsx`; `UpdateProfileCommandValidator.cs`; `UpdateProfileCommandHandler.cs`; `profile.spec.ts` |
| Notes / Open Questions | DOB age validation for profile updates should be verified; frontend only requires date presence. |

##### TC-PROF-004: Upload profile picture and update all visible avatars

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Authenticated partner |
| Preconditions | Own profile loaded. |
| Test Data | JPEG/PNG/WebP under 5 MB, non-image file, file over 5 MB. |
| Steps | Upload valid image; inspect toast and avatar; attempt invalid uploads. |
| Expected Result | Valid upload returns URL and updates profile/topbar/avatar state; invalid files fail with error toast; partner tab has no upload control. |
| Negative / Edge Conditions | Browser accept filter can be bypassed; server must reject unsupported/too-large files. |
| Automation Priority | P1 |
| Suggested Test Type | UI E2E, API E2E |
| Dependencies | Blob storage service or null storage. |
| Source Evidence | `ProfilePage.tsx`; `ProfileController.cs`; `UploadProfilePictureCommandHandler.cs`; `profile.api.ts`; `profile.spec.ts` |
| Notes / Open Questions | Server request size limit is 5,242,880 bytes; verify handler content-type allowlist. |

##### TC-PROF-005: Profile data cannot leak across account switch in same browser tab

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Two different couples using same browser |
| Preconditions | Couple A loads profile/messages; logs out; Couple B logs in. |
| Test Data | Two couples with distinct profile data. |
| Steps | Login as Couple A; load profile; logout; login as Couple B; inspect profile/dashboard/messages. |
| Expected Result | Query cache is cleared on logout; Couple B never sees Couple A profile or messages. |
| Negative / Edge Conditions | Refresh failure path should also avoid stale data exposure. |
| Automation Priority | P1 |
| Suggested Test Type | Real UI E2E, Security Regression |
| Dependencies | Real backend seed or robust mocks. |
| Source Evidence | `Sidebar.tsx`; `auth.store.ts`; `frontend/tests/e2e/real/account-switch.real.spec.ts` |
| Notes / Open Questions | Add equivalent test for interceptor-triggered logout. |

#### Medium Test Cases

##### TC-PROF-006: Partner-view banner persists across navigation but clears on refresh

| Field | Details |
| --- | --- |
| Criticality | Medium |
| User Role | Authenticated partner |
| Preconditions | Partner profile loaded. |
| Test Data | Partner name. |
| Steps | Enter View as partner; navigate to dashboard/messages; refresh browser. |
| Expected Result | Banner remains during SPA navigation; Exit returns to normal mode; full refresh clears partner-view because store is not persisted. |
| Negative / Edge Conditions | Read-only mode should not block logout/navigation. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E, Regression |
| Dependencies | Zustand in-memory store. |
| Source Evidence | `partner-view.store.ts`; `PartnerViewBanner.tsx`; `ProfilePage.tsx`; `PartnerViewBanner.test.tsx` |
| Notes / Open Questions | Dashboard currently reads auth username, not partner-view partner name; confirm expected partner-view behavior per manual test. |

##### TC-PROF-007: Loading and error states are handled on profile API failure

| Field | Details |
| --- | --- |
| Criticality | Medium |
| User Role | Authenticated partner |
| Preconditions | API can be delayed or fail. |
| Test Data | 500 response, delayed response. |
| Steps | Load profile with delayed `/profile/me`; then force error. |
| Expected Result | Loading spinner appears; page does not crash; error behavior is acceptable or gap is documented. |
| Negative / Edge Conditions | Partial partner profile failure should not corrupt own profile view. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E, Resilience |
| Dependencies | Network interception. |
| Source Evidence | `ProfilePage.tsx`; `profile.api.ts` |
| Notes / Open Questions | Profile page currently has limited explicit error UI; product clarification recommended. |

#### Low Test Cases

##### TC-PROF-008: Avatar fallback illustrations render when no profile picture exists

| Field | Details |
| --- | --- |
| Criticality | Low |
| User Role | Authenticated partner |
| Preconditions | Profile picture URL is null or placeholder.local. |
| Test Data | Husband and wife roles without image URL. |
| Steps | Load dashboard/profile; inspect avatar image sources. |
| Expected Result | Role-appropriate fallback illustration is shown; no broken image or placeholder URL leaks. |
| Negative / Edge Conditions | `placeholder.local` URLs are normalized to null in auth store. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E, Regression |
| Dependencies | Static assets. |
| Source Evidence | `CoupleAvatar.tsx`; `auth.store.ts`; `profile.spec.ts` |
| Notes / Open Questions | None. |

### Feature: `Connect`

#### Critical Test Cases

##### TC-CONN-001: Search for another couple by Together ID and send connection request

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Authenticated partner |
| Preconditions | Target couple exists and is not already connected. |
| Test Data | Target Together ID; search prefix length >= 2. |
| Steps | Open Connect; Find Couples; search target; click Connect. |
| Expected Result | Search result appears; request API returns 201; result changes to pending and pending list includes outgoing request. |
| Negative / Edge Conditions | Search input auto-uppercase; queries under 2 chars are not sent by UI. |
| Automation Priority | P0 |
| Suggested Test Type | UI E2E, API E2E, Smoke |
| Dependencies | Two seeded couples. |
| Source Evidence | `ConnectPage.tsx`; `connect.api.ts`; `ConnectController.cs`; `SearchCoupleQueryHandler.cs`; `SendConnectionRequestCommandHandler.cs`; `connect.spec.ts` |
| Notes / Open Questions | Search own Together ID should return no result; keep as security test below. |

##### TC-CONN-002: Recipient accepts incoming connection request

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Recipient couple |
| Preconditions | Couple A sent pending request to Couple B. |
| Test Data | Pending connection ID. |
| Steps | Log in as Couple B; open Pending; click Accept; then inspect Connected tab for both couples. |
| Expected Result | Request status becomes Accepted; both couples see each other as connected; pending badge clears. |
| Negative / Edge Conditions | Initiator cannot accept their own outgoing request. |
| Automation Priority | P0 |
| Suggested Test Type | API E2E, Real UI E2E |
| Dependencies | Multi-user login/session. |
| Source Evidence | `ConnectPage.tsx`; `ConnectController.cs`; `AcceptConnectionRequestCommandHandler.cs`; `MessagingApiTests.cs` helper `ConnectAsync`; `real/connect.real.spec.ts` |
| Notes / Open Questions | Need thread-level acceptance tests if notifications are later added. |

##### TC-CONN-003: Recipient rejects incoming connection request

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Recipient couple |
| Preconditions | Pending incoming request exists. |
| Test Data | Pending connection ID. |
| Steps | Open Pending; click Reject. |
| Expected Result | Request leaves pending list; accepted connection is not created; search behavior for rejected status follows product decision. |
| Negative / Edge Conditions | Non-recipient cannot reject another couple's request. |
| Automation Priority | P1 |
| Suggested Test Type | API E2E, UI E2E |
| Dependencies | Multi-user setup. |
| Source Evidence | `ConnectPage.tsx`; `ConnectController.cs`; `RejectConnectionRequestCommandHandler.cs`; `ConnectionRequestStatus.cs` |
| Notes / Open Questions | UI maps `Rejected` search status to null, allowing Connect button; confirm whether re-request after rejection is intended. |

#### High Test Cases

##### TC-CONN-004: Prevent self-connection and duplicate connection requests

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Authenticated partner |
| Preconditions | Couple has own Together ID and maybe existing pending/accepted connection. |
| Test Data | Own Together ID; target with pending request; target already connected. |
| Steps | Search own ID; attempt duplicate request through API; search existing target. |
| Expected Result | Own couple is excluded; duplicate request returns conflict or disabled UI; accepted/pending badges replace Connect button. |
| Negative / Edge Conditions | Duplicate in reverse direction also prevented. |
| Automation Priority | P1 |
| Suggested Test Type | API E2E, UI E2E, Security |
| Dependencies | Database unique connection rule. |
| Source Evidence | `SearchCoupleQueryHandler.cs`; `SendConnectionRequestCommandHandler.cs`; `CoupleConnectionConfiguration.cs`; `ConnectPage.tsx`; `connect.spec.ts` |
| Notes / Open Questions | Database unique index uses ordered CoupleA/CoupleB; handler must check both directions. |

##### TC-CONN-005: Only recipient can accept/reject a pending request

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Initiator, unrelated couple, recipient |
| Preconditions | Pending request exists. |
| Test Data | Connection ID. |
| Steps | Call accept/reject as initiator and unrelated couple; then as recipient. |
| Expected Result | Initiator/unrelated access returns 403/404 as implemented; recipient succeeds. |
| Negative / Edge Conditions | Response should not reveal unrelated connection details. |
| Automation Priority | P1 |
| Suggested Test Type | API E2E, Security |
| Dependencies | Three seeded couples. |
| Source Evidence | `AcceptConnectionRequestCommandHandler.cs`; `RejectConnectionRequestCommandHandler.cs`; `ConnectController.cs` |
| Notes / Open Questions | Verify exact status for unrelated couple and document policy. |

##### TC-CONN-006: Connection data visibility is limited to current couple

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Authenticated partner |
| Preconditions | Multiple couples and connections exist. |
| Test Data | Accepted, pending incoming, pending outgoing, unrelated connections. |
| Steps | Query connections with status filters; inspect returned records. |
| Expected Result | Only connections involving current couple return; `isInitiator` correctly identifies outgoing vs incoming. |
| Negative / Edge Conditions | Invalid status query should fall back safely or return all per implementation. |
| Automation Priority | P1 |
| Suggested Test Type | API E2E |
| Dependencies | Database seed. |
| Source Evidence | `ConnectController.cs`; `GetConnectionsQueryHandler.cs`; `ConnectionRepository.cs`; `connect.spec.ts` |
| Notes / Open Questions | Invalid status currently parses to null; confirm expected behavior. |

#### Medium Test Cases

##### TC-CONN-007: Connect empty, loading, and failure states are usable

| Field | Details |
| --- | --- |
| Criticality | Medium |
| User Role | Authenticated partner |
| Preconditions | API can be delayed/fail. |
| Test Data | Empty accepted/pending arrays, empty search result, failed request response. |
| Steps | Visit each tab under empty/delayed/error responses. |
| Expected Result | Empty states show useful messages; loading spinner appears for search; mutation failure shows toast. |
| Negative / Edge Conditions | Search result list clears or updates safely when query changes quickly. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E, Resilience |
| Dependencies | Network interception. |
| Source Evidence | `ConnectPage.tsx`; `connect.spec.ts`; `extractApiError.ts` |
| Notes / Open Questions | There is no explicit query error UI for connection list failures. |

#### Low Test Cases

##### TC-CONN-008: Pending tab badge reflects pending request count

| Field | Details |
| --- | --- |
| Criticality | Low |
| User Role | Authenticated partner |
| Preconditions | Pending connections exist. |
| Test Data | One or more pending connections. |
| Steps | Open Connect; inspect Pending tab before and after accept/reject. |
| Expected Result | Badge displays count when pending list has items and disappears when zero. |
| Negative / Edge Conditions | Outgoing and incoming both count. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E |
| Dependencies | Pending connection data. |
| Source Evidence | `ConnectPage.tsx`; `connect.spec.ts` |
| Notes / Open Questions | None. |

### Feature: `Messaging`

#### Critical Test Cases

##### TC-MSG-001: Partner conversation is auto-provisioned, pinned first, and accessible only to the couple

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Authenticated partner |
| Preconditions | Registered/logged-in couple. |
| Test Data | Couple with two partners; unrelated couple. |
| Steps | Open `/messages`; inspect first conversation; call conversation detail as unrelated couple. |
| Expected Result | Partner conversation exists, is pinned first, title resolves to partner conversation, and unrelated couple receives 404. |
| Negative / Edge Conditions | Unauthenticated request returns 401. |
| Automation Priority | P0 |
| Suggested Test Type | API E2E, UI E2E, Security |
| Dependencies | Messaging provisioning event handler. |
| Source Evidence | `ProvisionPartnerConversationHandler.cs`; `GetConversationsQueryHandler.cs`; `ConversationAccess.cs`; `MessagingApiTests.cs`; `messages.spec.ts` |
| Notes / Open Questions | Verify provisioning timing after registration in real deployment. |

##### TC-MSG-002: Send, list, persist, and paginate text messages

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Authenticated partner |
| Preconditions | Conversation exists. |
| Test Data | Text body, messages > page size. |
| Steps | Open conversation; send message; refresh; request older messages with cursor. |
| Expected Result | Message appears in thread and list preview; persists after refresh; API returns newest-first pages with `nextCursor`; UI renders oldest-to-newest in thread. |
| Negative / Edge Conditions | Empty/whitespace and >4000-char bodies are rejected. |
| Automation Priority | P0 |
| Suggested Test Type | UI E2E, API E2E, Regression |
| Dependencies | Message repository/database. |
| Source Evidence | `ChatThread.tsx`; `SendTextMessageValidator.cs`; `Message.cs`; `GetMessagesQueryHandler.cs`; `MessagingApiTests.cs`; `messages.spec.ts` |
| Notes / Open Questions | Frontend schema exists but composer currently relies on disabled send for empty text; server remains authoritative. |

##### TC-MSG-003: Conversation access isolation returns 404 for non-participants

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Unrelated couple |
| Preconditions | Couple A has conversation; Couple B is unrelated. |
| Test Data | Couple A conversation ID. |
| Steps | Couple B calls get conversation, get messages, send message, edit/delete endpoints for Couple A conversation. |
| Expected Result | API returns 404 rather than 403 to avoid leaking existence; no data is returned or mutated. |
| Negative / Edge Conditions | Participant but non-sender edit/delete returns 403, not 404. |
| Automation Priority | P0 |
| Suggested Test Type | API E2E, Security |
| Dependencies | Multi-couple seed. |
| Source Evidence | `ConversationAccess.cs`; `MessagesController.cs`; `ConversationsController.cs`; `MessagingApiTests.cs` |
| Notes / Open Questions | Add coverage for every mutation endpoint, not only send/get. |

##### TC-MSG-004: Sender-only edit and delete rules protect message integrity

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Message sender, same-couple non-sender |
| Preconditions | Husband sends a message; wife logs in. |
| Test Data | Message ID and edited body. |
| Steps | Sender edits and deletes own message; non-sender attempts edit/delete. |
| Expected Result | Sender edit marks message edited; sender delete tombstones body/attachment; non-sender receives 403 and UI hides edit/delete controls. |
| Negative / Edge Conditions | Deleted message cannot be edited/reacted if domain forbids it; verify current behavior. |
| Automation Priority | P0 |
| Suggested Test Type | UI E2E, API E2E, Security Regression |
| Dependencies | Two partner sessions. |
| Source Evidence | `ChatThread.tsx`; `EditMessageCommandHandler.cs`; `DeleteMessageCommandHandler.cs`; `MessagingApiTests.cs`; `messages.spec.ts` |
| Notes / Open Questions | UI currently has no delete confirmation; consider product review due destructive action. |

##### TC-MSG-005: Create group conversation only with accepted connected couples

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Authenticated partner with connections |
| Preconditions | One accepted connection and one unconnected couple exist. |
| Test Data | Group name, target connected couple ID, unconnected couple ID. |
| Steps | Create group via UI with connected couple; call API with unconnected target. |
| Expected Result | Group creation succeeds with connected couple and includes all partners; unconnected target returns 409; UI only lists connected couples. |
| Negative / Edge Conditions | Empty group name or no selected couple is blocked. |
| Automation Priority | P0 |
| Suggested Test Type | UI E2E, API E2E |
| Dependencies | Connect feature. |
| Source Evidence | `MessagingDialogs.tsx`; `CreateGroupConversationHandler.cs`; `CreateGroupConversationValidator.cs`; `MessagingApiTests.cs`; `messages.spec.ts` |
| Notes / Open Questions | New group picker now requires search before listing connections; keep UI test aligned. |

#### High Test Cases

##### TC-MSG-006: Group owner can rename; non-owner cannot

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Group owner, non-owner participant |
| Preconditions | Group conversation exists. |
| Test Data | New group name, over-80-char name. |
| Steps | Owner opens settings and renames; non-owner opens settings/calls API; test invalid name. |
| Expected Result | Owner rename persists to header/list; non-owner UI hides Rename and API returns 403; invalid names are rejected. |
| Negative / Edge Conditions | Empty/unchanged name disables Save. |
| Automation Priority | P1 |
| Suggested Test Type | UI E2E, API E2E |
| Dependencies | Group conversation. |
| Source Evidence | `MessagingDialogs.tsx`; `RenameConversationCommandHandler.cs`; `RenameConversationValidator.cs`; `ConversationName.cs`; `MessagingApiTests.cs`; `messages.spec.ts` |
| Notes / Open Questions | None. |

##### TC-MSG-007: Add eligible connected couple to group conversation

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Group participant |
| Preconditions | Existing group and an accepted connected couple not already in group. |
| Test Data | Target couple ID. |
| Steps | Open settings; add eligible couple; inspect participants. |
| Expected Result | Add succeeds; both partners from target couple become participants; target disappears from addable list. |
| Negative / Edge Conditions | Adding unconnected or already-participating couple returns 409/validation error. |
| Automation Priority | P1 |
| Suggested Test Type | UI E2E, API E2E |
| Dependencies | Connect feature, group conversation. |
| Source Evidence | `MessagingDialogs.tsx`; `AddCoupleToConversationCommandHandler.cs`; `MessagingApiTests.cs`; `messages.spec.ts` |
| Notes / Open Questions | UI allows any participant to add; confirm owner-only is not desired. |

##### TC-MSG-008: Send image/video media with server-side type and size validation

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Authenticated partner |
| Preconditions | Conversation exists; blob storage available or stubbed. |
| Test Data | JPEG under 10 MB, MP4 under 50 MB, unsupported PDF, image >10 MB, video >50 MB. |
| Steps | Upload each file through UI/API. |
| Expected Result | Supported media creates message with attachment and renders image/video; unsupported/oversized returns error and no message. |
| Negative / Edge Conditions | Request size limit caps media endpoint at 50 MB; image/video per-type limits enforced in handler. |
| Automation Priority | P1 |
| Suggested Test Type | API E2E, UI E2E |
| Dependencies | Blob storage service. |
| Source Evidence | `ChatThread.tsx`; `MessagesController.cs`; `SendMediaMessageCommandHandler.cs`; `messaging.schemas.ts`; `MessagingApiTests.cs`; `messages.spec.ts` |
| Notes / Open Questions | Caption is supported by API but UI file picker sends no caption today. |

##### TC-MSG-009: Reactions are allowlisted, one per partner, changeable, and removable

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Conversation participant |
| Preconditions | Message exists. |
| Test Data | `heart`, `laugh`, unsupported token. |
| Steps | React; change reaction; remove reaction; attempt unsupported token by API. |
| Expected Result | Reaction chip count updates; changing replaces previous reaction; removing clears own reaction; unsupported token returns 400. |
| Negative / Edge Conditions | Multiple partners reacting should aggregate counts. |
| Automation Priority | P1 |
| Suggested Test Type | UI E2E, API E2E |
| Dependencies | Message exists. |
| Source Evidence | `ChatThread.tsx`; `messaging.schemas.ts`; `ReactionEmoji.cs`; `ReactToMessageCommandHandler.cs`; `MessagingApiTests.cs`; `messages.spec.ts` |
| Notes / Open Questions | Verify reaction to deleted message behavior. |

##### TC-MSG-010: Hide conversation is scoped to acting couple only

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Group participant |
| Preconditions | Group with Couple A and B exists. |
| Test Data | Group conversation ID. |
| Steps | Couple A hides conversation; Couple A and B both list conversations. |
| Expected Result | Hidden conversation disappears for Couple A but remains visible to Couple B. |
| Negative / Edge Conditions | Hiding partner conversation should follow current domain rule or reject if unsupported. |
| Automation Priority | P1 |
| Suggested Test Type | API E2E, UI E2E |
| Dependencies | Multi-couple group. |
| Source Evidence | `MessagingDialogs.tsx`; `HideConversationCommandHandler.cs`; `ConversationCoupleState.cs`; `MessagingApiTests.cs`; `messages.spec.ts` |
| Notes / Open Questions | Hide button uses trash icon; ensure users understand it is not global deletion. |

#### Medium Test Cases

##### TC-MSG-011: Pin and unpin conversation reorder/list marker correctly

| Field | Details |
| --- | --- |
| Criticality | Medium |
| User Role | Conversation participant |
| Preconditions | Group conversation exists. |
| Test Data | Conversation ID. |
| Steps | Open settings; pin; inspect list marker/order; unpin. |
| Expected Result | Pin state toggles; list shows pin icon; unpin removes marker; state persists after refresh. |
| Negative / Edge Conditions | Partner conversation may be pinned by default. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E, API E2E |
| Dependencies | Conversation state. |
| Source Evidence | `ConversationList.tsx`; `MessagingDialogs.tsx`; `SetConversationPinCommandHandler.cs`; `messages.spec.ts` |
| Notes / Open Questions | Sorting rules for multiple pinned conversations should be clarified. |

##### TC-MSG-012: Messaging empty/loading/error states are understandable

| Field | Details |
| --- | --- |
| Criticality | Medium |
| User Role | Authenticated partner |
| Preconditions | API can return empty, delayed, and failed responses. |
| Test Data | Empty conversations, empty thread, 500 response. |
| Steps | Load messages under each condition. |
| Expected Result | Conversation skeleton/loading appears; empty list says no conversations; empty thread says Say hello; errors show non-crashing messages. |
| Negative / Edge Conditions | Retry behavior is governed by TanStack Query defaults; document if needed. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E, Resilience |
| Dependencies | Network interception. |
| Source Evidence | `ConversationList.tsx`; `ChatThread.tsx`; `use-messaging.ts` |
| Notes / Open Questions | No offline queue is implemented. |

##### TC-MSG-013: Mobile messages master-detail layout does not overlap

| Field | Details |
| --- | --- |
| Criticality | Medium |
| User Role | Mobile authenticated partner |
| Preconditions | Mobile viewport and at least two conversations. |
| Test Data | Partner and group conversations. |
| Steps | Open `/messages`; select conversation; return with back button. |
| Expected Result | List shows alone first; thread shows alone after selection; Back returns to list; content does not overlap. |
| Negative / Edge Conditions | Long conversation titles and message bodies wrap without layout break. |
| Automation Priority | P2 |
| Suggested Test Type | Cross-platform, UI E2E |
| Dependencies | Playwright mobile project. |
| Source Evidence | `MessagesPage.tsx`; `ChatThread.tsx`; `messages.spec.ts` |
| Notes / Open Questions | Add visual regression for long content. |

#### Low Test Cases

##### TC-MSG-014: Draft text is scoped per conversation while navigating

| Field | Details |
| --- | --- |
| Criticality | Low |
| User Role | Authenticated partner |
| Preconditions | At least two conversations. |
| Test Data | Draft text in each conversation. |
| Steps | Type unsent text in conversation A; switch to B; type different text; return to A. |
| Expected Result | Each conversation retains its own draft until sent/cleared. |
| Negative / Edge Conditions | Full page refresh clears drafts because store is not persisted. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E |
| Dependencies | `messages.store.ts`. |
| Source Evidence | `messages.store.ts`; `ChatThread.tsx` |
| Notes / Open Questions | Confirm whether draft persistence across refresh is desired. |

##### TC-MSG-015: Conversation title and participant summary render correctly

| Field | Details |
| --- | --- |
| Criticality | Low |
| User Role | Authenticated partner |
| Preconditions | Partner and multi-couple group conversations exist. |
| Test Data | Partner IDs, participant names, group name. |
| Steps | Inspect conversation list and thread headers for partner and group chats. |
| Expected Result | Partner title is based on the other partner; group title uses group name; participant summary lists all individual partners. |
| Negative / Edge Conditions | Missing name/avatar falls back safely. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E, Unit |
| Dependencies | Profile/participant DTOs. |
| Source Evidence | `utils.ts`; `ConversationList.tsx`; `ChatThread.tsx`; `messages.spec.ts`; `ConversationList.test.tsx` |
| Notes / Open Questions | None. |

### Feature: `Settings and Theme`

#### Medium Test Cases

##### TC-SET-001: Theme selection applies and persists user preference

| Field | Details |
| --- | --- |
| Criticality | Medium |
| User Role | Authenticated partner |
| Preconditions | User is on `/settings`. |
| Test Data | `light`, `dark`, `system`. |
| Steps | Select each theme; refresh page; inspect document class/localStorage. |
| Expected Result | Dark class toggles according to preference/system; `saha-theme` persists selected option. |
| Negative / Edge Conditions | If localStorage is blocked, UI should still apply current selection without crash. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E, Regression |
| Dependencies | Browser localStorage and matchMedia. |
| Source Evidence | `SettingsPage.tsx`; `theme.store.ts`; `settings.spec.ts` |
| Notes / Open Questions | System preference changes after initial selection are not actively listened for. |

#### Low Test Cases

##### TC-SET-002: Settings page coming-soon sections are non-destructive placeholders

| Field | Details |
| --- | --- |
| Criticality | Low |
| User Role | Authenticated partner |
| Preconditions | User is on `/settings`. |
| Test Data | Notifications, Privacy & Security sections. |
| Steps | Inspect sections. |
| Expected Result | Sections clearly say Coming soon and expose no inactive/destructive controls. |
| Negative / Edge Conditions | None. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E |
| Dependencies | None. |
| Source Evidence | `SettingsPage.tsx` |
| Notes / Open Questions | Future privacy/security settings need separate high-risk test design when implemented. |

##### TC-SET-003: Settings route is protected

| Field | Details |
| --- | --- |
| Criticality | Low |
| User Role | Anonymous user |
| Preconditions | No auth state. |
| Test Data | `/settings`. |
| Steps | Navigate directly to `/settings`. |
| Expected Result | Redirects to `/login`. |
| Negative / Edge Conditions | After login, user lands on dashboard unless return-url behavior is added. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E, Smoke |
| Dependencies | Router. |
| Source Evidence | `router.tsx`; `ProtectedRoute.tsx`; `settings.spec.ts` |
| Notes / Open Questions | None. |

### Feature: `Telemetry and Observability`

#### Critical Test Cases

##### TC-TEL-001: Telemetry ingestion sanitizes PII and never blocks user flows

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Any user |
| Preconditions | Telemetry endpoint available and unavailable in separate runs. |
| Test Data | Batch with safe properties plus malicious PII keys: username, email, password, phone, name, DOB. |
| Steps | Send batch to `/api/v1/telemetry/events`; trigger frontend telemetry with endpoint failure. |
| Expected Result | API returns 204; logs/metrics use sanitized properties; frontend drops failed telemetry without throwing or blocking UI. |
| Negative / Edge Conditions | Empty batch and >50 events return 204; only first 50 processed. |
| Automation Priority | P1 |
| Suggested Test Type | API E2E, Observability, Security |
| Dependencies | Logger/metrics observable in test or API response status. |
| Source Evidence | `TelemetryController.cs`; `telemetry.service.ts`; `telemetry.api.ts`; `TELEMETRY.md` |
| Notes / Open Questions | Automated assertion of logs may require test logger sink. |

#### High Test Cases

##### TC-TEL-002: Auth funnel events use canonical names and safe metadata

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Anonymous visitor |
| Preconditions | Telemetry endpoint intercepted. |
| Test Data | Login, register, forgot password page visits/actions. |
| Steps | Open login/register; submit forgot-password; inspect event payload names/properties. |
| Expected Result | Event names match `events.ts`; properties include environment, app version, platform, browser, device type, anonymous ID, session ID, trace ID; no form data is sent. |
| Negative / Edge Conditions | Storage blocked still generates UUIDs without crash. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E, Observability |
| Dependencies | Telemetry batching or flush. |
| Source Evidence | `events.ts`; `telemetry.service.ts`; `LoginPage.tsx`; `RegisterPage.tsx`; `ForgotPasswordPage.tsx`; `TELEMETRY.md` |
| Notes / Open Questions | Verify login button event is wired in `useLogin.ts`. |

##### TC-TEL-003: Axios propagates W3C traceparent header to backend

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Any user making API request |
| Preconditions | Frontend OTel utility returns traceparent. |
| Test Data | Any API request. |
| Steps | Trigger API request and inspect request headers. |
| Expected Result | `traceparent` header is included when available; backend can correlate request traces. |
| Negative / Edge Conditions | Missing traceparent utility value should not block API request. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E, Integration |
| Dependencies | Request interception. |
| Source Evidence | `axios-instance.ts`; `otel.ts`; `TELEMETRY.md`; `Program.cs` |
| Notes / Open Questions | Browser-to-backend trace validation in Grafana is best covered manually/staging. |

#### Medium Test Cases

##### TC-TEL-004: Telemetry batch caps and invalid events are handled safely

| Field | Details |
| --- | --- |
| Criticality | Medium |
| User Role | Any browser/session |
| Preconditions | Telemetry API reachable. |
| Test Data | 0 events, 51 events, events with blank names, values >512 chars. |
| Steps | POST crafted batches. |
| Expected Result | API always returns 204; blank names skipped; only 50 events processed; oversized property values excluded. |
| Negative / Edge Conditions | Invalid/missing properties should not throw. |
| Automation Priority | P2 |
| Suggested Test Type | API E2E |
| Dependencies | Test logger if asserting processed count. |
| Source Evidence | `TelemetryController.cs`; `TELEMETRY.md` |
| Notes / Open Questions | Consider adding response diagnostics in non-prod if needed. |

#### Low Test Cases

##### TC-TEL-005: Anonymous ID and session ID lifetimes follow storage design

| Field | Details |
| --- | --- |
| Criticality | Low |
| User Role | Browser visitor |
| Preconditions | Browser storage enabled. |
| Test Data | Multiple tabs/sessions. |
| Steps | Open app; inspect `saha_anon_id` in localStorage and `saha_session_id` in sessionStorage; close/reopen tab. |
| Expected Result | Anonymous ID persists across sessions; session ID is scoped to tab/session. |
| Negative / Edge Conditions | Storage denied generates ephemeral IDs without crash. |
| Automation Priority | P2 |
| Suggested Test Type | UI E2E |
| Dependencies | Browser context control. |
| Source Evidence | `telemetry.service.ts`; `TELEMETRY.md` |
| Notes / Open Questions | None. |

### Feature: `Security, Privacy, Accessibility, Responsive`

#### Critical Test Cases

##### TC-SEC-001: API security headers are present on responses

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Any client |
| Preconditions | API running. |
| Test Data | `/health`, protected endpoint, auth endpoint. |
| Steps | Inspect response headers. |
| Expected Result | Headers include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, Permissions Policy, and CSP. |
| Negative / Edge Conditions | Error responses should also include headers because middleware wraps pipeline. |
| Automation Priority | P1 |
| Suggested Test Type | API E2E, Security |
| Dependencies | API host. |
| Source Evidence | `ApplicationBuilderExtensions.cs`; `Program.cs`; `docs/testing/MANUAL_TEST_CASES.md` |
| Notes / Open Questions | Current CSP `connect-src 'self'` may need production API/static host review. |

##### TC-SEC-002: Unauthorized API access is rejected consistently

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Anonymous client |
| Preconditions | No bearer token/cookie. |
| Test Data | `/api/v1/profile/me`, `/api/v1/connect/connections`, `/api/v1/conversations`. |
| Steps | Call each endpoint without auth. |
| Expected Result | Protected endpoints return 401; anonymous endpoints remain available only where designed. |
| Negative / Edge Conditions | Expired/invalid bearer token also returns 401. |
| Automation Priority | P0 |
| Suggested Test Type | API E2E, Smoke, Security |
| Dependencies | API host. |
| Source Evidence | `ApiControllerBase.cs`; `AuthController.cs`; `ProfileController.cs`; `ConnectController.cs`; `ConversationsController.cs`; `MessagingApiTests.cs`; `AuthControllerTests.cs` |
| Notes / Open Questions | Telemetry and auth register/login/forgot/reset are intentionally anonymous. |

##### TC-SEC-003: Stored user-generated text is escaped and does not execute scripts

| Field | Details |
| --- | --- |
| Criticality | Critical |
| User Role | Authenticated partner |
| Preconditions | Profile edit and messaging available. |
| Test Data | `<script>alert('xss')</script>` in profile name/message/group name. |
| Steps | Save or send malicious text; reload page; observe DOM and browser dialogs. |
| Expected Result | Script does not execute; text is rendered as text/escaped by React; no unsafe HTML injection. |
| Negative / Edge Conditions | Toast/error rendering must also escape API messages. |
| Automation Priority | P1 |
| Suggested Test Type | UI E2E, Security Regression |
| Dependencies | Browser dialog interception. |
| Source Evidence | `ProfilePage.tsx`; `ChatThread.tsx`; `MessagingDialogs.tsx`; `docs/testing/MANUAL_TEST_CASES.md` |
| Notes / Open Questions | React escaping protects current rendering; still keep as high-risk regression. |

#### High Test Cases

##### TC-SEC-004: Accessibility baseline for auth and app shell keyboard use

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Keyboard/screen-reader user |
| Preconditions | Login page and authenticated app shell. |
| Test Data | Login form, sidebar, profile tabs, message composer, modal dialogs. |
| Steps | Navigate with Tab/Shift+Tab/Enter/Escape where applicable; inspect labels and dialog roles. |
| Expected Result | Inputs have labels; buttons have accessible names; modals have role dialog; focus is visible; main workflows are keyboard operable. |
| Negative / Edge Conditions | Hover-only message actions may be difficult for keyboard users and should be reviewed. |
| Automation Priority | Manual Only |
| Suggested Test Type | Accessibility, Manual, Regression |
| Dependencies | Screen reader/manual keyboard pass; optional axe. |
| Source Evidence | `Input.tsx`; `Button.tsx`; `MessagingDialogs.tsx`; `ChatThread.tsx`; `docs/testing/MANUAL_TEST_CASES.md` |
| Notes / Open Questions | Add formal WCAG target and automated axe checks. |

##### TC-SEC-005: Cross-browser and mobile smoke suite covers critical paths

| Field | Details |
| --- | --- |
| Criticality | High |
| User Role | Desktop/mobile users |
| Preconditions | Playwright browser matrix configured. |
| Test Data | Seeded couple and connection/messaging fixtures. |
| Steps | Run smoke tests across Chromium, Firefox, WebKit, mobile Chrome, and mobile Safari. |
| Expected Result | Login, dashboard, profile, connect, and messages critical paths pass across supported browsers/viewports. |
| Negative / Edge Conditions | Mobile sidebar and messages layout are checked for overlap. |
| Automation Priority | P1 |
| Suggested Test Type | Cross-platform, Smoke |
| Dependencies | Playwright browser installs. |
| Source Evidence | `playwright.config.ts`; `docs/development/TESTING_GUIDE.md`; `smoke.spec.ts`; `messages.spec.ts` |
| Notes / Open Questions | Real backend smoke should run at least in Chromium post-deploy. |

#### Medium Test Cases

##### TC-SEC-006: Poor network and API error states do not expose stale or partial sensitive data

| Field | Details |
| --- | --- |
| Criticality | Medium |
| User Role | Authenticated partner |
| Preconditions | Network interception available. |
| Test Data | 500, timeout, offline mode for profile/connect/messages. |
| Steps | Load pages under failed/delayed API responses. |
| Expected Result | Loading/error states render without crash; stale data from previous user is not shown after logout/account switch. |
| Negative / Edge Conditions | Offline sends are not queued; user sees failure. |
| Automation Priority | P2 |
| Suggested Test Type | Resilience, UI E2E |
| Dependencies | Network interception/offline simulation. |
| Source Evidence | `use-messaging.ts`; `ProfilePage.tsx`; `ConnectPage.tsx`; `axios-instance.ts`; `real/account-switch.real.spec.ts` |
| Notes / Open Questions | Product has no explicit offline mode; treat as graceful failure only. |

##### TC-SEC-007: Destructive and privacy-sensitive actions are auditable where implemented

| Field | Details |
| --- | --- |
| Criticality | Medium |
| User Role | Authenticated partner |
| Preconditions | Audit logger configured. |
| Test Data | Login failure/success, message deletion. |
| Steps | Perform auditable actions; inspect audit repository/logs. |
| Expected Result | Login success/failure and message deletion are recorded with couple/partner/resource metadata where available and without secrets. |
| Negative / Edge Conditions | Failed actions should include safe error code where implemented. |
| Automation Priority | P2 |
| Suggested Test Type | API E2E, Security |
| Dependencies | Audit log storage visibility. |
| Source Evidence | `LoginCommandHandler.cs`; `DeleteMessageCommandHandler.cs`; `AuditLog.cs`; `AuditLoggerService.cs` |
| Notes / Open Questions | No audit-log UI exists; validate through repository/API test only. |

#### Low Test Cases

##### TC-SEC-008: Performance sanity for login, dashboard, and messaging under normal conditions

| Field | Details |
| --- | --- |
| Criticality | Low |
| User Role | End user |
| Preconditions | Stable test environment. |
| Test Data | Seeded couple with moderate messages/connections. |
| Steps | Measure login API, dashboard interactive time, conversation list load, and message send response. |
| Expected Result | Meets provisional targets from manual tests: login under 1s, dashboard interactive under 2s on normal network, media upload progress/error under defined limits. |
| Negative / Edge Conditions | Large history pagination should not block initial thread render. |
| Automation Priority | Manual Only |
| Suggested Test Type | Performance Smoke, Manual/Staging |
| Dependencies | Representative environment and metrics. |
| Source Evidence | `docs/testing/MANUAL_TEST_CASES.md`; `TELEMETRY.md`; `GetMessagesQueryHandler.cs` |
| Notes / Open Questions | Performance targets are documented manually but not formal SLOs. |

## 6. P0 Automation Candidates

- TC-REG-001: Register a new couple with two partners and shared password
- TC-REG-002: Enforce uniqueness for Together ID, usernames, and partner emails
- TC-AUTH-001: Husband and wife can each log in with own username and shared password
- TC-AUTH-002: Private routes require authentication and guest routes redirect authenticated users
- TC-AUTH-003: Refresh cookie and token storage comply with security rules
- TC-AUTH-004: Logout revokes client state, clears query cache, and redirects to login
- TC-PWD-001: Forgot password request returns safe success for existing and nonexistent identifiers
- TC-PWD-002: Reset shared password with valid code and verify both partners use new password
- TC-DASH-001: Authenticated user lands on dashboard with correct couple context
- TC-PROF-001: View own profile and partner profile within same couple
- TC-PROF-002: Only own profile is editable; partner profile and partner-view mode are read-only
- TC-CONN-001: Search for another couple by Together ID and send connection request
- TC-CONN-002: Recipient accepts incoming connection request
- TC-MSG-001: Partner conversation is auto-provisioned, pinned first, and accessible only to the couple
- TC-MSG-002: Send, list, persist, and paginate text messages
- TC-MSG-003: Conversation access isolation returns 404 for non-participants
- TC-MSG-004: Sender-only edit and delete rules protect message integrity
- TC-MSG-005: Create group conversation only with accepted connected couples
- TC-SEC-002: Unauthorized API access is rejected consistently

## 7. Manual-Only / Hard-to-Automate Tests

- TC-SEC-004 requires screen reader behavior, focus quality, and hover-only action review. Automated checks can assist, but manual accessibility validation is still needed.
- TC-SEC-008 depends on representative staging infrastructure and performance baselines that are not fully defined in code.
- Production telemetry correlation in Grafana Tempo/Loki/Mimir should be manually validated in staging because local tests cannot prove data arrives in Grafana Cloud.
- Email delivery to both partners during password reset may need manual or integration-environment validation unless the test email service exposes sent messages and reset codes.
- Visual polish checks for responsive registration/messages/sidebar layouts should include manual exploratory passes in addition to Playwright assertions.

## 8. Gaps and Open Questions

- Registration password minimum differs between docs/manual expectations and code: docs mention 12 characters in places, while frontend/backend validators enforce 8.
- Together ID minimum is inconsistent: manual tests mention exactly 4 as accepted, frontend Zod says min 3, backend regex effectively requires at least 4.
- ProtectedRoute does not preserve original destination for post-login redirect, although manual tests describe this behavior.
- Partner-view expectations are unclear. Store is frontend-only and non-persistent, but dashboard copy may not fully reflect partner-view mode.
- Password reset token expiry is documented as 15 minutes in manual tests; verify handler/config before asserting exact expiry.
- It is unclear whether password reset should revoke existing refresh tokens/sessions.
- Profile update validation may not enforce all registration DOB/age rules on frontend; confirm desired consistency.
- Connect rejected-state behavior is unclear: UI treats rejected search status as connectable.
- Messaging delete has no confirmation despite being destructive, though it tombstones rather than hard-deletes.
- Offline behavior is not implemented as a product feature; tests should assert graceful failure only unless offline support is added.
- Feature flags/rollout states were not found in code; no tests are defined for flags.
- Finance, Memories, Goals, and Calendar are coming-soon placeholders; do not automate future feature bullets as implemented behavior yet.

## 9. Recommendations

### Smoke suite

Automate login as seeded partner, dashboard render, protected route redirect, profile own/partner view, connect search/send request, messages list/open/send text, and logout. Run on every PR in Chromium and post-deploy against real backend.

### Regression suite

Add API E2E coverage for registration uniqueness, password reset, token refresh/reuse, connect authorization, messaging isolation, sender-only edit/delete, media validation, and hide-per-couple. Keep mocked UI E2E for fast state coverage and add a smaller real-backend UI suite for critical journeys.

### Release-blocking suite

Block release on P0 auth/session/security, registration, password reset enumeration protection, profile visibility, connect request lifecycle, and messaging isolation/send/edit/delete/group creation tests.

### Automation order

Start with API E2E for critical business/security rules because they are less flaky and already align with existing backend test patterns. Then add real-browser smoke for registration/login/dashboard/profile/connect/messages. Finally broaden mocked UI E2E for empty/error/mobile/accessibility states.

### Missing instrumentation or test hooks

Add deterministic test hooks for password reset code retrieval, telemetry flush, token expiry/refresh simulation, and seeded multi-couple data. Consider a test logger sink for telemetry/audit assertions.

### Missing documentation

Clarify password/Together ID limits, post-login redirect behavior, password reset session revocation, rejected connection re-request behavior, partner-view product intent, accessibility acceptance criteria, and whether destructive messaging actions need confirmation.
