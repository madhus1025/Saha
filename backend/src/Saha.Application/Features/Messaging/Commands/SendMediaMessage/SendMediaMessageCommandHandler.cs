using MediatR;
using Microsoft.Extensions.Configuration;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Messaging.Common;
using Saha.Domain.Entities;
using Saha.Domain.Enums;
using Saha.Domain.Exceptions;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Messaging.Commands.SendMediaMessage;

public sealed class SendMediaMessageCommandHandler : IRequestHandler<SendMediaMessageCommand, MessageDto>
{
    private const long MaxImageBytes = 10L * 1024 * 1024; // 10 MB
    private const long MaxVideoBytes = 50L * 1024 * 1024; // 50 MB

    private static readonly IReadOnlySet<string> ImageTypes =
        new HashSet<string> { "image/jpeg", "image/png", "image/webp", "image/gif" };
    private static readonly IReadOnlySet<string> VideoTypes =
        new HashSet<string> { "video/mp4", "video/webm", "video/quicktime" };

    private readonly IConversationRepository _conversationRepository;
    private readonly IMessageRepository _messageRepository;
    private readonly IBlobStorageService _blobStorage;
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserContext _currentUser;
    private readonly IConfiguration _configuration;

    public SendMediaMessageCommandHandler(
        IConversationRepository conversationRepository,
        IMessageRepository messageRepository,
        IBlobStorageService blobStorage,
        IApplicationDbContext db,
        ICurrentUserContext currentUser,
        IConfiguration configuration)
    {
        _conversationRepository = conversationRepository;
        _messageRepository = messageRepository;
        _blobStorage = blobStorage;
        _db = db;
        _currentUser = currentUser;
        _configuration = configuration;
    }

    public async Task<MessageDto> Handle(SendMediaMessageCommand request, CancellationToken cancellationToken)
    {
        var coupleId = _currentUser.CoupleId;
        var partnerId = _currentUser.PartnerId;

        var conversation = await _conversationRepository.GetParticipatingAsync(
            request.ConversationId, coupleId, cancellationToken);

        var contentType = (request.ContentType ?? string.Empty).ToLowerInvariant();
        var mediaType = ResolveMediaType(contentType, request.SizeBytes);

        var container = _configuration["AzureStorage:MessagesContainer"] ?? "messages";
        var extension = Path.GetExtension(request.FileName);
        var blobName = $"{coupleId}/{conversation.Id}/{Guid.NewGuid()}{extension}";

        var url = await _blobStorage.UploadAsync(
            request.FileStream, blobName, contentType, container, cancellationToken);

        var attachment = MessageAttachment.Create(url, contentType, request.FileName, request.SizeBytes);
        var message = Message.CreateMedia(conversation.Id, partnerId, coupleId, mediaType, request.Caption, attachment);
        await _messageRepository.AddAsync(message, cancellationToken);

        conversation.TouchActivity(MessagePreview.For(message), partnerId);
        await _conversationRepository.UpdateAsync(conversation, cancellationToken);

        var partners = await PartnerLookup.LoadAsync(_db, new[] { partnerId }, cancellationToken);
        return MessagingMapper.ToMessageDto(message, partners);
    }

    private static MessageContentType ResolveMediaType(string contentType, long sizeBytes)
    {
        if (ImageTypes.Contains(contentType))
        {
            if (sizeBytes > MaxImageBytes)
                throw new DomainException("FILE_TOO_LARGE", "Images cannot exceed 10 MB.");
            return MessageContentType.Image;
        }

        if (VideoTypes.Contains(contentType))
        {
            if (sizeBytes > MaxVideoBytes)
                throw new DomainException("FILE_TOO_LARGE", "Videos cannot exceed 50 MB.");
            return MessageContentType.Video;
        }

        throw new DomainException("UNSUPPORTED_MEDIA_TYPE",
            "Only JPEG, PNG, WebP, GIF images and MP4, WebM, QuickTime videos are supported.");
    }
}
