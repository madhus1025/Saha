using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Saha.Domain.Entities;

namespace Saha.Infrastructure.Persistence.Configurations;

public sealed class CoupleInvitationConfiguration : IEntityTypeConfiguration<CoupleInvitation>
{
    public void Configure(EntityTypeBuilder<CoupleInvitation> builder)
    {
        builder.ToTable("CoupleInvitations");
        builder.HasKey(i => i.Id);

        builder.Property(i => i.Id)
            .ValueGeneratedNever();

        builder.Property(i => i.CoupleId)
            .IsRequired();

        builder.Property(i => i.InviteeName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(i => i.InviteeEmail)
            .IsRequired()
            .HasMaxLength(254);

        builder.Property(i => i.TokenHash)
            .IsRequired()
            .HasMaxLength(500);

        builder.HasIndex(i => i.TokenHash)
            .HasDatabaseName("IX_CoupleInvitations_TokenHash");

        builder.Property(i => i.ExpiresAt)
            .IsRequired();

        builder.Property(i => i.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(i => i.CreatedAt)
            .IsRequired();

        builder.Property(i => i.UpdatedAt)
            .IsRequired();
    }
}
