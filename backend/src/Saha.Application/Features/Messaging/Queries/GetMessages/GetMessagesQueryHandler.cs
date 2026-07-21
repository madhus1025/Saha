using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Messaging.Common;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Messaging.Queries.GetMessages;

public sealed class GetMessagesQueryHandler : IRequestHandler<GetMessagesQuery, MessagePageDto>
{
    private const int MaxTake = 100;

    private readonly IConversationRepository _conversationRepository;
    private readonly IMessageRepository _messageRepository;
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserContext _currentUser;

    public GetMessagesQueryHandler(
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

    public async Task<MessagePageDto> Handle(GetMessagesQuery request, CancellationToken cancellationToken)
    {
        var coupleId = _currentUser.CoupleId;

        var conversation = await _conversationRepository.GetByIdAsync(request.ConversationId, cancellationToken);
        if (conversation is null || !conversation.HasCoupleParticipant(coupleId))
            throw new NotFoundException("Conversation", request.ConversationId);

        var take = Math.Clamp(request.Take, 1, MaxTake);
        long? beforeTicks = null;
        Guid? beforeId = null;

        // "No cursor" and "a cursor we cannot read" are different things. Treating the second as
        // the first silently hands back page one, so an infinite-scroll client re-appends messages
        // it already holds and never reaches the end of the history.
        if (!string.IsNullOrWhiteSpace(request.Before))
        {
            if (!MessageCursor.TryDecode(request.Before, out var ticks, out var id))
            {
                throw new ApplicationValidationException(new Dictionary<string, string[]>
                {
                    ["before"] = ["The pagination cursor is not valid."],
                });
            }

            beforeTicks = ticks;
            beforeId = id;
        }

        var page = await _messageRepository.GetPageAsync(
            request.ConversationId, beforeTicks, beforeId, take, cancellationToken);

        var partners = await PartnerLookup.LoadAsync(
            _db, page.Select(m => m.SenderPartnerId), cancellationToken);

        var items = page.Select(m => MessagingMapper.ToMessageDto(m, partners)).ToList();

        // A full page implies there may be more; hand back a cursor at the oldest item.
        string? nextCursor = null;
        if (page.Count == take && page.Count > 0)
        {
            var last = page[^1];
            nextCursor = MessageCursor.Encode(last.CreatedAt, last.Id);
        }

        return new MessagePageDto(items, nextCursor);
    }
}
