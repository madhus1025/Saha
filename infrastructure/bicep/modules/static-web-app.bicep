param name string
param location string
param tags object

resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    allowConfigFileUpdates: true
    enterpriseGradeCdnStatus: 'Disabled'
  }
}

output url string = 'https://${staticWebApp.properties.defaultHostname}'
output name string = staticWebApp.name
output deploymentToken string = staticWebApp.listSecrets().properties.apiKey
