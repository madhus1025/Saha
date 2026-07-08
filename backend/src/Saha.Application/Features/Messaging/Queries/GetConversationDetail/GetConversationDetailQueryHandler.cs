using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Messaging.Common;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Messaging.Queries.GetConversationDetail;

public sealed class GetConversationDetailQueryHandler
    : IRequestHandler<GetConversationDetailQuery, ConversationDetailDto>
{
    private readonly IConversationRepository _conversationRepository;
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserContext _currentUser;

    public GetConversationDetailQueryHandler(
        IConversationRepository conversationRepository,
        IApplicationDbContext db,
        ICurrentUserContext currentUser)
    {
        _conversationRepository = conversationRepository;
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<ConversationDetailDto> Handle(
        GetConversationDetailQuery request,
        CancellationToken cancellationToken)
    {
        var coupleId = _currentUser.CoupleId;

        var conversation = await _conversationRepository.GetByIdAsync(request.ConversationId, cancellationToken);
        // Non-participant → 404 (never leak existence — D3).
        if (conversation is null || !conversation.HasCoupleParticipant(coupleId))
            throw new NotFoundException("Conversation", request.ConversationId);

        var partners = await PartnerLookup.LoadAsync(
            _db, conversation.Participants.Select(p => p.PartnerId), cancellationToken);

        return new ConversationDetailDto(
            conversation.Id,
            conversation.Type.ToString(),
            conversation.Name,
            conversation.OwnerCoupleId,
            conversation.OwnerCoupleId == coupleId,
            conversation.Participants.Select(p => MessagingMapper.ToParticipantDto(p, partners)).ToList());
    }
}
