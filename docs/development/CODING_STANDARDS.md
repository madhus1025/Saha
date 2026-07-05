# Saha — Coding Standards

## Backend (C#)

### Naming

| Element | Convention | Example |
|---|---|---|
| Namespace | PascalCase | `Saha.Domain.Entities` |
| Class | PascalCase | `CoupleRepository` |
| Interface | `I` prefix + PascalCase | `ICoupleRepository` |
| Method | PascalCase | `GetByTogetherIDAsync` |
| Property | PascalCase | `TogetherID` |
| Private field | `_camelCase` | `_coupleRepository` |
| Local variable | camelCase | `existingCouple` |
| Constant | PascalCase | `MaxUsernameLength` |
| Generic parameter | `T` or descriptive | `TRequest`, `TResponse` |

### Layer Rules

**Domain layer**: Zero knowledge of infrastructure, frameworks, or application concerns. No EF Core attributes, no JSON attributes, no ASP.NET. Only plain C# + MediatR.Contracts (for IDomainEvent).

**Application layer**: Knows the Domain. Knows interface contracts. Does not know how interfaces are implemented. No `new SqlConnection()`, no `HttpClient`, no `BCrypt`.

**Infrastructure layer**: Implements Domain interfaces. References EF Core, BCrypt, MailKit, Azure SDK. Never referenced by Application or Domain.

**API layer**: Receives HTTP requests, dispatches MediatR commands/queries, returns HTTP responses. Contains no business logic. Maps between HTTP and application contracts.

### Command/Query Structure

Every feature folder contains:
```
Features/Auth/Commands/Register/
    RegisterCoupleCommand.cs         # IRequest<RegisterResult>
    RegisterCoupleCommandHandler.cs  # IRequestHandler<RegisterCoupleCommand, RegisterResult>
    RegisterCoupleCommandValidator.cs # AbstractValidator<RegisterCoupleCommand>
    RegisterResult.cs                # Result DTO (record)
```

### Exception Handling

Throw domain-specific exceptions from Application layer handlers:
- `NotFoundException` → 404
- `ConflictException` → 409
- `UnauthorizedException` → 401
- `ForbiddenException` → 403
- `ApplicationValidationException` → 422

The `ExceptionHandlingMiddleware` maps all exceptions to appropriate HTTP responses. Never return error codes from handlers — throw.

### async/await

All I/O-bound operations are async. Always pass `CancellationToken` through the call stack. Never use `.Result` or `.Wait()`.

### Records vs Classes

Use `record` for:
- Commands and queries (`RegisterCoupleCommand`)
- Result DTOs (`LoginResult`)
- Domain events (`CoupleRegisteredEvent`)
- Value objects

Use `class` for:
- Entities (`Couple`, `Partner`)
- Repositories
- Services
- Handlers

---

## Frontend (TypeScript/React)

### Naming

| Element | Convention | Example |
|---|---|---|
| Component | PascalCase | `ProfilePage`, `PartnerViewBanner` |
| Hook | `use` prefix + camelCase | `useLogin`, `useProfile` |
| Store | camelCase with `Store` suffix | `authStore`, `partnerViewStore` |
| API function | camelCase | `login`, `getProfile` |
| Zod schema | camelCase with `Schema` suffix | `loginSchema`, `registerSchema` |
| Type/Interface | PascalCase | `LoginRequest`, `ProfileDto` |
| File | kebab-case or PascalCase for components | `auth.api.ts`, `LoginPage.tsx` |

### Component Rules

- One component per file.
- Props are typed with explicit `interface` (not inferred).
- No `any`. If necessary, use `unknown` and narrow.
- Default exports for page components, named exports for reusable components.
- `useCallback`/`useMemo` only when measuring reveals a problem — not preemptively.

### State Management

| State Type | Tool | Persistence |
|---|---|---|
| Server state (API data) | TanStack Query | Cache only, not localStorage |
| Auth session | Zustand `auth.store` | localStorage (WITHOUT access token) |
| Partner view mode | Zustand `partner-view.store` | Session only (not persisted) |
| Form state | React Hook Form | Component lifetime |
| UI/toggle state | `useState` | Component lifetime |

Access token lives in memory only (Zustand state, not persisted). It is re-acquired on app boot via the HttpOnly refresh cookie.

### API Layer

All API calls go through `axios-instance.ts`. Never use `fetch` directly. Never hardcode base URLs — use the `VITE_API_URL` environment variable.

### Form Validation

Backend validation rules are mirrored in Zod schemas. The Zod schema is the single source of truth for the frontend form. FluentValidation on the backend is the authoritative source — Zod provides immediate feedback.

### Imports

Use the `@/` path alias for all non-relative imports:
```typescript
import { useAuthStore } from '@/shared/stores/auth.store'  // ✓
import { useAuthStore } from '../../../shared/stores/auth.store'  // ✗
```

### Comments

Write no comments unless the code cannot express the why. When a comment is needed:
```typescript
// BCrypt with work factor 12 takes ~400ms intentionally — brute-force deterrent
```
Never:
```typescript
// This function logs the user in
function login() { ... }
```

---

## Git Conventions

### Branch Naming

```
feature/TICKET-123-add-memories-module
fix/TICKET-456-refresh-token-cookie-samesite
refactor/TICKET-789-extract-partner-factory
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add couple connection search by Together ID
fix: prevent refresh token reuse after rotation
refactor: extract password reset token generation to domain method
test: add API integration tests for auth controller
docs: add developer setup guide
chore: upgrade EF Core to 9.0.1
```

### PR Rules

- Title must follow Conventional Commits format (enforced by `pr-check.yml`)
- All CI checks must pass before merge
- At least one approval required
- No force pushes to `main` or `develop`
- Squash merge to keep main history clean
