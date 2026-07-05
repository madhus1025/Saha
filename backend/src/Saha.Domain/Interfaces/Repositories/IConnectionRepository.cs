using Saha.Domain.Entities;
using Saha.Domain.Enums;

namespace Saha.Domain.Interfaces.Repositories;

public interface IConnectionRepository
{
    Task<CoupleConnection?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<CoupleConnection?> GetBetweenCouplesAsync(Guid coupleAId, Guid coupleBId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CoupleConnection>> GetByCoupleIdAsync(Guid coupleId, ConnectionRequestStatus? status = null, CancellationToken cancellationToken = default);
    Task<bool> PendingRequestExistsAsync(Guid coupleAId, Guid coupleBId, CancellationToken cancellationToken = default);
    Task AddAsync(CoupleConnection connection, CancellationToken cancellationToken = default);
    Task UpdateAsync(CoupleConnection connection, CancellationToken cancellationToken = default);
}
