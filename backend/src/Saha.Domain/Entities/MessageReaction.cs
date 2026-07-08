namespace Saha.Domain.Entities;

/// <summary>One reaction per (message, partner) — enforced by a unique index.</summary>
public sealed class MessageReaction : Entity
{
    public Guid MessageId { get; private set; }
    public Guid PartnerId { get; private set; }
    public Guid CoupleId { get; private set; }
    public string Emoji { get; private set; } = default!;

    private MessageReaction() { }

    internal static MessageReaction Create(Guid partnerId, Guid coupleId, string emojiToken)
    {
        return new MessageReaction
        {
            Id = Guid.NewGuid(),
            PartnerId = partnerId,
            CoupleId = coupleId,
            Emoji = emojiToken
        };
    }

    internal void ChangeEmoji(string emojiToken)
    {
        Emoji = emojiToken;
        UpdateTimestamp();
    }
}
