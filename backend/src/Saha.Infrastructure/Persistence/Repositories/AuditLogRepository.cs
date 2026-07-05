using Microsoft.EntityFrameworkCore;
using Saha.Domain.Entities;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Infrastructure.Persistence.Repositories;

public sealed class AuditLogRepository : IAuditLogRepository
{
    private readonly ApplicationDbContext _context;

    public AuditLogRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(AuditLog log, CancellationToken cancellationToken = default)
    {
        await _context.AuditLogs.AddAsync(log, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AuditLog>> GetByCoupleIdAsync(
        Guid coupleId, int page, int pageSize, CancellationToken cancellationToken = default) =>
        await _context.AuditLogs
            .Where(a => a.CoupleId == coupleId)
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
}
