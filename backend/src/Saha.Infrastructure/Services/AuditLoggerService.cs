using Saha.Application.Common.Interfaces;
using Saha.Domain.Entities;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Infrastructure.Services;

public sealed class AuditLoggerService : IAuditLogger
{
    private readonly IAuditLogRepository _auditLogRepository;

    public AuditLoggerService(IAuditLogRepository auditLogRepository)
    {
        _auditLogRepository = auditLogRepository;
    }

    public async Task LogAsync(
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
        CancellationToken cancellationToken = default)
    {
        var log = AuditLog.Create(
            action: action,
            isSuccess: isSuccess,
            coupleId: coupleId,
            partnerId: partnerId,
            resourceType: resourceType,
            resourceId: resourceId,
            details: details,
            ipAddress: ipAddress,
            userAgent: userAgent,
            errorCode: errorCode);

        await _auditLogRepository.AddAsync(log, cancellationToken);
    }
}
