using Microsoft.EntityFrameworkCore;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Entities;

namespace Saha.Application.Features.Messaging.Common;

/// <summary>Batch-loads partner display data (name/role/avatar) in a single query to avoid N+1.</summary>
public static class PartnerLookup
{
    public static async Task<IReadOnlyDictionary<Guid, Partner>> LoadAsync(
        IApplicationDbContext db,
        IEnumerable<Guid> partnerIds,
        CancellationToken cancellationToken)
    {
        var ids = partnerIds.Distinct().ToList();
        if (ids.Count == 0)
            return new Dictionary<Guid, Partner>();

        var partners = await db.Partners
            .Where(p => ids.Contains(p.Id))
            .ToListAsync(cancellationToken);

        return partners.ToDictionary(p => p.Id);
    }
}
