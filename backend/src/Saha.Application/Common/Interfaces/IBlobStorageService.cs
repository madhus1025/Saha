namespace Saha.Application.Common.Interfaces;

public interface IBlobStorageService
{
    Task<string> UploadAsync(Stream fileStream, string fileName, string contentType, string containerName, CancellationToken cancellationToken = default);
    Task DeleteAsync(string blobUrl, string containerName, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(string blobUrl, string containerName, CancellationToken cancellationToken = default);
}
