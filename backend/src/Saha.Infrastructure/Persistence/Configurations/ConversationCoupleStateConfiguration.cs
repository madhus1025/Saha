using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Saha.Domain.Entities;

namespace Saha.Infrastructure.Persistence.Configurations;

public sealed class ConversationCoupleStateConfiguration : IEntityTypeConfiguration<ConversationCoupleState>
{
    public void Configure(EntityTypeBuilder<ConversationCoupleState> builder)
    {
        builder.ToTable("ConversationCoupleStates");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).ValueGeneratedNever();

        builder.Property(s => s.ConversationId).IsRequired();
        builder.Property(s => s.CoupleId).IsRequired();
        builder.Property(s => s.IsPinned).IsRequired();
        builder.Property(s => s.IsHidden).IsRequired();

        builder.HasIndex(s => new { s.ConversationId, s.CoupleId })
            .IsUnique()
            .HasDatabaseName("IX_ConversationCoupleStates_Conversation_Couple");
        builder.HasIndex(s => new { s.CoupleId, s.IsHidden })
            .HasDatabaseName("IX_ConversationCoupleStates_Couple_Hidden");
    }
}
