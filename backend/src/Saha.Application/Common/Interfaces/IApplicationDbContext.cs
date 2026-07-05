using Microsoft.EntityFrameworkCore;
using Saha.Domain.Entities;

namespace Saha.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Couple> Couples { get; }
    DbSet<Partner> Partners { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<PasswordResetToken> PasswordResetTokens { get; }
    DbSet<CoupleConnection> CoupleConnections { get; }
    DbSet<AuditLog> AuditLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
