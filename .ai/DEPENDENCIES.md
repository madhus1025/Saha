# DEPENDENCIES — Why & Risk

Legend — **Replace difficulty:** Low / Medium / High. **Risk if removed/unmaintained:** blast radius.

## Backend — Framework & CQRS
| Dependency | Why | Used in | Replace | Risk |
|---|---|---|---|---|
| ASP.NET Core 9 | Web API host, DI, auth, rate limiting | `Saha.API` | High | Foundational. |
| MediatR 12 | CQRS dispatch + pipeline behaviors | `Application/Features`, `Common/Behaviors` | High | Every use case flows through `Sender.Send`; swapping means rewiring all handlers. |
| FluentValidation | Request validation via `ValidationBehavior` | `Features/**/*Validator.cs` | Medium | Validation gap if removed; rules would move to handlers/domain. |
| Asp.Versioning | URL/header API versioning (`v1`) | `ServiceCollectionExtensions` | Low | Only affects route shape. |

## Backend — Data
| Dependency | Why | Used in | Replace | Risk |
|---|---|---|---|---|
| EF Core 9 | ORM, migrations, interceptors | `Infrastructure/Persistence` | High | Owns schema + persistence; deep coupling. |
| EF Core SQLite provider | Zero-config local dev DB | runtime (local) | Low | Dev-only; falls back path. |
| EF Core SqlServer provider | Prod DB (Azure SQL) | runtime (prod) | Medium | Prod persistence + retry policy. |

## Backend — Auth & Security
| Dependency | Why | Used in | Replace | Risk |
|---|---|---|---|---|
| Microsoft JwtBearer / IdentityModel | Issue & validate access tokens | `ServiceCollectionExtensions`, `JwtTokenService` | High | Core of auth; token format & validation. |
| BCrypt (password hashing) | Hash couple password + reset codes | `BcryptPasswordHasher` | Medium | Changing algorithm invalidates stored hashes. |

## Backend — Infrastructure services
| Dependency | Why | Used in | Replace | Risk |
|---|---|---|---|---|
| Azure.Storage.Blobs | Prod profile-picture storage | `AzureBlobStorageService` | Medium | Behind `IBlobStorageService`; Null impl for local. |
| System.Net.Mail (SMTP) | Prod email | `SmtpEmailService` | Low | Behind `IEmailService`; Null impl for local. |

## Backend — Observability
| Dependency | Why | Used in | Replace | Risk |
|---|---|---|---|---|
| Serilog (+ App Insights, Grafana Loki sinks) | Structured logging | `Program.cs` | Medium | Log pipeline; sinks are optional/config-gated. |
| OpenTelemetry (ASP.NET/HttpClient instrumentation, OTLP exporter) | Traces→Tempo, metrics→Mimir | `ServiceCollectionExtensions`, `AuthMetrics` | Medium | Config-gated; no-op without `Grafana:OtlpEndpoint`. |

## Frontend — Core
| Dependency | Why | Used in | Replace | Risk |
|---|---|---|---|---|
| React 19 + React DOM | UI runtime | all | High | Foundational. |
| Vite 6 | Dev server + build | build | Medium | Toolchain. |
| React Router v7 | Routing + guards | `app/router` | Medium | Route structure. |
| TanStack Query v5 | Server-state cache/fetch | `modules/**`, `core/api` | High | Server-state layer across features. |
| Zustand 5 | Client global state | `shared/stores` | Low | Small surface (auth/theme/partner-view). |
| axios | HTTP client + refresh interceptor | `core/api/axios-instance.ts` | Medium | Token-refresh logic tied to interceptors. |
| react-hook-form + zod | Forms + schema validation | `modules/**/schemas`, `auth` | Medium | Form UX + client validation. |
| Tailwind v3 + Radix (shadcn/ui) | Styling + accessible primitives | `shared/components/ui` | Medium | Design system. |
| @opentelemetry/* (web) | Browser tracing → backend | `core/telemetry` | Low | Observability only. |
| framer-motion, lucide-react, date-fns | Animation, icons, dates | components | Low | Cosmetic/utility. |

## Frontend — Tooling (dev)
Vitest + Testing Library + jsdom (unit), Playwright (e2e), MSW (API mocking), ESLint + Prettier + TypeScript. **Replace: Low–Medium**, **Risk: dev-only** (no runtime impact).

## Notes
- Many infra dependencies are **config-gated behind interfaces** (`IEmailService`, `IBlobStorageService`, DB provider, OTel, Loki). Removing/misconfiguring them degrades to Null/no-op rather than crashing — convenient locally, a **silent-failure risk** in prod (see ARCHITECTURE.md).
