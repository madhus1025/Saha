using Saha.Domain.Entities;

namespace Saha.Application.Features.Messaging.Common;

/// <summary>Maps messaging aggregates to their stable, real-time-ready DTOs (FR-26).</summary>
public static class MessagingMapper
{
    public static ParticipantDto ToParticipantDto(ConversationParticipant participant, IReadOnlyDictionary<Guid, Partner> partners)
    {
        partners.TryGetValue(participant.PartnerId, out var partner);
        return new ParticipantDto(
            participant.PartnerId,
            participant.CoupleId,
            partner?.Name ?? "Unknown",
            participant.Role.ToString(),
            partner?.ProfilePictureUrl);
    }

    public static MessageDto ToMessageDto(Message message, IReadOnlyDictionary<Guid, Partner> partners)
    {
        partners.TryGetValue(message.SenderPartnerId, out var sender);

        var attachment = message.Attachment is null
            ? null
            : new MessageAttachmentDto(
                message.Attachment.Url,
                message.Attachment.ContentType,
                message.Attachment.FileName,
                message.Attachment.SizeBytes);

        var reactions = message.Reactions
            .GroupBy(r => r.Emoji)
            .Select(g => new ReactionSummaryDto(g.Key, g.Count(), g.Select(r => r.PartnerId).ToList()))
            .OrderByDescending(r => r.Count)
            .ToList();

        return new MessageDto(
            message.Id,
            message.ConversationId,
            message.SenderPartnerId,
            sender?.Name ?? "Unknown",
            sender?.Role.ToString() ?? string.Empty,
            sender?.ProfilePictureUrl,
            message.ContentType.ToString(),
            message.Body,
            attachment,
            message.IsEdited,
            message.EditedAt,
            message.IsDeleted,
            message.CreatedAt,
            reactions);
    }
}
