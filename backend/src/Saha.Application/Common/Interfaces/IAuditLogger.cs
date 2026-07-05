namespace Saha.Application.Common.Interfaces;

public interface IAuditLogger
{
    Task LogAsync(
        string action,
        bool isSuccess,
        Guid? coupleId = null,
        Guid? partnerId = null,
        string? resourceType = null,
        Guid? resourceId = null,
        string? details = null,
        string? ipAddress = null,
        string? userAgent = null,
        string? errorCode = null,
        CancellationToken cancellationToken = default);
}
