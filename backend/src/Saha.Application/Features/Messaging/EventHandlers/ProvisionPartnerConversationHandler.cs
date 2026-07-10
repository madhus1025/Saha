using MediatR;
using Saha.Domain.Entities;
using Saha.Domain.Events;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Messaging.EventHandlers;

/// <summary>
/// D2 (primary): provisions the couple's single Partner conversation the moment the couple becomes
/// whole — i.e. when the invited partner accepts, not when the couple was first registered, because
/// a registered couple has only one partner. Idempotent — the <c>EnsurePartnerConversationAsync</c>
/// safety net on the conversation list covers pre-existing couples and any post-commit failure here.
/// </summary>
public sealed class ProvisionPartnerConversationHandler : INotificationHandler<CoupleCompletedEvent>
{
    private readonly IConversationRepository _conversationRepository;

    public ProvisionPartnerConversationHandler(IConversationRepository conversationRepository)
    {
        _conversationRepository = conversationRepository;
    }

    public async Task Handle(CoupleCompletedEvent notification, CancellationToken cancellationToken)
    {
        if (await _conversationRepository.PartnerConversationExistsAsync(notification.CoupleId, cancellationToken))
            return;

        var conversation = Conversation.CreatePartner(
            notification.CoupleId, notification.HusbandId, notification.WifeId);

        await _conversationRepository.AddAsync(conversation, cancellationToken);
    }
}
