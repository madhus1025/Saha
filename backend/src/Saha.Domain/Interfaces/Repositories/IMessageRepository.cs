using Saha.Domain.Entities;

namespace Saha.Domain.Interfaces.Repositories;

public interface IMessageRepository
{
    /// <summary>Loads a message including its attachment and reactions.</summary>
    Task<Message?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Newest-first page of messages for a conversation. When <paramref name="beforeTicks"/> is set,
    /// only messages strictly older than that cursor are returned. Returns <paramref name="take"/> + 1
    /// is NOT implied — callers use the returned count to decide the next cursor.
    /// </summary>
    Task<IReadOnlyList<Message>> GetPageAsync(
        Guid conversationId,
        long? beforeTicks,
        Guid? beforeId,
        int take,
        CancellationToken cancellationToken = default);

    Task AddAsync(Message message, CancellationToken cancellationToken = default);

    Task UpdateAsync(Message message, CancellationToken cancellationToken = default);
}
