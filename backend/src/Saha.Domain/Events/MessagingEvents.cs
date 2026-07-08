namespace Saha.Domain.Events;

// Conversation lifecycle events.
public sealed record PartnerConversationCreatedEvent(Guid ConversationId, Guid CoupleId) : DomainEvent;

public sealed record GroupConversationCreatedEvent(Guid ConversationId, Guid OwnerCoupleId) : DomainEvent;

public sealed record ConversationRenamedEvent(Guid ConversationId, string NewName) : DomainEvent;

public sealed record CoupleAddedToConversationEvent(Guid ConversationId, Guid NewCoupleId) : DomainEvent;

// Message lifecycle events — the real-time seam (FR-26).
public sealed record MessageSentEvent(Guid MessageId, Guid ConversationId, Guid SenderPartnerId) : DomainEvent;

public sealed record MessageEditedEvent(Guid MessageId, Guid ConversationId) : DomainEvent;

public sealed record MessageDeletedEvent(Guid MessageId, Guid ConversationId) : DomainEvent;

public sealed record MessageReactionChangedEvent(Guid MessageId, Guid ConversationId, Guid PartnerId) : DomainEvent;
