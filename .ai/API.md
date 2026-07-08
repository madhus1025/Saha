# API — HTTP Reference

- **Base path:** `/api/v{version}` (default `v1`; version via URL segment or `X-Api-Version` header).
- **Auth:** JWT Bearer (`Authorization: Bearer <accessToken>`). Base controller is `[Authorize]`; `[AllowAnonymous]` noted below.
- **Refresh token:** HttpOnly cookie `X-Refresh-Token`, path `/api/v1/auth`, `Secure`, `SameSite=Strict`.
- **CORS:** credentials allowed for configured origins (`Cors:AllowedOrigins`).
- **Rate limits (fixed window):** `auth` 5/min, `api` 100/min (default), `telemetry` 60/min. Exceeded → `429`.
- **Error format** (all handled errors, camelCase JSON):
  ```json
  { "code": "STRING_CODE", "message": "…", "errors": { "field": ["…"] } | null }
  ```
  Status mapping (`ExceptionHandlingMiddleware`): ValidationError→400, DomainException→400, Unauthorized→401, Forbidden→403, NotFound→404, Conflict→409 (code = `ConflictCode`), unhandled→500 `INTERNAL_ERROR`.

## Auth — `AuthController` (`/api/v1/auth`)
| Method | Route | Purpose | Auth | Input | Output | Handler |
|---|---|---|---|---|---|---|
| POST | `/register` | Register a couple (2 partners) | Anonymous, `auth` RL | `RegisterCoupleCommand` (body) | 201 `RegisterCoupleResult` | `Features/Auth/Commands/Register` |
| POST | `/login` | Log in by username | Anonymous, `auth` RL | `LoginRequest{username,password}` | 200 `LoginResponseDto` + sets refresh cookie | `Features/Auth/Commands/Login` |
| POST | `/refresh` | Rotate access token | Anonymous | refresh cookie | 200 `RefreshResponseDto{accessToken,expiresAt}` + new cookie | `Features/Auth/Commands/RefreshToken` |
| POST | `/forgot-password` | Start password reset | Anonymous, `auth` RL | `{togetherIDOrUsername}` | 204 | `Features/Auth/Commands/ForgotPassword` |
| POST | `/reset-password` | Complete reset with code | Anonymous, `auth` RL | `ResetPasswordCommand` | 204 | `Features/Auth/Commands/ResetPassword` |
| POST | `/logout` | Revoke refresh token | **Bearer** | refresh cookie | 204 + deletes cookie | `Features/Auth/Commands/Logout` |

`LoginResponseDto`: `accessToken, expiresAt, coupleId, partnerId, username, partnerName, togetherID, role, profilePictureUrl`.

## Connect — `ConnectController` (`/api/v1/connect`)
| Method | Route | Purpose | Auth | Input | Output | Handler |
|---|---|---|---|---|---|---|
| GET | `/connections` | List this couple's connections | Bearer | — | 200 connections | `Queries/GetConnections` |
| GET | `/search?togetherId=` | Find couple by TogetherID | Bearer | query `togetherId` | 200 `IReadOnlyList<CoupleSearchResultDto>` | `Queries/SearchCouple` |
| POST | `/request` | Send connection request | Bearer | `{targetTogetherID}` | 201 `SendConnectionRequestResult` / 409 | `Commands/SendConnectionRequest` |
| PUT | `/request/{connectionId:guid}/accept` | Accept pending request | Bearer | route id | 204 / 403 / 404 | `Commands/AcceptConnectionRequest` |
| PUT | `/request/{connectionId:guid}/reject` | Reject pending request | Bearer | route id | 204 / 403 / 404 | `Commands/RejectConnectionRequest` |

## Profile — `ProfileController` (`/api/v1/profile`)
| Method | Route | Purpose | Auth | Input | Output | Handler |
|---|---|---|---|---|---|---|
| GET | `/me` | Current partner's profile | Bearer | — | 200 profile | `Queries/GetProfile` |
| GET | `/partner` | Other partner's profile | Bearer | — | 200 profile | `Queries/GetProfile` |
| PUT | `/me` | Update own profile | Bearer | `UpdateProfileRequest{name,dateOfBirth,email,phoneNumber}` | 204 / 400 / 403 | `Commands/UpdateProfile` |
| POST | `/me/picture` | Upload profile picture (≤5 MB) | Bearer | `IFormFile file` (multipart) | 200 `UploadProfilePictureResult` | `Commands/UploadProfilePicture` |

## Telemetry — `TelemetryController` (`/api/v1/telemetry`)
| Method | Route | Purpose | Auth | Input | Output |
|---|---|---|---|---|---|
| POST | `/events` | Ingest batched frontend telemetry | Anonymous, `telemetry` RL | event batch (body) | 2xx |

## Utility
| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/health` | Health probe `{status,timestamp}` | Anonymous |
| GET | `/swagger` | OpenAPI UI (Development only) | — |

**Conventions:** `CoupleId`/`PartnerId` are taken from the JWT via `ICurrentUserContext` — never from the request body. Commands/queries are dispatched through MediatR (`Sender.Send`). Business logic lives in the handler noted per row, **not** the controller.
