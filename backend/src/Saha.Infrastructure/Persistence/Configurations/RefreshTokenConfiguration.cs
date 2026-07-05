using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Saha.Domain.Entities;

namespace Saha.Infrastructure.Persistence.Configurations;

public sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("RefreshTokens");
        builder.HasKey(rt => rt.Id);

        builder.Property(rt => rt.Id).ValueGeneratedNever();

        builder.Property(rt => rt.TokenHash)
            .IsRequired()
            .HasMaxLength(500);

        builder.HasIndex(rt => rt.TokenHash)
            .HasDatabaseName("IX_RefreshTokens_TokenHash");

        builder.Property(rt => rt.CoupleId).IsRequired();
        builder.Property(rt => rt.PartnerId).IsRequired();
        builder.Property(rt => rt.ExpiresAt).IsRequired();
        builder.Property(rt => rt.IsRevoked).IsRequired().HasDefaultValue(false);
        builder.Property(rt => rt.CreatedByIp).HasMaxLength(50);
        builder.Property(rt => rt.RevokedReason).HasMaxLength(200);
        builder.Property(rt => rt.ReplacedByTokenHash).HasMaxLength(500);
        builder.Property(rt => rt.CreatedAt).IsRequired();
        builder.Property(rt => rt.UpdatedAt).IsRequired();

        builder.HasIndex(rt => new { rt.CoupleId, rt.IsRevoked, rt.ExpiresAt })
            .HasDatabaseName("IX_RefreshTokens_CoupleId_Active");
    }
}
