using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Saha.Domain.Entities;

namespace Saha.Infrastructure.Persistence.Configurations;

public sealed class MessageReactionConfiguration : IEntityTypeConfiguration<MessageReaction>
{
    public void Configure(EntityTypeBuilder<MessageReaction> builder)
    {
        builder.ToTable("MessageReactions");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedNever();

        builder.Property(r => r.MessageId).IsRequired();
        builder.Property(r => r.PartnerId).IsRequired();
        builder.Property(r => r.CoupleId).IsRequired();
        builder.Property(r => r.Emoji).IsRequired().HasMaxLength(20);

        // One reaction per person per message (FR-21).
        builder.HasIndex(r => new { r.MessageId, r.PartnerId })
            .IsUnique()
            .HasDatabaseName("IX_MessageReactions_Message_Partner");
    }
}
