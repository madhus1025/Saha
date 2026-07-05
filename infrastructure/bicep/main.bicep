@description('Environment: dev, staging, prod')
param environment string = 'prod'

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('App name prefix')
param appName string = 'saha'

@description('SQL Server administrator login')
param sqlAdminLogin string

@description('SQL Server administrator password')
@secure()
param sqlAdminPassword string

@description('JWT secret key')
@secure()
param jwtSecretKey string

@description('SendGrid API key')
@secure()
param sendGridApiKey string

@description('Frontend origin URL')
param frontendUrl string

var resourceSuffix = '${appName}-${environment}'
var tags = {
  Application: 'Saha'
  Environment: environment
  ManagedBy: 'Bicep'
}

module appServicePlan 'modules/app-service-plan.bicep' = {
  name: 'appServicePlan'
  params: {
    name: 'asp-${resourceSuffix}'
    location: location
    tags: tags
    sku: environment == 'prod' ? 'P1v3' : 'B1'
  }
}

module webApp 'modules/web-app.bicep' = {
  name: 'webApp'
  params: {
    name: 'app-${resourceSuffix}'
    location: location
    tags: tags
    serverFarmId: appServicePlan.outputs.id
    sqlConnectionString: 'Server=tcp:${sqlServer.outputs.fqdn},1433;Database=${resourceSuffix};User ID=${sqlAdminLogin};Password=${sqlAdminPassword};Encrypt=True;TrustServerCertificate=False;'
    jwtSecretKey: jwtSecretKey
    jwtIssuer: 'https://app-${resourceSuffix}.azurewebsites.net'
    jwtAudience: frontendUrl
    sendGridApiKey: sendGridApiKey
    storageConnectionString: storageAccount.outputs.connectionString
    frontendUrl: frontendUrl
  }
}

module sqlServer 'modules/sql-server.bicep' = {
  name: 'sqlServer'
  params: {
    serverName: 'sql-${resourceSuffix}'
    databaseName: resourceSuffix
    location: location
    tags: tags
    adminLogin: sqlAdminLogin
    adminPassword: sqlAdminPassword
  }
}

module storageAccount 'modules/storage-account.bicep' = {
  name: 'storageAccount'
  params: {
    name: 'st${replace(resourceSuffix, '-', '')}${uniqueString(resourceGroup().id)}'
    location: location
    tags: tags
  }
}

module staticWebApp 'modules/static-web-app.bicep' = {
  name: 'staticWebApp'
  params: {
    name: 'swa-${resourceSuffix}'
    location: location
    tags: tags
  }
}

module keyVault 'modules/key-vault.bicep' = {
  name: 'keyVault'
  params: {
    name: 'kv-${resourceSuffix}'
    location: location
    tags: tags
  }
}

output webAppUrl string = webApp.outputs.url
output staticWebAppUrl string = staticWebApp.outputs.url
output sqlServerFqdn string = sqlServer.outputs.fqdn
output storageAccountName string = storageAccount.outputs.name
