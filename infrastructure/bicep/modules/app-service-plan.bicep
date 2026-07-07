param name string
param location string
param tags object
param sku string = 'P1v3'

var tierMap = {
  P1v3: 'PremiumV3'
  B1: 'Basic'
  F1: 'Free'
}

resource plan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: sku
    tier: tierMap[?sku] ?? 'Free'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

output id string = plan.id
output name string = plan.name
