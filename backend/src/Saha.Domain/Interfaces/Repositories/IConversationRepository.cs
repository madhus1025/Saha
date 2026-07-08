using Saha.Domain.Entities;

namespace Saha.Domain.Interfaces.Repositories;

public interface IConversationRepository
{
    /// <summary>Loads a conversation with its participants and per-couple states.</summary>
    Task<Conversation?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Conversations the couple participates in and has not hidden, with participants + states.</summary>
    Task<IReadOnlyList<Conversation>> GetListForCoupleAsync(Guid coupleId, CancellationToken cancellationToken = default);

    Task<bool> PartnerConversationExistsAsync(Guid coupleId, CancellationToken cancellationToken = default);

    Task AddAsync(Conversation conversation, CancellationToken cancellationToken = default);

    Task UpdateAsync(Conversation conversation, CancellationToken cancellationToken = default);
}
