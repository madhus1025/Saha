using MediatR;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Messaging.Common;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Messaging.Commands.HideConversation;

public sealed class HideConversationCommandHandler : IRequestHandler<HideConversationCommand>
{
    private readonly IConversationRepository _conversationRepository;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;

    public HideConversationCommandHandler(
        IConversationRepository conversationRepository,
        IAuditLogger auditLogger,
        ICurrentUserContext currentUser)
    {
        _conversationRepository = conversationRepository;
        _auditLogger = auditLogger;
        _currentUser = currentUser;
    }

    public async Task Handle(HideConversationCommand request, CancellationToken cancellationToken)
    {
        var coupleId = _currentUser.CoupleId;

        var conversation = await _conversationRepository.GetParticipatingAsync(
            request.ConversationId, coupleId, cancellationToken);

        conversation.HideForCouple(coupleId);
        await _conversationRepository.UpdateAsync(conversation, cancellationToken);

        await _auditLogger.LogAsync(
            action: "CONVERSATION_HIDDEN",
            isSuccess: true,
            coupleId: coupleId,
            partnerId: _currentUser.PartnerId,
            resourceType: "Conversation",
            resourceId: conversation.Id,
            ipAddress: _currentUser.IpAddress,
            cancellationToken: cancellationToken);
    }
}
