using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Messaging.Common;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Messaging.Commands.ReactToMessage;

public sealed class ReactToMessageCommandHandler : IRequestHandler<ReactToMessageCommand>
{
    private readonly IConversationRepository _conversationRepository;
    private readonly IMessageRepository _messageRepository;
    private readonly ICurrentUserContext _currentUser;

    public ReactToMessageCommandHandler(
        IConversationRepository conversationRepository,
        IMessageRepository messageRepository,
        ICurrentUserContext currentUser)
    {
        _conversationRepository = conversationRepository;
        _messageRepository = messageRepository;
        _currentUser = currentUser;
    }

    public async Task Handle(ReactToMessageCommand request, CancellationToken cancellationToken)
    {
        var coupleId = _currentUser.CoupleId;
        var partnerId = _currentUser.PartnerId;

        await _conversationRepository.GetParticipatingAsync(request.ConversationId, coupleId, cancellationToken);

        var message = await _messageRepository.GetByIdAsync(request.MessageId, cancellationToken);
        if (message is null || message.ConversationId != request.ConversationId)
            throw new NotFoundException("Message", request.MessageId);

        message.React(partnerId, coupleId, request.Emoji);
        await _messageRepository.UpdateAsync(message, cancellationToken);
    }
}
