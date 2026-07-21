namespace Saha.Domain.Events;

/// <summary>
/// Raised when the invited partner accepts and the couple becomes whole. This — not
/// <see cref="CoupleRegisteredEvent"/> — is the point at which both partners exist, so it is the
/// only safe trigger for anything requiring a Husband and a Wife (e.g. the partner conversation).
/// </summary>
public sealed record CoupleCompletedEvent(
    Guid CoupleId,
    string TogetherID,
    Guid HusbandId,
    Guid WifeId,
    string HusbandEmail,
    string WifeEmail,
    string HusbandName,
    string WifeName) : DomainEvent;
