param name string
param location string
param tags object
param sku string = 'P1v3'

resource plan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: sku
    tier: sku == 'P1v3' ? 'PremiumV3' : 'Basic'
  }
  properties: {
    reserved: false
  }
}

output id string = plan.id
output name string = plan.name
