using MediatR;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Messaging.Common;
using Saha.Domain.Entities;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Messaging.Commands.SendTextMessage;

public sealed class SendTextMessageCommandHandler : IRequestHandler<SendTextMessageCommand, MessageDto>
{
    private readonly IConversationRepository _conversationRepository;
    private readonly IMessageRepository _messageRepository;
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserContext _currentUser;

    public SendTextMessageCommandHandler(
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

    public async Task<MessageDto> Handle(SendTextMessageCommand request, CancellationToken cancellationToken)
    {
        var coupleId = _currentUser.CoupleId;
        var partnerId = _currentUser.PartnerId;

        var conversation = await _conversationRepository.GetParticipatingAsync(
            request.ConversationId, coupleId, cancellationToken);

        var message = Message.CreateText(conversation.Id, partnerId, coupleId, request.Body);
        await _messageRepository.AddAsync(message, cancellationToken);

        conversation.TouchActivity(MessagePreview.For(message), partnerId);
        await _conversationRepository.UpdateAsync(conversation, cancellationToken);

        var partners = await PartnerLookup.LoadAsync(_db, new[] { partnerId }, cancellationToken);
        return MessagingMapper.ToMessageDto(message, partners);
    }
}
