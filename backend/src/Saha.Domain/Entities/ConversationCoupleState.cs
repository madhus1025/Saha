namespace Saha.Domain.Entities;

/// <summary>Per-couple pin/hide state for a conversation. Both partners of a couple share it.</summary>
public sealed class ConversationCoupleState : Entity
{
    public Guid ConversationId { get; private set; }
    public Guid CoupleId { get; private set; }
    public bool IsPinned { get; private set; }
    public bool IsHidden { get; private set; }

    private ConversationCoupleState() { }

    internal static ConversationCoupleState Create(Guid coupleId, bool isPinned = false)
    {
        return new ConversationCoupleState
        {
            Id = Guid.NewGuid(),
            CoupleId = coupleId,
            IsPinned = isPinned,
            IsHidden = false
        };
    }

    internal void SetPinned(bool pinned)
    {
        IsPinned = pinned;
        UpdateTimestamp();
    }

    internal void SetHidden(bool hidden)
    {
        IsHidden = hidden;
        UpdateTimestamp();
    }
}
