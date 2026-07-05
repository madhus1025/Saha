using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using Saha.Application.Common.Interfaces;

namespace Saha.Infrastructure.Services.Storage;

// Saves files to local disk in development when Azure Storage is not configured.
// Files are served via /uploads/ static-files middleware in Program.cs.
public class NullBlobStorageService(
    IWebHostEnvironment env,
    ILogger<NullBlobStorageService> logger) : IBlobStorageService
{
    public async Task<string> UploadAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        string containerName,
        CancellationToken cancellationToken = default)
    {
        var uploadsRoot = Path.Combine(env.ContentRootPath, "uploads", containerName);
        var relativeFilePath = fileName.Replace('/', Path.DirectorySeparatorChar);
        var fullPath = Path.Combine(uploadsRoot, relativeFilePath);

        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await using var fs = new FileStream(fullPath, FileMode.Create, FileAccess.Write);
        await fileStream.CopyToAsync(fs, cancellationToken);

        logger.LogInformation("LocalBlobStorage: saved {FileName} → {Path}", fileName, fullPath);

        return $"/uploads/{containerName}/{fileName.Replace(Path.DirectorySeparatorChar, '/')}";
    }

    public Task DeleteAsync(string blobUrl, string containerName, CancellationToken cancellationToken = default)
    {
        try
        {
            var relativePath = blobUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            var fullPath = Path.Combine(env.ContentRootPath, relativePath);
            if (File.Exists(fullPath)) File.Delete(fullPath);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "LocalBlobStorage: could not delete {BlobUrl}", blobUrl);
        }
        return Task.CompletedTask;
    }

    public Task<bool> ExistsAsync(string blobUrl, string containerName, CancellationToken cancellationToken = default)
    {
        var relativePath = blobUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        var fullPath = Path.Combine(env.ContentRootPath, relativePath);
        return Task.FromResult(File.Exists(fullPath));
    }
}
