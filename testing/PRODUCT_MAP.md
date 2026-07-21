# Saha — Product Map

Saha is "a shared digital home for two people": **one couple = one account with two partner
identities**. Frontend: React 19 + Vite + React Router v7, TanStack Query, Zustand. Backend:
ASP.NET Core 9 (Clean Architecture, MediatR/CQRS) + EF Core, SQLite locally.

## Routes

| Path | Access guard | Screen | Status |
|------|-------------|--------|--------|
| `/` | — | redirect → `/dashboard` | live |
| `/login` | Guest | Login | live |
| `/register` | Guest (behind `VITE_REGISTRATION_ENABLED`) | 3-step registration wizard | live |
| `/forgot-password` | Guest | Forgot password | live |
| `/reset-password` | Guest | Reset password | live |
| `/invite/accept` | Guest | Accept invitation | **placeholder** (no design yet) |
| `/waiting` | Protected | Awaiting-partner threshold (polls session) | live |
| `/invite` | Protected | Invite your partner | **placeholder** |
| `/dashboard` | Protected + CompleteCouple | Dashboard | live |
| `/messages`, `/messages/:id` | Protected + CompleteCouple | Messaging (list + thread) | live |
| `/connect` | Protected + CompleteCouple | Connect (search/pending/connected) | live |
| `/profile` | Protected + CompleteCouple | Profile (me/partner) | live |
| `/settings` | Protected + CompleteCouple | Settings (theme) | live |
| `/finance`, `/memories`, `/goals`, `/calendar` | Protected + CompleteCouple | "Coming Soon" placeholders | stub |
| `*` | — | 404 Not Found | live |

**Guards:** `GuestRoute` (bounces authenticated users; awaiting-partner → `/waiting` or `/invite`),
`ProtectedRoute` (unauthenticated → `/login`), `CompleteCoupleRoute` (awaiting-partner → `/waiting`).
The backend independently enforces couple-scoping on every handler.

## Backend API surface (`/api/v1`)

- **Auth:** `POST register`, `POST invitations`, `POST invitations/accept`, `GET availability`,
  `GET session`, `POST login`, `POST refresh`, `POST forgot-password`, `POST reset-password`, `POST logout`.
- **Connect:** `GET connect/connections?status=`, `GET connect/search?togetherId=`,
  `POST connect/request`, `PUT connect/request/{id}/accept`, `PUT connect/request/{id}/reject`.
- **Messaging:** `GET/POST conversations`, `GET conversations/{id}`, `POST conversations/group`,
  `PUT .../name|pin|unpin`, `POST .../couples`, `DELETE .../{id}`, message CRUD + `.../reaction`.
- **Profile:** `GET profile/me`, `GET profile/partner`, `PUT profile`, `POST profile/picture`.
- **Telemetry:** `POST telemetry`.

## Major end-to-end journeys

1. **Register a home** → wizard (your half → shared password → TogetherID) → `/invite` → partner
   accepts → couple Complete → dashboard.
2. **Sign in / out** → either partner username + shared password → dashboard; sign out clears state.
3. **Recover access** → forgot password (enumeration-safe) → reset with 6-digit code.
4. **Meet other couples** → search by TogetherID → request → other couple accepts/declines → Connected.
5. **Talk** → partner chat (send/edit/delete/react) and group chats with connected couples.
6. **Manage identity** → view/edit own profile; view partner profile read-only; "view as partner".
7. **Personalise** → theme (light/dark/system), persisted.

## Key states to exercise

Loading (spinners/skeletons), empty (no connections/conversations), validation (forms), error
(toasts), permission-denied (route guards, couple-scoping), awaiting-partner (threshold), and
responsive (master/detail collapse on mobile in messaging).
