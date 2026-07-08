using MediatR;
using Saha.Domain.Entities;
using Saha.Domain.Events;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Messaging.EventHandlers;

/// <summary>
/// D2 (primary): provisions the couple's single Partner conversation immediately after registration.
/// Idempotent — the <c>EnsurePartnerConversationAsync</c> safety net on the conversation list covers
/// pre-existing couples and any post-commit failure here.
/// </summary>
public sealed class ProvisionPartnerConversationHandler : INotificationHandler<CoupleRegisteredEvent>
{
    private readonly IConversationRepository _conversationRepository;
    private readonly ICoupleRepository _coupleRepository;

    public ProvisionPartnerConversationHandler(
        IConversationRepository conversationRepository,
        ICoupleRepository coupleRepository)
    {
        _conversationRepository = conversationRepository;
        _coupleRepository = coupleRepository;
    }

    public async Task Handle(CoupleRegisteredEvent notification, CancellationToken cancellationToken)
    {
        if (await _conversationRepository.PartnerConversationExistsAsync(notification.CoupleId, cancellationToken))
            return;

        var couple = await _coupleRepository.GetByIdAsync(notification.CoupleId, cancellationToken);
        if (couple is null)
            return;

        var conversation = Conversation.CreatePartner(notification.CoupleId, couple.Husband.Id, couple.Wife.Id);
        await _conversationRepository.AddAsync(conversation, cancellationToken);
    }
}
