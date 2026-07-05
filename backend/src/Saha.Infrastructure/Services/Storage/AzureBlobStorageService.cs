using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Saha.Application.Common.Interfaces;

namespace Saha.Infrastructure.Services.Storage;

public sealed class AzureBlobStorageService : IBlobStorageService
{
    private readonly BlobServiceClient _blobServiceClient;
    private readonly ILogger<AzureBlobStorageService> _logger;

    public AzureBlobStorageService(
        BlobServiceClient blobServiceClient,
        ILogger<AzureBlobStorageService> logger)
    {
        _blobServiceClient = blobServiceClient;
        _logger = logger;
    }

    public async Task<string> UploadAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        string containerName,
        CancellationToken cancellationToken = default)
    {
        var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
        await containerClient.CreateIfNotExistsAsync(PublicAccessType.Blob, cancellationToken: cancellationToken);

        var blobClient = containerClient.GetBlobClient(fileName);

        var headers = new BlobHttpHeaders { ContentType = contentType };

        await blobClient.UploadAsync(fileStream, new BlobUploadOptions
        {
            HttpHeaders = headers
        }, cancellationToken);

        _logger.LogInformation("Uploaded blob '{FileName}' to container '{Container}'", fileName, containerName);

        return blobClient.Uri.ToString();
    }

    public async Task DeleteAsync(
        string blobUrl,
        string containerName,
        CancellationToken cancellationToken = default)
    {
        var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);

        var uri = new Uri(blobUrl);
        var blobName = uri.AbsolutePath.TrimStart('/').Replace($"{containerName}/", "");

        var blobClient = containerClient.GetBlobClient(blobName);
        var deleted = await blobClient.DeleteIfExistsAsync(cancellationToken: cancellationToken);

        if (deleted.Value)
            _logger.LogInformation("Deleted blob '{BlobName}' from container '{Container}'", blobName, containerName);
    }

    public async Task<bool> ExistsAsync(
        string blobUrl,
        string containerName,
        CancellationToken cancellationToken = default)
    {
        var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
        var uri = new Uri(blobUrl);
        var blobName = uri.AbsolutePath.TrimStart('/').Replace($"{containerName}/", "");
        var blobClient = containerClient.GetBlobClient(blobName);
        return await blobClient.ExistsAsync(cancellationToken);
    }
}
