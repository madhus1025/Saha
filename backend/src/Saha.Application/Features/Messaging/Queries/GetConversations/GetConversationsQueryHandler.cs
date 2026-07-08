using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Messaging.Common;
using Saha.Domain.Entities;
using Saha.Domain.Enums;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Messaging.Queries.GetConversations;

public sealed class GetConversationsQueryHandler
    : IRequestHandler<GetConversationsQuery, IReadOnlyList<ConversationSummaryDto>>
{
    private readonly IConversationRepository _conversationRepository;
    private readonly ICoupleRepository _coupleRepository;
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserContext _currentUser;

    public GetConversationsQueryHandler(
        IConversationRepository conversationRepository,
        ICoupleRepository coupleRepository,
        IApplicationDbContext db,
        ICurrentUserContext currentUser)
    {
        _conversationRepository = conversationRepository;
        _coupleRepository = coupleRepository;
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<ConversationSummaryDto>> Handle(
        GetConversationsQuery request,
        CancellationToken cancellationToken)
    {
        var coupleId = _currentUser.CoupleId;

        await EnsurePartnerConversationAsync(coupleId, cancellationToken);

        var conversations = await _conversationRepository.GetListForCoupleAsync(coupleId, cancellationToken);

        var partnerIds = conversations.SelectMany(c => c.Participants.Select(p => p.PartnerId));
        var partners = await PartnerLookup.LoadAsync(_db, partnerIds, cancellationToken);

        return conversations
            .Select(c => new ConversationSummaryDto(
                c.Id,
                c.Type.ToString(),
                c.Name,
                c.Participants.Select(p => MessagingMapper.ToParticipantDto(p, partners)).ToList(),
                c.LastMessagePreview,
                c.LastMessageSenderPartnerId,
                c.LastActivityAt,
                c.Type == ConversationType.Partner || c.IsPinnedFor(coupleId),
                c.OwnerCoupleId == coupleId))
            // Partner first, then pinned, then most-recent activity.
            .OrderByDescending(c => c.Type == ConversationType.Partner.ToString())
            .ThenByDescending(c => c.IsPinned)
            .ThenByDescending(c => c.LastActivityAt)
            .ToList();
    }

    /// <summary>Idempotent self-heal so pre-existing couples and any failed post-registration creation get a partner conversation (D2).</summary>
    private async Task EnsurePartnerConversationAsync(Guid coupleId, CancellationToken cancellationToken)
    {
        if (await _conversationRepository.PartnerConversationExistsAsync(coupleId, cancellationToken))
            return;

        var couple = await _coupleRepository.GetByIdAsync(coupleId, cancellationToken);
        if (couple is null)
            throw new NotFoundException("Couple", coupleId);

        var conversation = Conversation.CreatePartner(coupleId, couple.Husband.Id, couple.Wife.Id);
        await _conversationRepository.AddAsync(conversation, cancellationToken);
    }
}
