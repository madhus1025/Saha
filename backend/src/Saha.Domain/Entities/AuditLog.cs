namespace Saha.Domain.Entities;

public sealed class AuditLog : Entity
{
    public Guid? CoupleId { get; private set; }
    public Guid? PartnerId { get; private set; }
    public string Action { get; private set; } = default!;
    public string? ResourceType { get; private set; }
    public Guid? ResourceId { get; private set; }
    public string? Details { get; private set; }
    public string? IpAddress { get; private set; }
    public string? UserAgent { get; private set; }
    public bool IsSuccess { get; private set; }
    public string? ErrorCode { get; private set; }

    private AuditLog() { }

    public static AuditLog Create(
        string action,
        bool isSuccess,
        Guid? coupleId = null,
        Guid? partnerId = null,
        string? resourceType = null,
        Guid? resourceId = null,
        string? details = null,
        string? ipAddress = null,
        string? userAgent = null,
        string? errorCode = null)
    {
        return new AuditLog
        {
            Id = Guid.NewGuid(),
            Action = action,
            IsSuccess = isSuccess,
            CoupleId = coupleId,
            PartnerId = partnerId,
            ResourceType = resourceType,
            ResourceId = resourceId,
            Details = details,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            ErrorCode = errorCode,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }
}
