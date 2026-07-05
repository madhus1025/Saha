using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Saha.Domain.Entities;

namespace Saha.Infrastructure.Persistence.Configurations;

public sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLogs");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).ValueGeneratedNever();

        builder.Property(a => a.Action).IsRequired().HasMaxLength(100);
        builder.Property(a => a.ResourceType).HasMaxLength(100);
        builder.Property(a => a.Details).HasMaxLength(1000);
        builder.Property(a => a.IpAddress).HasMaxLength(50);
        builder.Property(a => a.UserAgent).HasMaxLength(500);
        builder.Property(a => a.ErrorCode).HasMaxLength(100);
        builder.Property(a => a.IsSuccess).IsRequired();
        builder.Property(a => a.CreatedAt).IsRequired();
        builder.Property(a => a.UpdatedAt).IsRequired();

        builder.HasIndex(a => a.CoupleId).HasDatabaseName("IX_AuditLogs_CoupleId");
        builder.HasIndex(a => a.CreatedAt).HasDatabaseName("IX_AuditLogs_CreatedAt");
        builder.HasIndex(a => new { a.Action, a.CreatedAt }).HasDatabaseName("IX_AuditLogs_Action_CreatedAt");
    }
}
