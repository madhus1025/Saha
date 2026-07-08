using MediatR;
using Microsoft.EntityFrameworkCore;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Entities;
using Saha.Infrastructure.Persistence.Interceptors;

namespace Saha.Infrastructure.Persistence;

public sealed class ApplicationDbContext : DbContext, IApplicationDbContext
{
    private readonly IMediator _mediator;
    private readonly AuditableEntityInterceptor _auditableInterceptor;
    private readonly DomainEventDispatchInterceptor _domainEventInterceptor;

    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options,
        IMediator mediator,
        AuditableEntityInterceptor auditableInterceptor,
        DomainEventDispatchInterceptor domainEventInterceptor)
        : base(options)
    {
        _mediator = mediator;
        _auditableInterceptor = auditableInterceptor;
        _domainEventInterceptor = domainEventInterceptor;
    }

    public DbSet<Couple> Couples => Set<Couple>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<CoupleConnection> CoupleConnections => Set<CoupleConnection>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<ConversationParticipant> ConversationParticipants => Set<ConversationParticipant>();
    public DbSet<ConversationCoupleState> ConversationCoupleStates => Set<ConversationCoupleState>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<MessageAttachment> MessageAttachments => Set<MessageAttachment>();
    public DbSet<MessageReaction> MessageReactions => Set<MessageReaction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.AddInterceptors(_auditableInterceptor, _domainEventInterceptor);
    }
}
