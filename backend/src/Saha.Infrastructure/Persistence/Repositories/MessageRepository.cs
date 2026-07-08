using Microsoft.EntityFrameworkCore;
using Saha.Domain.Entities;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Infrastructure.Persistence.Repositories;

public sealed class MessageRepository : IMessageRepository
{
    private readonly ApplicationDbContext _context;

    public MessageRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    // Attachment + reactions are AutoInclude'd (see MessageConfiguration) — avoids N+1 per page.
    public async Task<Message?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        await _context.Messages.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Message>> GetPageAsync(
        Guid conversationId,
        long? beforeTicks,
        Guid? beforeId,
        int take,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Messages.Where(m => m.ConversationId == conversationId);

        if (beforeTicks.HasValue)
        {
            var before = new DateTime(beforeTicks.Value, DateTimeKind.Utc);
            query = query.Where(m => m.CreatedAt < before);
        }

        return await query
            .OrderByDescending(m => m.CreatedAt)
            .ThenByDescending(m => m.Id)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Message message, CancellationToken cancellationToken = default)
    {
        await _context.Messages.AddAsync(message, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(Message message, CancellationToken cancellationToken = default)
    {
        _context.Messages.Update(message);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
