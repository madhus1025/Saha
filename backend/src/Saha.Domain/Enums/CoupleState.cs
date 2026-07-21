namespace Saha.Domain.Enums;

/// <summary>
/// Lifecycle of a couple. A couple is created with only the registrant present and becomes
/// <see cref="Complete"/> exactly once, when the invited partner accepts. The transition is irreversible.
/// </summary>
public enum CoupleState
{
    AwaitingPartner = 0,
    Complete = 1
}
