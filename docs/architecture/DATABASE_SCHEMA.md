# Saha — Database Schema

## Entity Relationship Diagram

```
┌─────────────────────────────────┐
│             Couples             │
├─────────────────────────────────┤
│ Id              uniqueidentifier│ PK
│ TogetherID      nvarchar(50)    │ UQ, NOT NULL
│ PasswordHash    nvarchar(100)   │ NOT NULL
│ IsActive        bit             │ DEFAULT true
│ CreatedAt       datetimeoffset  │ NOT NULL
│ UpdatedAt       datetimeoffset  │ NOT NULL
└────────────┬────────────────────┘
             │ 1
             │──────────────────────────────────────────┐
             │ *                                         │ *
┌────────────▼────────────────────┐   ┌─────────────────▼───────────────┐
│            Partners             │   │          RefreshTokens          │
├─────────────────────────────────┤   ├─────────────────────────────────┤
│ Id          uniqueidentifier    │PK │ Id          uniqueidentifier    │PK
│ CoupleId    uniqueidentifier    │FK │ CoupleId    uniqueidentifier    │FK
│ Username    nvarchar(30)        │UQ │ PartnerId   uniqueidentifier    │NOT NULL
│ Name        nvarchar(100)       │   │ TokenHash   nvarchar(64)        │UQ
│ DateOfBirth date                │   │ ExpiresAt   datetimeoffset      │
│ Email       nvarchar(254)       │UQ │ IsRevoked   bit                 │DEF false
│ PhoneNumber nvarchar(20)        │   │ RevokedReason nvarchar(200)     │NULL
│ ProfileUrl  nvarchar(2048)      │NULL│ ReplacedBy nvarchar(64)        │NULL
│ Role        nvarchar(10)        │   │ CreatedByIp nvarchar(45)        │
│ CreatedAt   datetimeoffset      │   │ CreatedAt   datetimeoffset      │
│ UpdatedAt   datetimeoffset      │   │ UpdatedAt   datetimeoffset      │
└─────────────────────────────────┘   └─────────────────────────────────┘
             │ *
┌────────────▼────────────────────┐
│       PasswordResetTokens       │
├─────────────────────────────────┤
│ Id        uniqueidentifier      │PK
│ CoupleId  uniqueidentifier      │FK
│ CodeHash  nvarchar(64)          │NOT NULL
│ ExpiresAt datetimeoffset        │NOT NULL
│ IsUsed    bit                   │DEFAULT false
│ CreatedAt datetimeoffset        │NOT NULL
│ UpdatedAt datetimeoffset        │NOT NULL
└─────────────────────────────────┘

┌─────────────────────────────────┐
│        CoupleConnections        │
├─────────────────────────────────┤
│ Id                uniqueidentifier│PK
│ CoupleAId         uniqueidentifier│FK → Couples.Id (Restrict)
│ CoupleBId         uniqueidentifier│FK → Couples.Id (Restrict)
│ Status            nvarchar(10)  │ Pending | Accepted | Rejected
│ InitiatedByCoupleId uniqueidentifier│NOT NULL
│ CreatedAt         datetimeoffset │NOT NULL
│ UpdatedAt         datetimeoffset │NOT NULL
└─────────────────────────────────┘
UQ(CoupleAId, CoupleBId) — prevents duplicate connections in either direction

┌─────────────────────────────────┐
│            AuditLogs            │
├─────────────────────────────────┤
│ Id           uniqueidentifier   │PK
│ Action       nvarchar(100)      │NOT NULL
│ CoupleId     uniqueidentifier   │NULL (pre-auth actions)
│ PartnerId    uniqueidentifier   │NULL
│ ResourceType nvarchar(50)       │NULL
│ ResourceId   nvarchar(100)      │NULL
│ Details      nvarchar(max)      │NULL (JSON)
│ IpAddress    nvarchar(45)       │NULL (IPv6 max length)
│ UserAgent    nvarchar(500)      │NULL
│ IsSuccess    bit                │NOT NULL
│ ErrorCode    nvarchar(50)       │NULL
│ CreatedAt    datetimeoffset     │NOT NULL (indexed)
│ UpdatedAt    datetimeoffset     │NOT NULL
└─────────────────────────────────┘
```

## Index Summary

| Table | Index | Type | Purpose |
|---|---|---|---|
| Couples | IX_Couples_TogetherID | Unique | Fast lookup by couple identifier |
| Partners | IX_Partners_Username | Unique | Login lookup by username |
| Partners | IX_Partners_Email | Unique | Forgot password lookup + uniqueness |
| Partners | IX_Partners_CoupleId | Non-unique | Navigation property |
| RefreshTokens | IX_RefreshTokens_TokenHash | Unique | Token validation on every refresh |
| RefreshTokens | IX_RefreshTokens_CoupleId | Non-unique | Cascade delete + revoke-all |
| PasswordResetTokens | IX_PasswordResetTokens_CoupleId | Non-unique | Token lookup |
| CoupleConnections | IX_CoupleConnections_CoupleAId_CoupleBId | Unique | Prevent duplicate connections |
| CoupleConnections | IX_CoupleConnections_CoupleBId | Non-unique | Reverse lookup |
| AuditLogs | IX_AuditLogs_CoupleId | Non-unique | Per-couple audit history |
| AuditLogs | IX_AuditLogs_CreatedAt | Non-unique | Time-range queries |

## Design Decisions

### Why TogetherID is on Couple, not derived from Partner names
TogetherID is a stable identifier that couples can share with other couples to connect. It must be chosen at registration and remain immutable. Deriving it from partner names would cause conflicts if names change and would require complex uniqueness logic.

### Why Partners are not separate User tables
This is the most important model decision. A couple shares one password. If Partners were separate users with separate passwords, the "shared password" requirement would require unsafe patterns like storing the same password hash in two rows. The Couple aggregate owns the password; Partners are identity containers within that aggregate.

### Why RefreshTokens are hashed in the database
If the database were breached, raw refresh tokens would allow session hijacking without requiring the actual password. SHA-256 hashing ensures the raw token (held only in the client's HttpOnly cookie) is required for use even if the DB is compromised.

### Why CoupleConnections uses (CoupleAId, CoupleBId) unique index instead of (min, max)
The application layer ensures that when a connection is stored, CoupleAId is always the initiator and CoupleBId is the recipient. `InitiatedByCoupleId` records the direction explicitly. This means the application must search both `WHERE CoupleAId = @id OR CoupleBId = @id` for fetching, but avoids complexity of canonical ordering.
