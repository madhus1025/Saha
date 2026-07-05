using Microsoft.EntityFrameworkCore;
using Saha.Domain.Entities;
using Saha.Domain.Enums;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Infrastructure.Persistence.Repositories;

public sealed class ConnectionRepository : IConnectionRepository
{
    private readonly ApplicationDbContext _context;

    public ConnectionRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CoupleConnection?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        await _context.CoupleConnections.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    public async Task<CoupleConnection?> GetBetweenCouplesAsync(
        Guid coupleAId, Guid coupleBId, CancellationToken cancellationToken = default) =>
        await _context.CoupleConnections
            .FirstOrDefaultAsync(c =>
                (c.CoupleAId == coupleAId && c.CoupleBId == coupleBId) ||
                (c.CoupleAId == coupleBId && c.CoupleBId == coupleAId),
                cancellationToken);

    public async Task<IReadOnlyList<CoupleConnection>> GetByCoupleIdAsync(
        Guid coupleId,
        ConnectionRequestStatus? status = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.CoupleConnections
            .Where(c => c.CoupleAId == coupleId || c.CoupleBId == coupleId);

        if (status.HasValue)
            query = query.Where(c => c.Status == status.Value);

        return await query
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> PendingRequestExistsAsync(
        Guid coupleAId, Guid coupleBId, CancellationToken cancellationToken = default) =>
        await _context.CoupleConnections
            .AnyAsync(c =>
                ((c.CoupleAId == coupleAId && c.CoupleBId == coupleBId) ||
                 (c.CoupleAId == coupleBId && c.CoupleBId == coupleAId)) &&
                c.Status == ConnectionRequestStatus.Pending,
                cancellationToken);

    public async Task AddAsync(CoupleConnection connection, CancellationToken cancellationToken = default)
    {
        await _context.CoupleConnections.AddAsync(connection, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(CoupleConnection connection, CancellationToken cancellationToken = default)
    {
        _context.CoupleConnections.Update(connection);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
