using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Saha.Domain.Entities;

namespace Saha.Infrastructure.Persistence.Interceptors;

public sealed class DomainEventDispatchInterceptor : SaveChangesInterceptor
{
    private readonly IMediator _mediator;

    public DomainEventDispatchInterceptor(IMediator mediator)
    {
        _mediator = mediator;
    }

    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData,
        int result,
        CancellationToken cancellationToken = default)
    {
        await DispatchDomainEventsAsync(eventData.Context, cancellationToken);
        return await base.SavedChangesAsync(eventData, result, cancellationToken);
    }

    private async Task DispatchDomainEventsAsync(DbContext? context, CancellationToken cancellationToken)
    {
        if (context is null) return;

        var aggregates = context.ChangeTracker
            .Entries<AggregateRoot>()
            .Where(e => e.Entity.DomainEvents.Count > 0)
            .Select(e => e.Entity)
            .ToList();

        var domainEvents = aggregates
            .SelectMany(a => a.DomainEvents)
            .ToList();

        aggregates.ForEach(a => a.ClearDomainEvents());

        foreach (var domainEvent in domainEvents)
            await _mediator.Publish(domainEvent, cancellationToken);
    }
}
