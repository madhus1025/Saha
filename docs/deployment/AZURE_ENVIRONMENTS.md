# Azure Environments

Last verified: 2026-07-09

Subscription:

| Item | Value |
|---|---|
| Subscription | Visual Studio Enterprise Subscription |
| Subscription ID | `96597ca5-2a09-429f-bd21-748ca8607a99` |
| Tenant ID | `aa6e0408-8692-4fbc-b422-685e8b713e22` |
| Region | Central US |

## Production

| Item | Value |
|---|---|
| Resource group | `rg-saha-prod` |
| Frontend URL | `https://www.wesaha.com` |
| Frontend Azure URL | `https://agreeable-glacier-09a1f2110.7.azurestaticapps.net` |
| API URL | `https://api.wesaha.com` |
| API Azure URL | `https://app-saha-api-prod.azurewebsites.net` |
| Health URL | `https://api.wesaha.com/health` |
| Root domain | `https://wesaha.com` should forward to `https://www.wesaha.com` in GoDaddy |
| SQL server | `sql-saha-prod.database.windows.net` |
| SQL database | `saha-prod` |
| Storage account | `stsahaprodhkjwdxm6` |
| Static Web App | `stapp-saha-prod` |
| API App Service | `app-saha-api-prod` |
| App Service plan | `asp-saha-prod` |
| Key Vault | `kv-saha-prod` |

Production resource SKUs:

| Resource | SKU |
|---|---|
| App Service plan | `P1v3` |
| Static Web App | `Standard` |
| SQL database | `GP_S_Gen5` serverless |
| Storage | `Standard_LRS` |

Production status:

| Check | Result |
|---|---|
| Frontend route `/login` | `200` |
| API `/health` | `200` |
| Smoke tests | Passed, 6/6 |
| API register/login smoke | Passed |
| Custom domain CORS | Passed, `www.wesaha.com` to `api.wesaha.com` |

## Staging

| Item | Value |
|---|---|
| Resource group | `rg-saha-staging` |
| Frontend URL | `https://ashy-field-050afba10.7.azurestaticapps.net` |
| API URL | `https://app-saha-api-staging.azurewebsites.net` |
| Health URL | `https://app-saha-api-staging.azurewebsites.net/health` |
| SQL server | `sql-saha-staging.database.windows.net` |
| SQL database | `saha-staging` |
| Storage account | `stsahastagingai5bq55y` |
| Static Web App | `stapp-saha-staging` |
| API App Service | `app-saha-api-staging` |
| App Service plan | `asp-saha-staging` |
| Key Vault | `kv-saha-staging` |

Staging resource SKUs:

| Resource | SKU |
|---|---|
| App Service plan | `F1` |
| Static Web App | `Standard` |
| SQL database | `GP_S_Gen5` serverless |
| Storage | `Standard_LRS` |

Staging status:

| Check | Result |
|---|---|
| API `/health` | `200` |

## Deployment Notes

- Production and staging use separate SQL servers and databases.
- Production GitHub environment secrets are configured under the `prod` environment.
- Production custom domains are managed in GoDaddy DNS.
- Production frontend uses `www.wesaha.com`; production API uses `api.wesaha.com`.
- GoDaddy root forwarding should redirect `wesaha.com` to `www.wesaha.com`.
- The current CD workflow defaults to `prod` when no workflow input is provided.
- SMTP/SendGrid is not fully configured for production yet; password reset email delivery needs real SMTP secrets.
- `asp-saha-prod` uses `P1v3`, which is a fixed monthly cost while production remains deployed.
- Do not store connection strings, passwords, deployment tokens, or storage keys in this document.
