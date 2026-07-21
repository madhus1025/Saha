using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Entities;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Messaging.Commands.CreateGroupConversation;

public sealed class CreateGroupConversationCommandHandler
    : IRequestHandler<CreateGroupConversationCommand, CreateGroupConversationResult>
{
    private readonly IConversationRepository _conversationRepository;
    private readonly ICoupleRepository _coupleRepository;
    private readonly IConnectionRepository _connectionRepository;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;

    public CreateGroupConversationCommandHandler(
        IConversationRepository conversationRepository,
        ICoupleRepository coupleRepository,
        IConnectionRepository connectionRepository,
        IAuditLogger auditLogger,
        ICurrentUserContext currentUser)
    {
        _conversationRepository = conversationRepository;
        _coupleRepository = coupleRepository;
        _connectionRepository = connectionRepository;
        _auditLogger = auditLogger;
        _currentUser = currentUser;
    }

    public async Task<CreateGroupConversationResult> Handle(
        CreateGroupConversationCommand request,
        CancellationToken cancellationToken)
    {
        var requesterCoupleId = _currentUser.CoupleId;

        var requester = await _coupleRepository.GetByIdAsync(requesterCoupleId, cancellationToken);
        if (requester is null)
            throw new NotFoundException("Couple", requesterCoupleId);

        if (!requester.IsComplete)
            throw new ConflictException("COUPLE_INCOMPLETE", "Your home is still waiting for a partner.");

        var couples = new List<(Guid, Guid, Guid)>
        {
            (requester.Id, requester.RequireHusband().Id, requester.RequireWife().Id)
        };

        foreach (var targetId in request.TargetCoupleIds.Distinct())
        {
            if (targetId == requesterCoupleId)
                throw new ConflictException("SELF_GROUP", "Cannot create a group with your own couple only.");

            // Connection-gate (A1): acting couple must be Accepted-connected to each target.
            var connection = await _connectionRepository.GetBetweenCouplesAsync(
                requesterCoupleId, targetId, cancellationToken);
            if (connection is null || !connection.IsAccepted)
                throw new ConflictException("NOT_CONNECTED", "You can only start a group with connected couples.");

            var target = await _coupleRepository.GetByIdAsync(targetId, cancellationToken);
            if (target is null)
                throw new NotFoundException("Couple", targetId);

            if (!target.IsComplete)
                throw new ConflictException("COUPLE_INCOMPLETE", "That home is still waiting for a partner.");

            couples.Add((target.Id, target.RequireHusband().Id, target.RequireWife().Id));
        }

        var conversation = Conversation.CreateGroup(requesterCoupleId, couples, request.Name);
        await _conversationRepository.AddAsync(conversation, cancellationToken);

        await _auditLogger.LogAsync(
            action: "GROUP_CONVERSATION_CREATED",
            isSuccess: true,
            coupleId: requesterCoupleId,
            partnerId: _currentUser.PartnerId,
            resourceType: "Conversation",
            resourceId: conversation.Id,
            ipAddress: _currentUser.IpAddress,
            cancellationToken: cancellationToken);

        return new CreateGroupConversationResult(conversation.Id);
    }
}
