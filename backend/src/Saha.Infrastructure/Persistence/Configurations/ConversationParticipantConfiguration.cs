using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Saha.Domain.Entities;

namespace Saha.Infrastructure.Persistence.Configurations;

public sealed class ConversationParticipantConfiguration : IEntityTypeConfiguration<ConversationParticipant>
{
    public void Configure(EntityTypeBuilder<ConversationParticipant> builder)
    {
        builder.ToTable("ConversationParticipants");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).ValueGeneratedNever();

        builder.Property(p => p.ConversationId).IsRequired();
        builder.Property(p => p.CoupleId).IsRequired();
        builder.Property(p => p.PartnerId).IsRequired();
        builder.Property(p => p.Role)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);
        builder.Property(p => p.JoinedAt).IsRequired();

        builder.HasIndex(p => new { p.ConversationId, p.PartnerId })
            .IsUnique()
            .HasDatabaseName("IX_ConversationParticipants_Conversation_Partner");
        builder.HasIndex(p => p.PartnerId).HasDatabaseName("IX_ConversationParticipants_PartnerId");
        builder.HasIndex(p => p.CoupleId).HasDatabaseName("IX_ConversationParticipants_CoupleId");
    }
}
