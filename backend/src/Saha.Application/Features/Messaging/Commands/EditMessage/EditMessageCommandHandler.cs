using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Messaging.Common;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Messaging.Commands.EditMessage;

public sealed class EditMessageCommandHandler : IRequestHandler<EditMessageCommand, MessageDto>
{
    private readonly IConversationRepository _conversationRepository;
    private readonly IMessageRepository _messageRepository;
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserContext _currentUser;

    public EditMessageCommandHandler(
        IConversationRepository conversationRepository,
        IMessageRepository messageRepository,
        IApplicationDbContext db,
        ICurrentUserContext currentUser)
    {
        _conversationRepository = conversationRepository;
        _messageRepository = messageRepository;
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<MessageDto> Handle(EditMessageCommand request, CancellationToken cancellationToken)
    {
        var coupleId = _currentUser.CoupleId;
        var partnerId = _currentUser.PartnerId;

        // Couple must participate (else 404 — isolation).
        await _conversationRepository.GetParticipatingAsync(request.ConversationId, coupleId, cancellationToken);

        var message = await _messageRepository.GetByIdAsync(request.MessageId, cancellationToken);
        if (message is null || message.ConversationId != request.ConversationId)
            throw new NotFoundException("Message", request.MessageId);

        // Sender-only → 403.
        if (message.SenderPartnerId != partnerId)
            throw new ForbiddenException("Only the sender can edit this message.");

        message.Edit(partnerId, request.Body);
        await _messageRepository.UpdateAsync(message, cancellationToken);

        var partners = await PartnerLookup.LoadAsync(_db, new[] { message.SenderPartnerId }, cancellationToken);
        return MessagingMapper.ToMessageDto(message, partners);
    }
}
