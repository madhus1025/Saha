# Saha — Developer Setup

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| .NET SDK | 9.0+ | `~/.dotnet/dotnet-install.sh` or https://dotnet.microsoft.com/download |
| Node.js | 20 LTS | https://nodejs.org |
| Git | Latest | https://git-scm.com |

> **No database installation required.** Local dev uses SQLite — the `.db` file is created automatically on first run.

## 1. Clone

```bash
git clone https://github.com/your-org/saha.git
cd saha
```

## 2. Backend

```bash
cd backend/src/Saha.API
dotnet run
```

The first run creates `saha-dev.db` (SQLite) automatically via `EnsureCreated()` and starts listening at:
- **https://localhost:7001** (HTTPS)
- **http://localhost:5001** (HTTP)

Swagger UI: https://localhost:7001/swagger

> The `Properties/launchSettings.json` sets `ASPNETCORE_ENVIRONMENT=Development` automatically,
> which loads `appsettings.Development.json` (SQLite connection, dev JWT key, null email/storage).

## 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app opens at **http://localhost:5175**. The Vite dev server proxies all `/api/*` requests to `https://localhost:7001`.

## 4. Run Tests

### Backend unit tests
```bash
cd backend
dotnet test
```

### Frontend unit tests
```bash
cd frontend
npm run test          # watch mode
npm run test:coverage # with coverage report
```

### Frontend E2E tests (Playwright)
```bash
# Terminal 1 — backend running
cd backend/src/Saha.API && dotnet run

# Terminal 2 — frontend running
cd frontend && npm run dev

# Terminal 3 — run tests
cd frontend && npx playwright test
npx playwright show-report
```

## Configuration Files

| File | Purpose |
|------|---------|
| `backend/src/Saha.API/appsettings.Development.json` | Local dev config (SQLite, dev JWT, null email/storage) |
| `backend/src/Saha.API/Properties/launchSettings.json` | Sets `ASPNETCORE_ENVIRONMENT=Development` for `dotnet run` |
| `frontend/vite.config.ts` | Vite proxy: `/api` → `https://localhost:7001` |

## Local Email Testing

In dev, emails are logged to the backend console instead of being sent. Look for `[DEV EMAIL]` lines in the terminal output.

To test real email sending, configure SMTP in `appsettings.Development.json`:

```json
"Smtp": {
  "Host": "localhost",
  "Port": 1025,
  "Username": "",
  "Password": "",
  "UseSsl": false,
  "SenderEmail": "noreply@saha.local",
  "SenderName": "Saha"
}
```

Install [Mailpit](https://github.com/axllent/mailpit) for local email capture:

```bash
brew install mailpit
mailpit
```

Mailpit UI at http://localhost:8025.

## Switching to SQL Server (Production-like)

Change the connection string in `appsettings.Development.json`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost;Database=SahaLocal;Trusted_Connection=True;TrustServerCertificate=True"
}
```

The app auto-detects SQLite vs SQL Server from the connection string prefix:
- Starts with `Data Source=` → SQLite (`EnsureCreated`)
- Anything else → SQL Server (`MigrateAsync`)

## VS Code Extensions

- `ms-dotnettools.csharp` — C# Dev Kit
- `ms-dotnettools.csdevkit` — C# Dev Kit
- `esbenp.prettier-vscode` — Prettier
- `dbaeumer.vscode-eslint` — ESLint
- `bradlc.vscode-tailwindcss` — Tailwind IntelliSense
- `ms-playwright.playwright` — Playwright Test

## Useful Commands

```bash
# Backend: add a new EF Core migration (for SQL Server path)
dotnet ef migrations add MigrationName \
  --project backend/src/Saha.Infrastructure \
  --startup-project backend/src/Saha.API

# Backend: format code
cd backend && dotnet format

# Frontend: format code
cd frontend && npm run format

# Frontend: type check
cd frontend && npm run type-check

# Frontend: update dependencies
cd frontend && npm update
```
