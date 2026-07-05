using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Saha.Domain.Entities;

namespace Saha.Infrastructure.Persistence.Configurations;

public sealed class CoupleConfiguration : IEntityTypeConfiguration<Couple>
{
    public void Configure(EntityTypeBuilder<Couple> builder)
    {
        builder.ToTable("Couples");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Id)
            .ValueGeneratedNever();

        builder.Property(c => c.TogetherID)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(c => c.TogetherID)
            .IsUnique()
            .HasDatabaseName("IX_Couples_TogetherID");

        builder.Property(c => c.PasswordHash)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(c => c.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(c => c.CreatedAt)
            .IsRequired();

        builder.Property(c => c.UpdatedAt)
            .IsRequired();

        builder.HasMany(c => c.Partners)
            .WithOne()
            .HasForeignKey(p => p.CoupleId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(c => c.RefreshTokens)
            .WithOne()
            .HasForeignKey(rt => rt.CoupleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(c => c.PasswordResetTokens)
            .WithOne()
            .HasForeignKey(prt => prt.CoupleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(c => c.Partners).AutoInclude();
    }
}
