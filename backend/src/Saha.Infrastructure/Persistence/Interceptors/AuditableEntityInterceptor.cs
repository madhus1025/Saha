using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Saha.Domain.Entities;

namespace Saha.Infrastructure.Persistence.Interceptors;

public sealed class AuditableEntityInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        UpdateTimestamps(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        UpdateTimestamps(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static void UpdateTimestamps(DbContext? context)
    {
        if (context is null) return;

        var now = DateTime.UtcNow;

        foreach (var entry in context.ChangeTracker.Entries<Entity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Property(nameof(Entity.CreatedAt)).CurrentValue = now;
                entry.Property(nameof(Entity.UpdatedAt)).CurrentValue = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Property(nameof(Entity.UpdatedAt)).CurrentValue = now;
            }
        }
    }
}
