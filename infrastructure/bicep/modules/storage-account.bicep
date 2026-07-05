param name string
param location string
param tags object

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: name
  location: location
  tags: tags
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: true
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    encryption: {
      services: {
        blob: { enabled: true }
        file: { enabled: true }
      }
      keySource: 'Microsoft.Storage'
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storage
  name: 'default'
  properties: {
    cors: {
      corsRules: [
        {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'HEAD']
          allowedHeaders: ['*']
          exposedHeaders: ['*']
          maxAgeInSeconds: 3600
        }
      ]
    }
  }
}

resource profilePicturesContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'profile-pictures'
  properties: {
    publicAccess: 'Blob'
  }
}

var connectionString = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=core.windows.net'

output name string = storage.name
output connectionString string = connectionString
