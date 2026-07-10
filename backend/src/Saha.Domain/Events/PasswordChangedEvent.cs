namespace Saha.Domain.Events;

/// <summary>
/// Carries the addresses of the partners that actually exist — one while the couple is awaiting a
/// partner, two once it is complete.
/// </summary>
public sealed record PasswordChangedEvent(
    Guid CoupleId,
    string TogetherID,
    IReadOnlyList<string> Emails) : DomainEvent;
