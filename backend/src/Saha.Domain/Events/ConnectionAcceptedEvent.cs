namespace Saha.Domain.Events;

public sealed record ConnectionAcceptedEvent(
    Guid ConnectionId,
    Guid CoupleAId,
    Guid CoupleBId,
    string CoupleATogetherID,
    string CoupleBTogetherID) : DomainEvent;
