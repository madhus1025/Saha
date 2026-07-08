using Saha.Domain.Enums;
using Saha.Domain.Events;
using Saha.Domain.Exceptions;
using Saha.Domain.ValueObjects;

namespace Saha.Domain.Entities;

public sealed class Message : AggregateRoot
{
    public const int MaxBodyLength = 4000;

    public Guid ConversationId { get; private set; }
    public Guid SenderPartnerId { get; private set; }
    public Guid SenderCoupleId { get; private set; }
    public MessageContentType ContentType { get; private set; }
    public string? Body { get; private set; }
    public bool IsEdited { get; private set; }
    public DateTime? EditedAt { get; private set; }
    public bool IsDeleted { get; private set; }
    public DateTime? DeletedAt { get; private set; }

    public MessageAttachment? Attachment { get; private set; }

    private readonly List<MessageReaction> _reactions = [];
    public IReadOnlyList<MessageReaction> Reactions => _reactions.AsReadOnly();

    private Message() { }

    public static Message CreateText(Guid conversationId, Guid senderPartnerId, Guid senderCoupleId, string body)
    {
        var message = new Message
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            SenderPartnerId = senderPartnerId,
            SenderCoupleId = senderCoupleId,
            ContentType = MessageContentType.Text,
            Body = ValidateBody(body)
        };

        message.RaiseDomainEvent(new MessageSentEvent(message.Id, conversationId, senderPartnerId));
        return message;
    }

    public static Message CreateMedia(
        Guid conversationId,
        Guid senderPartnerId,
        Guid senderCoupleId,
        MessageContentType type,
        string? caption,
        MessageAttachment attachment)
    {
        if (type is not (MessageContentType.Image or MessageContentType.Video))
            throw new DomainException("INVALID_MEDIA_TYPE", "Media messages must be an image or a video.");

        if (attachment is null)
            throw new DomainException("MISSING_ATTACHMENT", "A media message requires an attachment.");

        var message = new Message
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            SenderPartnerId = senderPartnerId,
            SenderCoupleId = senderCoupleId,
            ContentType = type,
            Body = string.IsNullOrWhiteSpace(caption) ? null : ValidateBody(caption),
            Attachment = attachment
        };

        message.RaiseDomainEvent(new MessageSentEvent(message.Id, conversationId, senderPartnerId));
        return message;
    }

    public void Edit(Guid partnerId, string newBody)
    {
        EnsureSender(partnerId);

        if (IsDeleted)
            throw new DomainException("MESSAGE_DELETED", "A deleted message cannot be edited.");

        Body = ValidateBody(newBody);
        IsEdited = true;
        EditedAt = DateTime.UtcNow;
        UpdateTimestamp();

        RaiseDomainEvent(new MessageEditedEvent(Id, ConversationId));
    }

    public void Delete(Guid partnerId)
    {
        EnsureSender(partnerId);

        IsDeleted = true;
        DeletedAt = DateTime.UtcNow;
        Body = null;
        Attachment = null;
        _reactions.Clear();
        UpdateTimestamp();

        RaiseDomainEvent(new MessageDeletedEvent(Id, ConversationId));
    }

    public void React(Guid partnerId, Guid coupleId, string emojiToken)
    {
        if (IsDeleted)
            throw new DomainException("MESSAGE_DELETED", "A deleted message cannot be reacted to.");

        var validated = ReactionEmoji.Create(emojiToken);

        var existing = _reactions.FirstOrDefault(r => r.PartnerId == partnerId);
        if (existing is not null)
            existing.ChangeEmoji(validated.Value);
        else
            _reactions.Add(MessageReaction.Create(partnerId, coupleId, validated.Value));

        UpdateTimestamp();
        RaiseDomainEvent(new MessageReactionChangedEvent(Id, ConversationId, partnerId));
    }

    public void RemoveReaction(Guid partnerId)
    {
        var existing = _reactions.FirstOrDefault(r => r.PartnerId == partnerId);
        if (existing is null) return;

        _reactions.Remove(existing);
        UpdateTimestamp();
        RaiseDomainEvent(new MessageReactionChangedEvent(Id, ConversationId, partnerId));
    }

    private void EnsureSender(Guid partnerId)
    {
        if (partnerId != SenderPartnerId)
            throw new DomainException("NOT_MESSAGE_SENDER", "Only the sender can modify this message.");
    }

    private static string ValidateBody(string body)
    {
        if (string.IsNullOrWhiteSpace(body))
            throw new DomainException("INVALID_MESSAGE_BODY", "Message body cannot be empty.");

        if (body.Length > MaxBodyLength)
            throw new DomainException("INVALID_MESSAGE_BODY", $"Message body cannot exceed {MaxBodyLength} characters.");

        return body;
    }
}
