# DATABASE — Data Model & Persistence

## Technology
- **ORM:** Entity Framework Core 9. Context: `Saha.Infrastructure/Persistence/ApplicationDbContext.cs`.
- **Local:** SQLite (`Data Source=…`); schema created at startup via `EnsureCreatedAsync` (dev/IntegrationTest).
- **Prod:** Azure SQL / SQL Server; schema via **EF migrations** (`Database.MigrateAsync`). Provider chosen at runtime from the connection string (`Infrastructure/DependencyInjection.cs`).
- **Mapping:** Fluent config classes in `Persistence/Configurations/` (applied via `ApplyConfigurationsFromAssembly`).
- **Migrations:** `Persistence/Migrations/` — baseline `20260705115851_InitialCreate`.
- **Interceptors:** `AuditableEntityInterceptor` (timestamps), `DomainEventDispatchInterceptor` (dispatch domain events on save).

## Tables (DbSets)
| Table | Aggregate root? | Purpose / Ownership |
|---|---|---|
| `Couples` | Yes | The shared account: `TogetherID` (unique), `PasswordHash`, `IsActive`. Owns partners & tokens. |
| `Partners` | (child of Couple) | Two per couple; `Username` (unique), `Name`, `DateOfBirth`, `Email`, `PhoneNumber`, `ProfilePictureUrl?`, `Role` (Husband/Wife), `CoupleId` FK. |
| `RefreshTokens` | (child of Couple) | Hashed refresh tokens: `TokenHash`, `ExpiresAt`, revocation state, `CoupleId` FK. |
| `PasswordResetTokens` | (child of Couple) | Hashed reset codes: `CodeHash`, `ExpiresAt`, used/invalidated state, `CoupleId` FK. |
| `CoupleConnections` | Yes | Couple-to-couple links: `CoupleAId`, `CoupleBId`, `Status`, `InitiatedByCoupleId`, `AcceptedAt?`, `RejectedAt?`. |
| `AuditLogs` | Yes | Audit trail: `Action`, `CoupleId`, `CreatedAt` (+ payload — see entity). |

## Relationships & cardinality
```
Couple 1 ──< Partner            (exactly 2 partners per couple: Husband, Wife)
Couple 1 ──< RefreshToken       (many; FK CoupleId)
Couple 1 ──< PasswordResetToken (many; FK CoupleId)
CoupleConnection  ── CoupleAId / CoupleBId  → Couple  (link between two couples)
AuditLog          ── CoupleId (nullable owner; indexed)
```
`CoupleConnection` references two couples by id (`CoupleAId`, `CoupleBId`) rather than navigation FKs — treat it as a link/join aggregate.

## Indexes & constraints (from `InitialCreate`)
| Table | Index | Unique |
|---|---|---|
| Couples | `IX_Couples_TogetherID` | ✅ |
| Partners | `IX_Partners_Username` | ✅ |
| Partners | `IX_Partners_Email`, `IX_Partners_CoupleId` | — |
| RefreshTokens | `IX_RefreshTokens_TokenHash`, `IX_RefreshTokens_CoupleId_Active` | — |
| PasswordResetTokens | `IX_PasswordResetTokens_CoupleId_Active` | — |
| CoupleConnections | `IX_CoupleConnections_CoupleAId_CoupleBId`, `IX_CoupleConnections_Status` | — |
| AuditLogs | `IX_AuditLogs_Action_CreatedAt`, `IX_AuditLogs_CoupleId`, `IX_AuditLogs_CreatedAt` | — |

Uniqueness of `TogetherID` and `Username` enforces the registration rules in FEATURES.md.

## Notable patterns
- **Tokens stored hashed** (`TokenHash` / `CodeHash`), never plaintext.
- **Auditable timestamps** (`CreatedAt`/`UpdatedAt`) stamped by interceptor, not handlers.
- **`_Active` composite indexes** support "find active (non-revoked/non-expired) token for couple" queries.
- **Soft state, not soft delete:** `Couple.IsActive`, connection `Status`, token revoked/used flags model lifecycle instead of row deletion.
- **No denormalized read models / caching tables** found.

## Business ownership
- `Couple` is the top aggregate; Partners/RefreshTokens/PasswordResetTokens are modified **only through** `Couple` methods (private collections + factory methods). Repositories load the `Couple` aggregate.
- `CoupleConnection` and `AuditLog` are independent aggregates with their own repositories (`IConnectionRepository`, `IAuditLogRepository`).

> Column-level types/lengths: see `Persistence/Configurations/*Configuration.cs` and the migration file for exact definitions.
