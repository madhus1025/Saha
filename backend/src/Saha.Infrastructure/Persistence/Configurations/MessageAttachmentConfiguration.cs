using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Saha.Domain.Entities;

namespace Saha.Infrastructure.Persistence.Configurations;

public sealed class MessageAttachmentConfiguration : IEntityTypeConfiguration<MessageAttachment>
{
    public void Configure(EntityTypeBuilder<MessageAttachment> builder)
    {
        builder.ToTable("MessageAttachments");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).ValueGeneratedNever();

        builder.Property(a => a.MessageId).IsRequired();
        builder.Property(a => a.Url).IsRequired().HasMaxLength(1000);
        builder.Property(a => a.ContentType).IsRequired().HasMaxLength(100);
        builder.Property(a => a.FileName).IsRequired().HasMaxLength(260);
        builder.Property(a => a.SizeBytes).IsRequired();

        builder.HasIndex(a => a.MessageId)
            .IsUnique()
            .HasDatabaseName("IX_MessageAttachments_MessageId");
    }
}
