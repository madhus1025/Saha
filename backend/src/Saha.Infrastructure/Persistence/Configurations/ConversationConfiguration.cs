using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Saha.Domain.Entities;
using Saha.Domain.Enums;

namespace Saha.Infrastructure.Persistence.Configurations;

public sealed class ConversationConfiguration : IEntityTypeConfiguration<Conversation>
{
    public void Configure(EntityTypeBuilder<Conversation> builder)
    {
        builder.ToTable("Conversations");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).ValueGeneratedNever();

        builder.Property(c => c.Type)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(c => c.Name).HasMaxLength(80);
        builder.Property(c => c.OwnerCoupleId);
        builder.Property(c => c.PartnerCoupleId);
        builder.Property(c => c.LastActivityAt).IsRequired();
        builder.Property(c => c.LastMessagePreview).HasMaxLength(200);
        builder.Property(c => c.LastMessageSenderPartnerId);

        builder.Property(c => c.CreatedAt).IsRequired();
        builder.Property(c => c.UpdatedAt).IsRequired();

        builder.HasMany(c => c.Participants)
            .WithOne()
            .HasForeignKey(p => p.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(c => c.CoupleStates)
            .WithOne()
            .HasForeignKey(s => s.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(c => c.Participants).AutoInclude();
        builder.Navigation(c => c.CoupleStates).AutoInclude();

        builder.HasIndex(c => c.Type).HasDatabaseName("IX_Conversations_Type");

        // Exactly one Partner conversation per couple (FR-1). Filtered so Group rows (null) don't collide.
        builder.HasIndex(c => c.PartnerCoupleId)
            .IsUnique()
            .HasFilter("[PartnerCoupleId] IS NOT NULL")
            .HasDatabaseName("IX_Conversations_PartnerCoupleId");
    }
}
