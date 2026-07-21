using Microsoft.EntityFrameworkCore;
using Saha.Domain.Entities;

namespace Saha.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Couple> Couples { get; }
    DbSet<Partner> Partners { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<PasswordResetToken> PasswordResetTokens { get; }
    DbSet<CoupleInvitation> CoupleInvitations { get; }
    DbSet<CoupleConnection> CoupleConnections { get; }
    DbSet<AuditLog> AuditLogs { get; }
    DbSet<Conversation> Conversations { get; }
    DbSet<ConversationParticipant> ConversationParticipants { get; }
    DbSet<ConversationCoupleState> ConversationCoupleStates { get; }
    DbSet<Message> Messages { get; }
    DbSet<MessageAttachment> MessageAttachments { get; }
    DbSet<MessageReaction> MessageReactions { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
