param name string
param location string
param tags object
param serverFarmId string
param sqlConnectionString string

@secure()
param jwtSecretKey string
param jwtIssuer string
param jwtAudience string

@secure()
param sendGridApiKey string
param storageConnectionString string
param frontendUrl string

resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: name
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: serverFarmId
    httpsOnly: true
    siteConfig: {
      netFrameworkVersion: 'v9.0'
      alwaysOn: true
      http20Enabled: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      healthCheckPath: '/health'
      appSettings: [
        { name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' }
        { name: 'Jwt__Issuer', value: jwtIssuer }
        { name: 'Jwt__Audience', value: jwtAudience }
        { name: 'Jwt__SecretKey', value: jwtSecretKey }
        { name: 'Jwt__AccessTokenTtlMinutes', value: '15' }
        { name: 'Jwt__RefreshTokenTtlDays', value: '30' }
        { name: 'Smtp__Host', value: 'smtp.sendgrid.net' }
        { name: 'Smtp__Port', value: '587' }
        { name: 'Smtp__Username', value: 'apikey' }
        { name: 'Smtp__Password', value: sendGridApiKey }
        { name: 'Smtp__SenderEmail', value: 'noreply@saha.app' }
        { name: 'Smtp__SenderName', value: 'Saha' }
        { name: 'AzureStorage__ConnectionString', value: storageConnectionString }
        { name: 'AzureStorage__ProfilePicturesContainer', value: 'profile-pictures' }
        { name: 'Cors__AllowedOrigins__0', value: frontendUrl }
        { name: 'PasswordReset__TokenTtlMinutes', value: '15' }
      ]
      connectionStrings: [
        {
          name: 'DefaultConnection'
          connectionString: sqlConnectionString
          type: 'SQLAzure'
        }
      ]
    }
  }
}

output url string = 'https://${webApp.properties.defaultHostName}'
output principalId string = webApp.identity.principalId
output name string = webApp.name
