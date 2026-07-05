using Saha.Domain.Entities;

namespace Saha.Domain.Interfaces.Repositories;

public interface IAuditLogRepository
{
    Task AddAsync(AuditLog log, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AuditLog>> GetByCoupleIdAsync(Guid coupleId, int page, int pageSize, CancellationToken cancellationToken = default);
}
