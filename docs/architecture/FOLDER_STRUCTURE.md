# Saha — Folder Structure

```
saha/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Build validation + all test suites
│       ├── cd.yml                    # Deploy to Azure (provision → migrate → backend → frontend)
│       └── pr-check.yml              # PR title linting, secret scanning, bundle size
│
├── backend/
│   ├── Saha.sln
│   ├── src/
│   │   ├── Saha.Domain/      # No external dependencies (except MediatR.Contracts)
│   │   │   ├── Entities/
│   │   │   │   ├── Entity.cs         # Base class: Id, CreatedAt, UpdatedAt
│   │   │   │   ├── AggregateRoot.cs  # Entity + domain event collection
│   │   │   │   ├── Couple.cs         # ★ Primary aggregate root
│   │   │   │   ├── Partner.cs        # Owned entity within Couple
│   │   │   │   ├── RefreshToken.cs
│   │   │   │   ├── PasswordResetToken.cs
│   │   │   │   ├── CoupleConnection.cs
│   │   │   │   └── AuditLog.cs
│   │   │   ├── ValueObjects/
│   │   │   │   ├── TogetherID.cs     # Format: [A-Z0-9-]{4-50}, unique per couple
│   │   │   │   ├── Username.cs       # Format: [a-z][a-z0-9_.]{2-29}
│   │   │   │   ├── EmailAddress.cs
│   │   │   │   └── PhoneNumber.cs
│   │   │   ├── Events/
│   │   │   │   ├── DomainEvent.cs
│   │   │   │   ├── CoupleRegisteredEvent.cs
│   │   │   │   ├── PasswordChangedEvent.cs
│   │   │   │   ├── ConnectionRequestSentEvent.cs
│   │   │   │   └── ConnectionAcceptedEvent.cs
│   │   │   └── Interfaces/
│   │   │       ├── Repositories/
│   │   │       │   ├── ICoupleRepository.cs
│   │   │       │   ├── IConnectionRepository.cs
│   │   │       │   └── IAuditLogRepository.cs
│   │   │       └── Services/
│   │   │           ├── IPasswordHasher.cs
│   │   │           └── IDateTimeProvider.cs
│   │   │
│   │   ├── Saha.Application/ # MediatR, FluentValidation only
│   │   │   ├── Common/
│   │   │   │   ├── Interfaces/
│   │   │   │   │   ├── IApplicationDbContext.cs
│   │   │   │   │   ├── ITokenService.cs
│   │   │   │   │   ├── IEmailService.cs
│   │   │   │   │   └── IBlobStorageService.cs
│   │   │   │   ├── Behaviors/
│   │   │   │   │   ├── ValidationBehavior.cs  # Runs all validators, throws on failure
│   │   │   │   │   ├── LoggingBehavior.cs     # Structured request/response logging
│   │   │   │   │   └── PerformanceBehavior.cs # Warns if handler > 500ms
│   │   │   │   └── Exceptions/
│   │   │   │       ├── ApplicationValidationException.cs
│   │   │   │       ├── NotFoundException.cs
│   │   │   │       ├── ConflictException.cs
│   │   │   │       └── UnauthorizedException.cs
│   │   │   └── Features/
│   │   │       ├── Auth/
│   │   │       │   └── Commands/
│   │   │       │       ├── Register/
│   │   │       │       ├── Login/
│   │   │       │       ├── RefreshToken/
│   │   │       │       ├── Logout/
│   │   │       │       ├── ForgotPassword/
│   │   │       │       └── ResetPassword/
│   │   │       ├── Profile/
│   │   │       │   ├── Queries/GetProfile/
│   │   │       │   └── Commands/
│   │   │       │       ├── UpdateProfile/
│   │   │       │       └── UploadProfilePicture/
│   │   │       └── Connect/
│   │   │           ├── Commands/
│   │   │           │   ├── SendConnectionRequest/
│   │   │           │   ├── AcceptConnectionRequest/
│   │   │           │   └── RejectConnectionRequest/
│   │   │           └── Queries/
│   │   │               ├── GetConnections/
│   │   │               └── SearchCouples/
│   │   │
│   │   ├── Saha.Infrastructure/
│   │   │   ├── Persistence/
│   │   │   │   ├── ApplicationDbContext.cs
│   │   │   │   ├── Configurations/         # EF Core IEntityTypeConfiguration<T>
│   │   │   │   ├── Interceptors/
│   │   │   │   │   ├── AuditInterceptor.cs
│   │   │   │   │   └── DomainEventDispatchInterceptor.cs
│   │   │   │   ├── Repositories/
│   │   │   │   └── Migrations/
│   │   │   └── Services/
│   │   │       ├── Auth/
│   │   │       │   ├── BcryptPasswordHasher.cs
│   │   │       │   └── JwtTokenService.cs
│   │   │       ├── Email/
│   │   │       │   └── SmtpEmailService.cs
│   │   │       └── Storage/
│   │   │           └── AzureBlobStorageService.cs
│   │   │
│   │   └── Saha.API/
│   │       ├── Controllers/
│   │       │   ├── AuthController.cs
│   │       │   ├── ProfileController.cs
│   │       │   └── ConnectController.cs
│   │       ├── Middleware/
│   │       │   ├── ExceptionHandlingMiddleware.cs
│   │       │   └── CurrentUserContextMiddleware.cs
│   │       ├── Extensions/
│   │       │   ├── ServiceCollectionExtensions.cs
│   │       │   └── ApplicationBuilderExtensions.cs
│   │       ├── Program.cs
│   │       ├── appsettings.json
│   │       └── appsettings.Development.example.json
│   │
│   └── tests/
│       ├── Saha.Domain.Tests/
│       │   ├── Entities/CoupleTests.cs
│       │   └── ValueObjects/
│       │       ├── TogetherIDTests.cs
│       │       ├── UsernameTests.cs
│       │       ├── EmailAddressTests.cs
│       │       └── PhoneNumberTests.cs
│       ├── Saha.Application.Tests/
│       │   └── Features/Auth/
│       │       ├── RegisterCoupleCommandHandlerTests.cs
│       │       └── RegisterCoupleCommandValidatorTests.cs
│       ├── Saha.Infrastructure.Tests/
│       │   ├── Persistence/Repositories/CoupleRepositoryTests.cs
│       │   └── Services/Auth/BcryptPasswordHasherTests.cs
│       └── Saha.API.Tests/
│           ├── Infrastructure/SahaWebApplicationFactory.cs
│           └── Controllers/AuthControllerTests.cs
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   │   ├── router/router.tsx       # createBrowserRouter with ProtectedRoute + GuestRoute
│   │   │   ├── providers/AppProviders.tsx
│   │   │   ├── App.tsx
│   │   │   └── globals.css
│   │   ├── core/
│   │   │   └── api/axios-instance.ts   # Axios with silent refresh interceptor
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── api/auth.api.ts
│   │   │   │   ├── hooks/useLogin.ts
│   │   │   │   ├── pages/
│   │   │   │   │   ├── LoginPage.tsx
│   │   │   │   │   ├── RegisterPage.tsx      # 4-step wizard
│   │   │   │   │   └── ForgotPasswordPage.tsx
│   │   │   │   └── schemas/register.schema.ts
│   │   │   ├── dashboard/pages/DashboardPage.tsx
│   │   │   ├── profile/pages/ProfilePage.tsx
│   │   │   ├── connect/pages/ConnectPage.tsx
│   │   │   ├── finance/pages/FinancePage.tsx
│   │   │   ├── memories/pages/MemoriesPage.tsx
│   │   │   ├── goals/pages/GoalsPage.tsx
│   │   │   ├── messages/pages/MessagesPage.tsx
│   │   │   └── calendar/pages/CalendarPage.tsx
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── AuthLayout.tsx        # Split panel with geometric pattern
│   │   │   │   │   ├── AppLayout.tsx
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   ├── TopBar.tsx
│   │   │   │   │   └── PartnerViewBanner.tsx # Persistent read-only mode indicator
│   │   │   │   └── feedback/
│   │   │   │       └── ComingSoonModule.tsx
│   │   │   └── stores/
│   │   │       ├── auth.store.ts             # Zustand persisted (no accessToken)
│   │   │       └── partner-view.store.ts     # Zustand session-only (not persisted)
│   │   └── test-utils/
│   │       ├── setup.ts
│   │       └── query-wrapper.tsx
│   ├── tests/e2e/
│   │   ├── auth/
│   │   │   ├── login.spec.ts
│   │   │   ├── register.spec.ts
│   │   │   └── forgot-password.spec.ts
│   │   └── dashboard/dashboard.spec.ts
│   ├── playwright.config.ts
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── infrastructure/
│   └── bicep/
│       ├── main.bicep
│       └── modules/
│           ├── web-app.bicep
│           ├── sql-server.bicep
│           ├── storage-account.bicep
│           ├── static-web-app.bicep
│           └── key-vault.bicep
│
└── docs/
    ├── architecture/
    │   ├── ARCHITECTURE_OVERVIEW.md
    │   ├── FOLDER_STRUCTURE.md      ← this file
    │   └── DATABASE_SCHEMA.md
    ├── development/
    │   ├── DEVELOPER_SETUP.md
    │   ├── CODING_STANDARDS.md
    │   └── TESTING_GUIDE.md
    └── deployment/
        └── DEPLOYMENT_GUIDE.md
```
