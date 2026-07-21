# Saha — A Digital Home for Couples

[![CI](https://github.com/your-org/saha/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/saha/actions/workflows/ci.yml)
[![CD](https://github.com/your-org/saha/actions/workflows/cd.yml/badge.svg)](https://github.com/your-org/saha/actions/workflows/cd.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Saha** is a production-grade couples application that gives two people a shared digital home — one account, two identities, infinite moments.

---

## Quick Start (Local Dev — No database install needed)

### Prerequisites

| Tool | Version |
|------|---------|
| .NET SDK | 9.0+ |
| Node.js | 20 LTS+ |

> Local dev uses **SQLite** (auto-created on first run). No Docker, no SQL Server required.

### Run the Backend

```bash
cd backend/src/Saha.API
dotnet run
# API: https://localhost:7001
# Swagger: https://localhost:7001/swagger
```

### Run the Frontend

```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5175
```

---

## Documentation

| Document | Location |
|----------|----------|
| Architecture Overview | [docs/architecture/ARCHITECTURE_OVERVIEW.md](docs/architecture/ARCHITECTURE_OVERVIEW.md) |
| Folder Structure | [docs/architecture/FOLDER_STRUCTURE.md](docs/architecture/FOLDER_STRUCTURE.md) |
| Database Schema | [docs/architecture/DATABASE_SCHEMA.md](docs/architecture/DATABASE_SCHEMA.md) |
| Developer Setup | [docs/development/DEVELOPER_SETUP.md](docs/development/DEVELOPER_SETUP.md) |
| Coding Standards | [docs/development/CODING_STANDARDS.md](docs/development/CODING_STANDARDS.md) |
| Testing Guide | [docs/development/TESTING_GUIDE.md](docs/development/TESTING_GUIDE.md) |
| Deployment Guide | [docs/deployment/DEPLOYMENT_GUIDE.md](docs/deployment/DEPLOYMENT_GUIDE.md) |
| Manual Test Cases | [docs/testing/MANUAL_TEST_CASES.md](docs/testing/MANUAL_TEST_CASES.md) |
| E2E Quality Report (bugs, coverage, results) | [reports/e2e-product-quality-report.html](reports/e2e-product-quality-report.html) |
| E2E Testing Artifacts (bugs, coverage matrix, plan) | [testing/](testing/) |

---

## Repository Structure

```
saha/
├── .github/workflows/       # CI/CD pipelines
├── backend/
│   ├── src/
│   │   ├── Saha.Domain/        # Entities, value objects, domain events
│   │   ├── Saha.Application/   # CQRS handlers, validators, DTOs
│   │   ├── Saha.Infrastructure/# EF Core, repositories, external services
│   │   └── Saha.API/           # ASP.NET Core 9 Web API
│   └── tests/
│       ├── Saha.Domain.Tests/
│       ├── Saha.Application.Tests/
│       ├── Saha.Infrastructure.Tests/
│       └── Saha.API.Tests/
├── frontend/
│   ├── src/
│   │   ├── app/          # App bootstrap, providers, router
│   │   ├── core/         # API client, shared types, utilities
│   │   ├── modules/      # Feature modules (auth, dashboard, profile, connect, …)
│   │   └── shared/       # Shared components, hooks, stores
│   └── tests/e2e/        # Playwright end-to-end tests
├── infrastructure/
│   ├── bicep/            # Azure infrastructure as code
│   └── scripts/          # Deployment helper scripts
└── docs/                 # All project documentation
```

---

## Tech Stack

| Concern | Technology |
|---------|-----------|
| Frontend | React 19, Vite 6, React Router v7 |
| Styling | Tailwind CSS v3 + shadcn/ui |
| State | TanStack Query v5 + Zustand 5 |
| Backend | ASP.NET Core 9, MediatR 12 (CQRS) |
| ORM | Entity Framework Core 9 |
| Database (local) | SQLite (auto-created, zero config) |
| Database (prod) | Azure SQL Serverless |
| Auth | JWT Bearer + HttpOnly Refresh Cookies |
| Email (local) | Console logging (NullEmailService) |
| Email (prod) | SMTP via System.Net.Mail |
| File Storage (local) | Placeholder URLs (NullBlobStorageService) |
| File Storage (prod) | Azure Blob Storage |
| Hosting | Azure App Service + Static Web Apps |
| IaC | Azure Bicep |
| CI/CD | GitHub Actions |

---

## License

MIT © Saha
