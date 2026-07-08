using Saha.Domain.Enums;

namespace Saha.Domain.Entities;

/// <summary>One row per individual partner participating in a conversation.</summary>
public sealed class ConversationParticipant : Entity
{
    public Guid ConversationId { get; private set; }
    public Guid CoupleId { get; private set; }
    public Guid PartnerId { get; private set; }
    public PartnerRole Role { get; private set; }
    public DateTime JoinedAt { get; private set; }

    private ConversationParticipant() { }

    internal static ConversationParticipant Create(Guid coupleId, Guid partnerId, PartnerRole role)
    {
        return new ConversationParticipant
        {
            Id = Guid.NewGuid(),
            CoupleId = coupleId,
            PartnerId = partnerId,
            Role = role,
            JoinedAt = DateTime.UtcNow
        };
    }
}
