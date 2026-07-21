using Saha.Domain.Entities;
using Saha.Domain.Enums;

namespace Saha.Domain.Tests.TestHelpers;

/// <summary>
/// Builds couples in either lifecycle state. Prefer <see cref="Complete"/> in tests that are not
/// about the lifecycle itself, so they read the same as they did before registration was split.
/// </summary>
public static class CoupleBuilder
{
    public const string DefaultTogetherId = "MADHU-PRIYA";
    public const string DefaultPasswordHash = "hashed_password_123";

    /// <summary>A couple with only the registrant present (state <c>AwaitingPartner</c>).</summary>
    public static Couple AwaitingPartner(
        string togetherId = DefaultTogetherId,
        string username = "madhu",
        string name = "Madhu Kumar",
        string email = "madhu@example.com",
        PartnerRole role = PartnerRole.Husband)
    {
        return Couple.Register(
            togetherId,
            username, name, new DateTime(1990, 5, 15), email, "+911234567890",
            role,
            DefaultPasswordHash);
    }

    /// <summary>A couple with both partners present (state <c>Complete</c>).</summary>
    public static Couple Complete(
        string togetherId = DefaultTogetherId,
        string husbandUsername = "madhu",
        string wifeUsername = "priya",
        string husbandEmail = "madhu@example.com",
        string wifeEmail = "priya@example.com")
    {
        var couple = Couple.Register(
            togetherId,
            husbandUsername, "Madhu Kumar", new DateTime(1990, 5, 15), husbandEmail, "+911234567890",
            PartnerRole.Husband,
            DefaultPasswordHash);

        couple.AcceptPartner(
            wifeUsername, "Priya Kumar", new DateTime(1992, 8, 20), wifeEmail, "+919876543210");

        couple.ClearDomainEvents();
        return couple;
    }
}
