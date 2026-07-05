namespace Saha.Domain.Events;

public sealed record ConnectionRequestSentEvent(
    Guid ConnectionRequestId,
    Guid RequesterCoupleId,
    Guid TargetCoupleId,
    string RequesterTogetherID,
    string TargetTogetherID) : DomainEvent;
