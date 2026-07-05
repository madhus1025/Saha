# Saha — Architecture Overview

## System Architecture

Saha follows a **Clean Architecture** pattern with clear separation of concerns across four layers. Dependencies flow inward — outer layers depend on inner layers, never the reverse.

```
┌─────────────────────────────────────────────────────────────┐
│                        Presentation                          │
│   React 19 SPA (Azure Static Web App)                       │
│   TanStack Query · React Router v7 · Zustand · Framer Motion│
└───────────────────────────┬────────────────────────────────┘
                            │ HTTPS / REST
┌───────────────────────────▼────────────────────────────────┐
│                        API Layer                             │
│   ASP.NET Core 9 (Azure App Service)                        │
│   Controllers · Middleware · JWT · Rate Limiting            │
└───────────────────────────┬────────────────────────────────┘
                            │ MediatR
┌───────────────────────────▼────────────────────────────────┐
│                    Application Layer                         │
│   CQRS Commands/Queries · Pipeline Behaviors                │
│   FluentValidation · DTOs · Application Services            │
└───────────────────────────┬────────────────────────────────┘
                            │ Interfaces
┌───────────────────────────▼────────────────────────────────┐
│                      Domain Layer                            │
│   Aggregate Roots · Entities · Value Objects                │
│   Domain Events · Domain Interfaces                         │
└─────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────┐
│                  Infrastructure Layer                        │
│   EF Core + SQLite/SQL Server · BCrypt · JWT                │
│   System.Net.Mail · Azure Blob Storage · Repositories       │
└─────────────────────────────────────────────────────────────┘
```

## Core Domain Model

The central design decision: **one Couple account, two Partner identities, one shared password**.

```
Couple (Aggregate Root)
├── TogetherID (Value Object)     — unique couple identifier (e.g. MADHU-PRIYA)
├── PasswordHash                  — shared BCrypt hash (work factor 12)
├── Partners[]                    — collection of exactly 2 Partner entities
│   ├── Husband (computed)        — Partners.Single(p => p.Role == Husband)
│   │   ├── Username, Name, DOB, Email, Phone
│   │   └── ProfilePictureUrl
│   └── Wife (computed)           — Partners.Single(p => p.Role == Wife)
│       └── [same fields as Husband]
├── RefreshTokens[]               — SHA-256 hashed tokens with rotation
└── PasswordResetTokens[]         — 6-digit codes, hashed, dual-delivery
```

## Authentication Flow

```
Login Request (username + shared password)
    │
    ▼
Find Couple by username (checks both Husband.Username and Wife.Username)
    │
    ▼
Verify BCrypt hash against Couple.PasswordHash
    │
    ▼
Identify which Partner matched the username
    │
    ▼
Generate Access Token (JWT, 15 min TTL)
    │   Claims: coupleId, partnerId, username, togetherId, role
    │
    ├─▶ Return in JSON body (held in memory only, never persisted)
    │
Generate Refresh Token (256-bit CSPRNG, 30 day TTL)
    │   SHA-256 hashed before DB storage
    │
    └─▶ Set as HttpOnly Secure SameSite=Strict cookie
```

## Technology Stack

| Concern | Technology |
|---|---|
| Frontend Framework | React 19 |
| Frontend Build | Vite 6 |
| Routing | React Router v7 |
| Server State | TanStack Query v5 |
| Client State | Zustand 5 |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Animation | Framer Motion |
| Backend Framework | ASP.NET Core 9 |
| Messaging | MediatR 12 |
| Validation | FluentValidation 11 |
| ORM | Entity Framework Core 9 |
| Database (local) | SQLite (auto-created, zero config) |
| Database (prod) | Azure SQL Serverless |
| Auth | JWT Bearer + HttpOnly Refresh Cookies |
| Password Hashing | BCrypt.Net-Next (work factor 12) |
| Email (local) | Console logging (NullEmailService) |
| Email (prod) | SMTP via System.Net.Mail |
| File Storage (local) | Placeholder URLs (NullBlobStorageService) |
| File Storage (prod) | Azure Blob Storage |
| Secrets | Azure Key Vault |
| Hosting | Azure App Service + Static Web Apps |
| IaC | Azure Bicep |
| CI/CD | GitHub Actions |

## Security Architecture

### Authentication
- Access tokens: 60-minute TTL (dev) / configurable (prod), JWT HS256, held in memory only
- Refresh tokens: 7-day TTL (dev) / configurable (prod), 256-bit CSPRNG, SHA-256 hashed in DB, HttpOnly cookie
- Token rotation: every refresh issues a new token and revokes the old one
- Reuse detection: revoked-token use triggers full family revocation

### Transport
- HTTPS enforced at App Service level (minTlsVersion 1.2)
- HSTS via Strict-Transport-Security header
- SameSite=Strict cookies prevent CSRF on token endpoint

### API Security
- Rate limiting: 5 req/min (auth endpoints), 100 req/min (general API)
- Security headers: CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff
- Input validation: FluentValidation (server) + Zod (client)
- SQL injection prevention: EF Core parameterized queries only

### Secrets Management
- Azure Key Vault for all production secrets
- GitHub Secrets for CI/CD pipeline secrets
- No secrets in source code or appsettings.json (only in appsettings.Development.example.json)

## Data Flow: Silent Token Refresh

```
API Request (401 Unauthorized)
    │
    ▼
Axios Response Interceptor
    │
    ├─ Is refresh already in progress?
    │   YES → Queue request, wait for refresh
    │   NO  → Begin refresh
    │
    ▼
POST /api/v1/auth/refresh-token (sends HttpOnly cookie automatically)
    │
    ├─ SUCCESS → Update in-memory access token, retry all queued requests
    │
    └─ FAILURE → Clear auth state, redirect to /login
```
