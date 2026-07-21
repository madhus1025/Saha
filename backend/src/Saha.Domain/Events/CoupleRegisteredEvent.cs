using Saha.Domain.Enums;

namespace Saha.Domain.Events;

/// <summary>
/// Raised when a couple is created with only the registrant present. The couple is not yet usable —
/// do not provision anything that needs two partners. Wait for <see cref="CoupleCompletedEvent"/>.
/// </summary>
public sealed record CoupleRegisteredEvent(
    Guid CoupleId,
    string TogetherID,
    string RegistrantEmail,
    string RegistrantName,
    PartnerRole RegistrantRole) : DomainEvent;
