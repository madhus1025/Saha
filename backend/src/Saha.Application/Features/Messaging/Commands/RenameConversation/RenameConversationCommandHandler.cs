using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Messaging.Common;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Messaging.Commands.RenameConversation;

public sealed class RenameConversationCommandHandler : IRequestHandler<RenameConversationCommand>
{
    private readonly IConversationRepository _conversationRepository;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;

    public RenameConversationCommandHandler(
        IConversationRepository conversationRepository,
        IAuditLogger auditLogger,
        ICurrentUserContext currentUser)
    {
        _conversationRepository = conversationRepository;
        _auditLogger = auditLogger;
        _currentUser = currentUser;
    }

    public async Task Handle(RenameConversationCommand request, CancellationToken cancellationToken)
    {
        var coupleId = _currentUser.CoupleId;

        var conversation = await _conversationRepository.GetParticipatingAsync(
            request.ConversationId, coupleId, cancellationToken);

        // Owner-only → 403 (participant-but-insufficient-privilege, not isolation).
        if (conversation.OwnerCoupleId != coupleId)
            throw new ForbiddenException("Only the owner couple can rename this conversation.");

        conversation.Rename(coupleId, request.Name);
        await _conversationRepository.UpdateAsync(conversation, cancellationToken);

        await _auditLogger.LogAsync(
            action: "CONVERSATION_RENAMED",
            isSuccess: true,
            coupleId: coupleId,
            partnerId: _currentUser.PartnerId,
            resourceType: "Conversation",
            resourceId: conversation.Id,
            ipAddress: _currentUser.IpAddress,
            cancellationToken: cancellationToken);
    }
}
