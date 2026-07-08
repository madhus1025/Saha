using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Saha.Domain.Entities;

namespace Saha.Infrastructure.Persistence.Configurations;

public sealed class MessageConfiguration : IEntityTypeConfiguration<Message>
{
    public void Configure(EntityTypeBuilder<Message> builder)
    {
        builder.ToTable("Messages");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).ValueGeneratedNever();

        builder.Property(m => m.ConversationId).IsRequired();
        builder.Property(m => m.SenderPartnerId).IsRequired();
        builder.Property(m => m.SenderCoupleId).IsRequired();
        builder.Property(m => m.ContentType)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);
        builder.Property(m => m.Body).HasMaxLength(4000);
        builder.Property(m => m.IsEdited).IsRequired();
        builder.Property(m => m.EditedAt);
        builder.Property(m => m.IsDeleted).IsRequired();
        builder.Property(m => m.DeletedAt);

        builder.Property(m => m.CreatedAt).IsRequired();
        builder.Property(m => m.UpdatedAt).IsRequired();

        builder.HasOne(m => m.Attachment)
            .WithOne()
            .HasForeignKey<MessageAttachment>(a => a.MessageId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(m => m.Reactions)
            .WithOne()
            .HasForeignKey(r => r.MessageId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(m => m.Attachment).AutoInclude();
        builder.Navigation(m => m.Reactions).AutoInclude();

        builder.HasIndex(m => new { m.ConversationId, m.CreatedAt })
            .HasDatabaseName("IX_Messages_Conversation_CreatedAt");
        builder.HasIndex(m => m.SenderPartnerId).HasDatabaseName("IX_Messages_SenderPartnerId");
    }
}
