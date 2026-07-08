using Microsoft.EntityFrameworkCore;
using Saha.Domain.Entities;
using Saha.Domain.Enums;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Infrastructure.Persistence.Repositories;

public sealed class ConversationRepository : IConversationRepository
{
    private readonly ApplicationDbContext _context;

    public ConversationRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    // Participants + couple states are AutoInclude'd (see ConversationConfiguration).
    public async Task<Conversation?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        await _context.Conversations.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Conversation>> GetListForCoupleAsync(
        Guid coupleId, CancellationToken cancellationToken = default)
    {
        // Couple participates and has not hidden it. Single query; denormalized last-message fields
        // on Conversation avoid an N+1 "last message" lookup.
        return await _context.Conversations
            .Where(c => c.Participants.Any(p => p.CoupleId == coupleId)
                     && !c.CoupleStates.Any(s => s.CoupleId == coupleId && s.IsHidden))
            .OrderByDescending(c => c.Type == ConversationType.Partner)
            .ThenByDescending(c => c.LastActivityAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> PartnerConversationExistsAsync(
        Guid coupleId, CancellationToken cancellationToken = default) =>
        await _context.Conversations
            .AnyAsync(c => c.Type == ConversationType.Partner && c.PartnerCoupleId == coupleId, cancellationToken);

    public async Task AddAsync(Conversation conversation, CancellationToken cancellationToken = default)
    {
        await _context.Conversations.AddAsync(conversation, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(Conversation conversation, CancellationToken cancellationToken = default)
    {
        _context.Conversations.Update(conversation);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
