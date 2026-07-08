namespace Saha.Application.Features.Messaging.Common;

public sealed record ParticipantDto(
    Guid PartnerId,
    Guid CoupleId,
    string Name,
    string Role,
    string? AvatarUrl);

public sealed record ReactionSummaryDto(
    string Emoji,
    int Count,
    IReadOnlyList<Guid> PartnerIds);

public sealed record MessageAttachmentDto(
    string Url,
    string ContentType,
    string FileName,
    long SizeBytes);

public sealed record MessageDto(
    Guid Id,
    Guid ConversationId,
    Guid SenderPartnerId,
    string SenderName,
    string SenderRole,
    string? SenderAvatarUrl,
    string ContentType,
    string? Body,
    MessageAttachmentDto? Attachment,
    bool IsEdited,
    DateTime? EditedAt,
    bool IsDeleted,
    DateTime CreatedAt,
    IReadOnlyList<ReactionSummaryDto> Reactions);

public sealed record MessagePageDto(
    IReadOnlyList<MessageDto> Items,
    string? NextCursor);

public sealed record ConversationSummaryDto(
    Guid Id,
    string Type,
    string? Name,
    IReadOnlyList<ParticipantDto> Participants,
    string? LastMessagePreview,
    Guid? LastMessageSenderPartnerId,
    DateTime LastActivityAt,
    bool IsPinned,
    bool IsOwner);

public sealed record ConversationDetailDto(
    Guid Id,
    string Type,
    string? Name,
    Guid? OwnerCoupleId,
    bool IsOwner,
    IReadOnlyList<ParticipantDto> Participants);
