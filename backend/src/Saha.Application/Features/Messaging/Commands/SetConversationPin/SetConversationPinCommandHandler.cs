using MediatR;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Messaging.Common;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Messaging.Commands.SetConversationPin;

public sealed class SetConversationPinCommandHandler : IRequestHandler<SetConversationPinCommand>
{
    private readonly IConversationRepository _conversationRepository;
    private readonly ICurrentUserContext _currentUser;

    public SetConversationPinCommandHandler(
        IConversationRepository conversationRepository,
        ICurrentUserContext currentUser)
    {
        _conversationRepository = conversationRepository;
        _currentUser = currentUser;
    }

    public async Task Handle(SetConversationPinCommand request, CancellationToken cancellationToken)
    {
        var coupleId = _currentUser.CoupleId;

        var conversation = await _conversationRepository.GetParticipatingAsync(
            request.ConversationId, coupleId, cancellationToken);

        if (request.IsPinned)
            conversation.Pin(coupleId);
        else
            conversation.Unpin(coupleId);

        await _conversationRepository.UpdateAsync(conversation, cancellationToken);
    }
}
