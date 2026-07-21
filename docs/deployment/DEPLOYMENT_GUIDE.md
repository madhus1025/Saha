# Saha — Deployment Guide

## Azure Resources

| Resource | Type | SKU | Purpose |
|---|---|---|---|
| `rg-saha-prod` | Resource Group | — | Container for all resources |
| `app-saha-api-prod` | App Service | P1v3 | Backend API hosting |
| `sql-saha-prod` | SQL Server | — | Database server |
| `SahaDB` | SQL Database | GP_S_Gen5_1 | Serverless database, auto-pauses |
| `st-saha-prod` | Storage Account | Standard LRS | Profile picture blobs |
| `stapp-saha-prod` | Static Web App | Standard | Frontend hosting + CDN |
| `kv-saha-prod` | Key Vault | Standard | Secrets management |

## Environments & CD triggers

The `CD` workflow deploys to one of two environments; the target is derived from the trigger:

| Trigger | Environment | Resource group | App Service | Static Web App |
|---|---|---|---|---|
| push to `main` | **prod** | `rg-saha-prod` | `app-saha-api-prod` | `stapp-saha-prod` |
| push to `develop` | **staging** | `rg-saha-staging` | `app-saha-api-staging` | `stapp-saha-staging` |
| manual `workflow_dispatch` | chosen (`prod`/`staging`) | `rg-saha-<env>` | `app-saha-api-<env>` | `stapp-saha-<env>` |

Run a manual deploy with `gh workflow run cd.yml -f environment=staging` (or `prod`).

The `provision` job runs an **idempotent `az group create`**, so a brand-new environment no longer
fails on a missing resource group — provided the service principal can create resource groups (see
the permission note below). Each environment needs its own Azure resources, a matching OIDC
federated credential, and (if you scope secrets per environment) its own GitHub Environment secrets.

## Initial Azure Setup (One-Time, per environment)

### 1. Create the Resource Group

CD now creates the group automatically on first deploy, **but only if the service principal has
resource-group-create rights at the subscription scope**. The role assignment in step 2 below is
scoped to a single resource group, which is *not* enough to create it — so either broaden that
assignment to the subscription (or a role with `Microsoft.Resources/subscriptions/resourceGroups/write`),
or create the groups once by hand:

```bash
az login
az account set --subscription <YOUR_SUBSCRIPTION_ID>
az group create --name rg-saha-prod    --location centralus   # prod
az group create --name rg-saha-staging --location centralus   # staging
```

> Location note: the `CD` workflow passes `location=centralus`, so create the groups in `centralus`
> to keep every resource in one region.

### 2. Create a Service Principal for GitHub Actions

```bash
az ad app create --display-name "saha-github-actions"
APP_ID=$(az ad app list --display-name "saha-github-actions" --query "[0].appId" -o tsv)

az ad sp create --id $APP_ID
SP_OBJECT_ID=$(az ad sp show --id $APP_ID --query "id" -o tsv)

az role assignment create \
  --assignee $SP_OBJECT_ID \
  --role Contributor \
  --scope /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/rg-saha-prod

az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "github-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:your-org/saha:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

> **Staging OIDC:** the credential above only matches `main`. A push to `develop` (staging) will fail
> Azure login until you add a second federated credential for it — e.g. subject
> `repo:your-org/saha:ref:refs/heads/develop`. Because the CD jobs also declare a GitHub
> `environment:`, an environment-subject credential (`repo:your-org/saha:environment:staging` and
> `…:environment:prod`) works too and is often cleaner. Grant the service principal `Contributor` on
> `rg-saha-staging` (and at subscription scope if you rely on the automatic `az group create`).

### 3. Configure GitHub Secrets

In the GitHub repository → Settings → Secrets and variables → Actions:

| Secret Name | Value |
|---|---|
| `AZURE_CLIENT_ID` | App registration Client ID |
| `AZURE_TENANT_ID` | Azure AD Tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure Subscription ID |
| `SQL_ADMIN_PASSWORD` | Strong password for SQL admin |
| `SQL_CONNECTION_STRING` | Full EF Core connection string |
| `JWT_SECRET_KEY` | 64+ char random string |
| `JWT_ISSUER` | `https://api.saha.app` |
| `JWT_AUDIENCE` | `https://saha.app` |
| `SMTP_HOST` | SendGrid SMTP host |
| `SMTP_PORT` | `587` |
| `SMTP_USERNAME` | SendGrid API key username |
| `SMTP_PASSWORD` | SendGrid API key |
| `SMTP_FROM_EMAIL` | `noreply@saha.app` |
| `STORAGE_CONNECTION_STRING` | Azure Storage connection string |
| `VITE_API_URL` | `https://api.saha.app/api/v1` |
| `FRONTEND_URL` | `https://saha.app` |
| `APPINSIGHTS_CONNECTION_STRING` | From Application Insights resource |

