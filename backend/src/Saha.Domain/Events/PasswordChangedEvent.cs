namespace Saha.Domain.Events;

public sealed record PasswordChangedEvent(
    Guid CoupleId,
    string TogetherID,
    string HusbandEmail,
    string WifeEmail) : DomainEvent;
