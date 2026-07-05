using Microsoft.EntityFrameworkCore;
using Saha.Domain.Entities;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Infrastructure.Persistence.Repositories;

public sealed class CoupleRepository : ICoupleRepository
{
    private readonly ApplicationDbContext _context;

    public CoupleRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Couple?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        await _context.Couples
            .Include(c => c.Partners)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    public async Task<Couple?> GetByTogetherIDAsync(string togetherID, CancellationToken cancellationToken = default) =>
        await _context.Couples
            .Include(c => c.Partners)
            .FirstOrDefaultAsync(c => c.TogetherID == togetherID.ToUpperInvariant(), cancellationToken);

    public async Task<Couple?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default) =>
        await _context.Couples
            .Include(c => c.Partners)
            .FirstOrDefaultAsync(c =>
                c.Partners.Any(p => p.Username == username.ToLowerInvariant()), cancellationToken);

    public async Task<Couple?> GetByUsernameWithTokensAsync(string username, CancellationToken cancellationToken = default) =>
        await _context.Couples
            .Include(c => c.Partners)
            .Include(c => c.RefreshTokens.Where(rt => !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow))
            .FirstOrDefaultAsync(c =>
                c.Partners.Any(p => p.Username == username.ToLowerInvariant()), cancellationToken);

    public async Task<Couple?> GetByIdWithTokensAsync(Guid id, CancellationToken cancellationToken = default) =>
        await _context.Couples
            .Include(c => c.Partners)
            .Include(c => c.RefreshTokens)
            .Include(c => c.PasswordResetTokens)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    public async Task<Couple?> GetByRefreshTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default)
    {
        var token = await _context.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, cancellationToken);

        if (token is null) return null;

        return await _context.Couples
            .Include(c => c.Partners)
            .Include(c => c.RefreshTokens)
            .FirstOrDefaultAsync(c => c.Id == token.CoupleId, cancellationToken);
    }

    public async Task<bool> ExistsByTogetherIDAsync(string togetherID, CancellationToken cancellationToken = default) =>
        await _context.Couples
            .AnyAsync(c => c.TogetherID == togetherID.ToUpperInvariant(), cancellationToken);

    public async Task<bool> ExistsByUsernameAsync(string username, CancellationToken cancellationToken = default) =>
        await _context.Partners
            .AnyAsync(p => p.Username == username.ToLowerInvariant(), cancellationToken);

    public async Task<IReadOnlyList<Couple>> SearchByTogetherIDAsync(
        string partialTogetherID,
        int limit,
        CancellationToken cancellationToken = default) =>
        await _context.Couples
            .Include(c => c.Partners)
            .Where(c => c.TogetherID.Contains(partialTogetherID) && c.IsActive)
            .Take(limit)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(Couple couple, CancellationToken cancellationToken = default)
    {
        await _context.Couples.AddAsync(couple, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(Couple couple, CancellationToken cancellationToken = default)
    {
        _context.Couples.Update(couple);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
