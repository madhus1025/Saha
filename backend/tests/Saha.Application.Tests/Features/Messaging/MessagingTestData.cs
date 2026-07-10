using Saha.Domain.Entities;
using Saha.Domain.Enums;

namespace Saha.Application.Tests.Features.Messaging;

internal static class MessagingTestData
{
    private static int _counter;

    /// <summary>A Complete couple: registered, then joined by its partner. Most messaging tests want this.</summary>
    public static Couple MakeCouple(string togetherId)
    {
        var n = Interlocked.Increment(ref _counter);

        var couple = Couple.Register(
            togetherId: togetherId,
            username: $"husb{n}",
            name: "Test Husband",
            dateOfBirth: new DateTime(1990, 1, 1),
            email: $"husband{n}@test.com",
            phoneNumber: "+11234567890",
            role: PartnerRole.Husband,
            passwordHash: "hash");

        couple.AcceptPartner(
            username: $"wife{n}",
            name: "Test Wife",
            dateOfBirth: new DateTime(1992, 6, 15),
            email: $"wife{n}@test.com",
            phoneNumber: "+19876543210");

        couple.ClearDomainEvents();
        return couple;
    }

    /// <summary>A couple that has registered but whose partner has not yet accepted.</summary>
    public static Couple MakeAwaitingPartnerCouple(string togetherId)
    {
        var n = Interlocked.Increment(ref _counter);

        var couple = Couple.Register(
            togetherId: togetherId,
            username: $"solo{n}",
            name: "Test Registrant",
            dateOfBirth: new DateTime(1990, 1, 1),
            email: $"solo{n}@test.com",
            phoneNumber: "+11234567890",
            role: PartnerRole.Husband,
            passwordHash: "hash");

        couple.ClearDomainEvents();
        return couple;
    }

    public static CoupleConnection AcceptedConnection(Couple a, Couple b)
    {
        var connection = CoupleConnection.CreateRequest(a.Id, b.Id, a.TogetherID, b.TogetherID);
        connection.Accept(a.TogetherID, b.TogetherID);
        return connection;
    }

    public static Conversation MakeGroup(Couple owner, Couple other)
    {
        return Conversation.CreateGroup(
            owner.Id,
            new List<(Guid, Guid, Guid)>
            {
                (owner.Id, owner.RequireHusband().Id, owner.RequireWife().Id),
                (other.Id, other.RequireHusband().Id, other.RequireWife().Id)
            },
            "Group");
    }
}
