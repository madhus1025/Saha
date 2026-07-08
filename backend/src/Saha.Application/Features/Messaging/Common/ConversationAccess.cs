using Saha.Application.Common.Exceptions;
using Saha.Domain.Entities;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Messaging.Common;

/// <summary>
/// Shared couple-isolation guard: loads a conversation and returns it only when the acting couple
/// participates; otherwise throws <see cref="NotFoundException"/> (404, never 403 — D3) so the
/// existence of other couples' conversations is never leaked.
/// </summary>
public static class ConversationAccess
{
    public static async Task<Conversation> GetParticipatingAsync(
        this IConversationRepository repository,
        Guid conversationId,
        Guid coupleId,
        CancellationToken cancellationToken)
    {
        var conversation = await repository.GetByIdAsync(conversationId, cancellationToken);
        if (conversation is null || !conversation.HasCoupleParticipant(coupleId))
            throw new NotFoundException("Conversation", conversationId);

        return conversation;
    }
}