### 4. First-Time Infrastructure Deployment

```bash
az deployment group create \
  --resource-group rg-saha-prod \
  --template-file infrastructure/bicep/main.bicep \
  --parameters environment=production sqlAdminPassword=<STRONG_PASSWORD>
```

## Deployment Pipeline

A push to `main` deploys **prod**; a push to `develop` deploys **staging** (same stages, different
environment). Each triggers:

```
CI (all tests pass)
    │
    ▼
CD: Provision Azure Infrastructure (Bicep, idempotent)
    │
    ▼
CD: Run EF Core Database Migrations
    │
    ▼
CD: Publish + Deploy Backend to Azure App Service
    ├── Configure App Settings
    └── Verify /health endpoint
    │
    ▼
CD: Build + Deploy Frontend to Azure Static Web Apps
    │
    ▼
CD: Post-Deployment Smoke Tests (@smoke tagged Playwright tests)
    │
    ▼
Notify (success or failure)
```

## Manual Deployment (Emergency)

### Backend Only

```bash
cd backend
dotnet publish src/Saha.API -c Release -o ./publish -r linux-x64 --no-self-contained
az webapp deploy \
  --name app-saha-api-prod \
  --resource-group rg-saha-prod \
  --src-path ./publish \
  --type zip
```

### Frontend Only

```bash
cd frontend
VITE_API_URL=https://api.saha.app/api/v1 npm run build

TOKEN=$(az staticwebapp secrets list \
  --name stapp-saha-prod \
  --resource-group rg-saha-prod \
  --query "properties.apiKey" -o tsv)

npx @azure/static-web-apps-cli deploy dist \
  --deployment-token $TOKEN \
  --env production
```

### Database Migration Only

```bash
cd backend
dotnet ef database update \
  --project src/Saha.Infrastructure \
  --startup-project src/Saha.API \
  --connection "Server=sql-saha-prod.database.windows.net;..."
```

## Rollback Procedure

### Backend Rollback

Azure App Service maintains deployment slots. To rollback:
1. Go to Azure Portal → App Service → Deployment Center
2. Select the previous successful deployment
3. Click "Redeploy"

Or via CLI:
```bash
# List deployment history
az webapp deployment list --name app-saha-api-prod \
  --resource-group rg-saha-prod

# Rollback is done via redeploying the previous build artifact from the GitHub Actions run
```

### Database Rollback

EF Core migrations can be reverted:
```bash
# Revert to a specific migration
dotnet ef database update <PreviousMigrationName> \
  --project backend/src/Saha.Infrastructure \
  --startup-project backend/src/Saha.API
```

## Health Check

The API exposes a health check at `GET /health`:

```json
{
  "status": "Healthy",
  "totalDuration": "00:00:00.0234567",
  "entries": {
    "database": {
      "status": "Healthy",
      "duration": "00:00:00.0201234"
    }
  }
}
```

## Environment Variables Reference

All application configuration in production is managed via Azure App Service Application Settings (set by the CD pipeline). No values are stored in `appsettings.json` for production — that file contains only structural defaults.

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "<<from GitHub Secret>>"
  },
  "JwtSettings": {
    "SecretKey": "<<from GitHub Secret>>",
    "Issuer": "<<from GitHub Secret>>",
    "Audience": "<<from GitHub Secret>>",
    "AccessTokenExpirationMinutes": 15,
    "RefreshTokenExpirationDays": 30
  },
  "SmtpSettings": {
    "Host": "<<from GitHub Secret>>",
    "Port": 587,
    "Username": "<<from GitHub Secret>>",
    "Password": "<<from GitHub Secret>>",
    "FromEmail": "<<from GitHub Secret>>",
    "FromName": "Saha",
    "EnableSsl": true
  },
  "AzureStorage": {
    "ConnectionString": "<<from GitHub Secret>>",
    "ContainerName": "profile-pictures"
  }
}
```
