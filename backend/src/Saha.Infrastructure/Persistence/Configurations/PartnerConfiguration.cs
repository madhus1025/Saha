using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Saha.Domain.Entities;

namespace Saha.Infrastructure.Persistence.Configurations;

public sealed class PartnerConfiguration : IEntityTypeConfiguration<Partner>
{
    public void Configure(EntityTypeBuilder<Partner> builder)
    {
        builder.ToTable("Partners");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Id)
            .ValueGeneratedNever();

        builder.Property(p => p.Username)
            .IsRequired()
            .HasMaxLength(30);

        builder.HasIndex(p => p.Username)
            .IsUnique()
            .HasDatabaseName("IX_Partners_Username");

        builder.Property(p => p.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(p => p.DateOfBirth)
            .IsRequired()
            .HasColumnType("date");

        builder.Property(p => p.Email)
            .IsRequired()
            .HasMaxLength(254);

        builder.HasIndex(p => p.Email)
            .HasDatabaseName("IX_Partners_Email");

        builder.Property(p => p.PhoneNumber)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(p => p.ProfilePictureUrl)
            .HasMaxLength(2048);

        builder.Property(p => p.Role)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(p => p.CoupleId)
            .IsRequired();

        builder.Property(p => p.CreatedAt)
            .IsRequired();

        builder.Property(p => p.UpdatedAt)
            .IsRequired();
    }
}
