using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Saha.Domain.Entities;

namespace Saha.Infrastructure.Persistence.Configurations;

public sealed class PasswordResetTokenConfiguration : IEntityTypeConfiguration<PasswordResetToken>
{
    public void Configure(EntityTypeBuilder<PasswordResetToken> builder)
    {
        builder.ToTable("PasswordResetTokens");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).ValueGeneratedNever();

        builder.Property(t => t.CoupleId).IsRequired();
        builder.Property(t => t.CodeHash).IsRequired().HasMaxLength(500);
        builder.Property(t => t.ExpiresAt).IsRequired();
        builder.Property(t => t.IsUsed).IsRequired().HasDefaultValue(false);
        builder.Property(t => t.CreatedAt).IsRequired();
        builder.Property(t => t.UpdatedAt).IsRequired();

        builder.HasIndex(t => new { t.CoupleId, t.IsUsed, t.ExpiresAt })
            .HasDatabaseName("IX_PasswordResetTokens_CoupleId_Active");
    }
}
