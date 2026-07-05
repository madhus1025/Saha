namespace Saha.Domain.Events;

public sealed record CoupleRegisteredEvent(
    Guid CoupleId,
    string TogetherID,
    string HusbandEmail,
    string WifeEmail,
    string HusbandName,
    string WifeName) : DomainEvent;
