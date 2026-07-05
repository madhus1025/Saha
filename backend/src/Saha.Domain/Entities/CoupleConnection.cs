using Saha.Domain.Enums;
using Saha.Domain.Events;
using Saha.Domain.Exceptions;

namespace Saha.Domain.Entities;

public sealed class CoupleConnection : AggregateRoot
{
    public Guid CoupleAId { get; private set; }
    public Guid CoupleBId { get; private set; }
    public ConnectionRequestStatus Status { get; private set; }
    public Guid InitiatedByCoupleId { get; private set; }
    public DateTime? AcceptedAt { get; private set; }
    public DateTime? RejectedAt { get; private set; }

    private CoupleConnection() { }

    public static CoupleConnection CreateRequest(
        Guid requesterCoupleId,
        Guid targetCoupleId,
        string requesterTogetherID,
        string targetTogetherID)
    {
        if (requesterCoupleId == targetCoupleId)
            throw new DomainException("SELF_CONNECTION", "A couple cannot connect with itself.");

        var connection = new CoupleConnection
        {
            Id = Guid.NewGuid(),
            CoupleAId = requesterCoupleId,
            CoupleBId = targetCoupleId,
            InitiatedByCoupleId = requesterCoupleId,
            Status = ConnectionRequestStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        connection.RaiseDomainEvent(new ConnectionRequestSentEvent(
            connection.Id,
            requesterCoupleId,
            targetCoupleId,
            requesterTogetherID,
            targetTogetherID));

        return connection;
    }

    public void Accept(string coupleATogetherID, string coupleBTogetherID)
    {
        if (Status != ConnectionRequestStatus.Pending)
            throw new DomainException("INVALID_STATUS", "Only pending requests can be accepted.");

        Status = ConnectionRequestStatus.Accepted;
        AcceptedAt = DateTime.UtcNow;
        UpdateTimestamp();

        RaiseDomainEvent(new ConnectionAcceptedEvent(Id, CoupleAId, CoupleBId, coupleATogetherID, coupleBTogetherID));
    }

    public void Reject()
    {
        if (Status != ConnectionRequestStatus.Pending)
            throw new DomainException("INVALID_STATUS", "Only pending requests can be rejected.");

        Status = ConnectionRequestStatus.Rejected;
        RejectedAt = DateTime.UtcNow;
        UpdateTimestamp();
    }

    public bool InvolvesCouple(Guid coupleId) =>
        CoupleAId == coupleId || CoupleBId == coupleId;

    public bool IsAccepted => Status == ConnectionRequestStatus.Accepted;
}
