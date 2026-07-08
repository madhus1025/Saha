using Saha.Domain.Enums;
using Saha.Domain.Events;
using Saha.Domain.Exceptions;
using Saha.Domain.ValueObjects;

namespace Saha.Domain.Entities;

public sealed class Conversation : AggregateRoot
{
    public ConversationType Type { get; private set; }
    public string? Name { get; private set; }
    public Guid? OwnerCoupleId { get; private set; }

    /// <summary>Denormalized owning couple for Partner conversations only (null for Group);
    /// backs a filtered unique index that guarantees exactly one Partner conversation per couple (FR-1).</summary>
    public Guid? PartnerCoupleId { get; private set; }
    public DateTime LastActivityAt { get; private set; }
    public string? LastMessagePreview { get; private set; }
    public Guid? LastMessageSenderPartnerId { get; private set; }

    private readonly List<ConversationParticipant> _participants = [];
    private readonly List<ConversationCoupleState> _coupleStates = [];

    public IReadOnlyList<ConversationParticipant> Participants => _participants.AsReadOnly();
    public IReadOnlyList<ConversationCoupleState> CoupleStates => _coupleStates.AsReadOnly();

    private Conversation() { }

    public static Conversation CreatePartner(Guid coupleId, Guid husbandId, Guid wifeId)
    {
        var conversation = new Conversation
        {
            Id = Guid.NewGuid(),
            Type = ConversationType.Partner,
            Name = null,
            OwnerCoupleId = null,
            PartnerCoupleId = coupleId,
            LastActivityAt = DateTime.UtcNow
        };

        conversation._participants.Add(ConversationParticipant.Create(coupleId, husbandId, PartnerRole.Husband));
        conversation._participants.Add(ConversationParticipant.Create(coupleId, wifeId, PartnerRole.Wife));
        // Partner conversation is always pinned first and its state is immutable.
        conversation._coupleStates.Add(ConversationCoupleState.Create(coupleId, isPinned: true));

        conversation.RaiseDomainEvent(new PartnerConversationCreatedEvent(conversation.Id, coupleId));
        return conversation;
    }

    public static Conversation CreateGroup(
        Guid ownerCoupleId,
        IReadOnlyList<(Guid coupleId, Guid husbandId, Guid wifeId)> couples,
        string name)
    {
        if (couples is null || couples.Count < 2)
            throw new DomainException("GROUP_NEEDS_TWO_COUPLES", "A group conversation needs at least two couples.");

        if (couples.All(c => c.coupleId != ownerCoupleId))
            throw new DomainException("OWNER_NOT_PARTICIPANT", "The owner couple must be a participant.");

        var validatedName = ConversationName.Create(name);

        var conversation = new Conversation
        {
            Id = Guid.NewGuid(),
            Type = ConversationType.Group,
            Name = validatedName.Value,
            OwnerCoupleId = ownerCoupleId,
            LastActivityAt = DateTime.UtcNow
        };

        foreach (var (coupleId, husbandId, wifeId) in couples)
            conversation.AddCoupleInternal(coupleId, husbandId, wifeId);

        conversation.RaiseDomainEvent(new GroupConversationCreatedEvent(conversation.Id, ownerCoupleId));
        return conversation;
    }

    public void AddCouple(Guid actingCoupleId, Guid newCoupleId, Guid husbandId, Guid wifeId)
    {
        EnsureGroup();

        if (!HasCoupleParticipant(actingCoupleId))
            throw new DomainException("NOT_PARTICIPANT", "Only a participant couple can add another couple.");

        if (HasCoupleParticipant(newCoupleId))
            throw new DomainException("COUPLE_ALREADY_IN_CONVERSATION", "That couple is already in this conversation.");

        AddCoupleInternal(newCoupleId, husbandId, wifeId);
        UpdateTimestamp();

        RaiseDomainEvent(new CoupleAddedToConversationEvent(Id, newCoupleId));
    }

    public void Rename(Guid actingCoupleId, string newName)
    {
        EnsureGroup();

        if (actingCoupleId != OwnerCoupleId)
            throw new DomainException("NOT_OWNER", "Only the owner couple can rename this conversation.");

        Name = ConversationName.Create(newName).Value;
        UpdateTimestamp();

        RaiseDomainEvent(new ConversationRenamedEvent(Id, Name));
    }

    public void Pin(Guid coupleId) => SetPinned(coupleId, true);

    public void Unpin(Guid coupleId) => SetPinned(coupleId, false);

    public void HideForCouple(Guid coupleId)
    {
        if (Type != ConversationType.Group)
            throw new DomainException("CANNOT_HIDE_PARTNER", "The partner conversation cannot be hidden.");

        var state = RequireCoupleState(coupleId);
        state.SetHidden(true);
        UpdateTimestamp();
    }

    /// <summary>Updates denormalized last-message fields and un-hides the conversation for all couples (D4).</summary>
    public void TouchActivity(string preview, Guid senderPartnerId)
    {
        LastActivityAt = DateTime.UtcNow;
        LastMessagePreview = Truncate(preview, 200);
        LastMessageSenderPartnerId = senderPartnerId;

        foreach (var state in _coupleStates)
            state.SetHidden(false);

        UpdateTimestamp();
    }

    public bool HasCoupleParticipant(Guid coupleId) => _participants.Any(p => p.CoupleId == coupleId);

    public bool HasPartnerParticipant(Guid partnerId) => _participants.Any(p => p.PartnerId == partnerId);

    public bool IsHiddenFor(Guid coupleId) =>
        _coupleStates.FirstOrDefault(s => s.CoupleId == coupleId)?.IsHidden ?? false;

    public bool IsPinnedFor(Guid coupleId) =>
        _coupleStates.FirstOrDefault(s => s.CoupleId == coupleId)?.IsPinned ?? false;

    private void SetPinned(Guid coupleId, bool pinned)
    {
        if (Type != ConversationType.Group)
            throw new DomainException("CANNOT_MODIFY_PARTNER_PIN", "The partner conversation's pin state cannot be changed.");

        RequireCoupleState(coupleId).SetPinned(pinned);
        UpdateTimestamp();
    }

    private void AddCoupleInternal(Guid coupleId, Guid husbandId, Guid wifeId)
    {
        _participants.Add(ConversationParticipant.Create(coupleId, husbandId, PartnerRole.Husband));
        _participants.Add(ConversationParticipant.Create(coupleId, wifeId, PartnerRole.Wife));
        _coupleStates.Add(ConversationCoupleState.Create(coupleId));
    }

    private ConversationCoupleState RequireCoupleState(Guid coupleId)
    {
        var state = _coupleStates.FirstOrDefault(s => s.CoupleId == coupleId);
        if (state is null)
            throw new DomainException("NOT_PARTICIPANT", "That couple is not a participant in this conversation.");
        return state;
    }

    private void EnsureGroup()
    {
        if (Type != ConversationType.Group)
            throw new DomainException("NOT_A_GROUP", "This operation is only valid on group conversations.");
    }

    private static string Truncate(string value, int max) =>
        string.IsNullOrEmpty(value) || value.Length <= max ? value : value[..max];
}
