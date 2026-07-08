using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Messaging.Common;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Messaging.Commands.AddCoupleToConversation;

public sealed class AddCoupleToConversationCommandHandler : IRequestHandler<AddCoupleToConversationCommand>
{
    private readonly IConversationRepository _conversationRepository;
    private readonly ICoupleRepository _coupleRepository;
    private readonly IConnectionRepository _connectionRepository;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;

    public AddCoupleToConversationCommandHandler(
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

    public async Task Handle(AddCoupleToConversationCommand request, CancellationToken cancellationToken)
    {
        var actingCoupleId = _currentUser.CoupleId;

        var conversation = await _conversationRepository.GetParticipatingAsync(
            request.ConversationId, actingCoupleId, cancellationToken);

        if (conversation.HasCoupleParticipant(request.TargetCoupleId))
            throw new ConflictException("COUPLE_ALREADY_IN_CONVERSATION", "That couple is already in this conversation.");

        // Connection-gate (A1): target must be Accepted-connected to the acting couple.
        var connection = await _connectionRepository.GetBetweenCouplesAsync(
            actingCoupleId, request.TargetCoupleId, cancellationToken);
        if (connection is null || !connection.IsAccepted)
            throw new ConflictException("NOT_CONNECTED", "You can only add couples you are connected with.");

        var target = await _coupleRepository.GetByIdAsync(request.TargetCoupleId, cancellationToken);
        if (target is null)
            throw new NotFoundException("Couple", request.TargetCoupleId);

        conversation.AddCouple(actingCoupleId, target.Id, target.Husband.Id, target.Wife.Id);
        await _conversationRepository.UpdateAsync(conversation, cancellationToken);

        await _auditLogger.LogAsync(
            action: "COUPLE_ADDED_TO_CONVERSATION",
            isSuccess: true,
            coupleId: actingCoupleId,
            partnerId: _currentUser.PartnerId,
            resourceType: "Conversation",
            resourceId: conversation.Id,
            details: $"Added couple {target.Id}",
            ipAddress: _currentUser.IpAddress,
            cancellationToken: cancellationToken);
    }
}
