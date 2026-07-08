using MediatR;
using Microsoft.Extensions.Configuration;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Messaging.Common;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Messaging.Commands.DeleteMessage;

public sealed class DeleteMessageCommandHandler : IRequestHandler<DeleteMessageCommand>
{
    private readonly IConversationRepository _conversationRepository;
    private readonly IMessageRepository _messageRepository;
    private readonly IBlobStorageService _blobStorage;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;
    private readonly IConfiguration _configuration;

    public DeleteMessageCommandHandler(
        IConversationRepository conversationRepository,
        IMessageRepository messageRepository,
        IBlobStorageService blobStorage,
        IAuditLogger auditLogger,
        ICurrentUserContext currentUser,
        IConfiguration configuration)
    {
        _conversationRepository = conversationRepository;
        _messageRepository = messageRepository;
        _blobStorage = blobStorage;
        _auditLogger = auditLogger;
        _currentUser = currentUser;
        _configuration = configuration;
    }

    public async Task Handle(DeleteMessageCommand request, CancellationToken cancellationToken)
    {
        var coupleId = _currentUser.CoupleId;
        var partnerId = _currentUser.PartnerId;

        await _conversationRepository.GetParticipatingAsync(request.ConversationId, coupleId, cancellationToken);

        var message = await _messageRepository.GetByIdAsync(request.MessageId, cancellationToken);
        if (message is null || message.ConversationId != request.ConversationId)
            throw new NotFoundException("Message", request.MessageId);

        if (message.SenderPartnerId != partnerId)
            throw new ForbiddenException("Only the sender can delete this message.");

        // Best-effort blob cleanup before the attachment reference is tombstoned.
        var attachmentUrl = message.Attachment?.Url;

        message.Delete(partnerId);
        await _messageRepository.UpdateAsync(message, cancellationToken);

        if (attachmentUrl is not null)
        {
            var container = _configuration["AzureStorage:MessagesContainer"] ?? "messages";
            try
            {
                await _blobStorage.DeleteAsync(attachmentUrl, container, cancellationToken);
            }
            catch
            {
                // Orphaned blob is acceptable (best-effort — future sweep job out of scope).
            }
        }

        await _auditLogger.LogAsync(
            action: "MESSAGE_DELETED",
            isSuccess: true,
            coupleId: coupleId,
            partnerId: partnerId,
            resourceType: "Message",
            resourceId: message.Id,
            ipAddress: _currentUser.IpAddress,
            cancellationToken: cancellationToken);
    }
}
