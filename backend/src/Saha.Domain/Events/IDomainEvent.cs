using MediatR;

namespace Saha.Domain.Events;

public interface IDomainEvent : INotification
{
    Guid EventId { get; }
    DateTime OccurredAt { get; }
}
