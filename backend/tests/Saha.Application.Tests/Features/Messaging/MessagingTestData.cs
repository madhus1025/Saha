using Saha.Domain.Entities;

namespace Saha.Application.Tests.Features.Messaging;

internal static class MessagingTestData
{
    private static int _counter;

    public static Couple MakeCouple(string togetherId)
    {
        var n = Interlocked.Increment(ref _counter);
        return Couple.Register(
            togetherId: togetherId,
            husbandUsername: $"husb{n}",
            husbandName: "Test Husband",
            husbandDob: new DateTime(1990, 1, 1),
            husbandEmail: $"husband{n}@test.com",
            husbandPhone: "+11234567890",
            wifeUsername: $"wife{n}",
            wifeName: "Test Wife",
            wifeDob: new DateTime(1992, 6, 15),
            wifeEmail: $"wife{n}@test.com",
            wifePhone: "+19876543210",
            passwordHash: "hash");
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
                (owner.Id, owner.Husband.Id, owner.Wife.Id),
                (other.Id, other.Husband.Id, other.Wife.Id)
            },
            "Group");
    }
}
