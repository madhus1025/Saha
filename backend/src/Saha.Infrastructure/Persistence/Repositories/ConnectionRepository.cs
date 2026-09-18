using Microsoft.EntityFrameworkCore;
using Saha.Application.Common.Exceptions;
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

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            // The caller already checked for an existing connection; losing the race to a
            // concurrent identical request is the same outcome, so it gets the same 409 rather
            // than a 500 from a raw constraint violation (SAHA-D17).
            _context.Entry(connection).State = EntityState.Detached;
            throw new ConflictException("REQUEST_PENDING", "A connection request is already pending.");
        }
    }

    /// <summary>
    /// Provider-agnostic unique-constraint detection: SQLite reports 19 (SQLITE_CONSTRAINT) and
    /// SQL Server 2601/2627, and the inner exception type differs per provider — so match on the
    /// message rather than binding this repository to one database engine.
    /// </summary>
    private static bool IsUniqueViolation(DbUpdateException ex)
    {
        var message = ex.InnerException?.Message ?? ex.Message;
        return message.Contains("UNIQUE constraint failed", StringComparison.OrdinalIgnoreCase)
            || message.Contains("duplicate key", StringComparison.OrdinalIgnoreCase)
            || message.Contains("Cannot insert duplicate key", StringComparison.OrdinalIgnoreCase);
    }

    public async Task UpdateAsync(CoupleConnection connection, CancellationToken cancellationToken = default)
    {
        _context.CoupleConnections.Update(connection);
        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // A competing request changed this connection after it was loaded. Only one terminal
            // transition may win; expose the race as a deterministic client conflict.
            throw new ConflictException(
                "CONNECTION_ALREADY_RESOLVED",
                "This connection request has already been accepted or declined.");
        }
    }
}
