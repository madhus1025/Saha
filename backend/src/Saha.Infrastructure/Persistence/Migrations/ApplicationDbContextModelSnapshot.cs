using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Saha.Infrastructure.Persistence;

#nullable disable

namespace Saha.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    partial class ApplicationDbContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "9.0.0")
                .HasAnnotation("Relational:MaxIdentifierLength", 128);

            SqlServerModelBuilderExtensions.UseIdentityColumns(modelBuilder);

            modelBuilder.Entity("Saha.Domain.Entities.AuditLog", b =>
            {
                b.Property<Guid>("Id").ValueGeneratedNever();
                b.Property<string>("Action").IsRequired().HasMaxLength(100);
                b.Property<Guid?>("CoupleId");
                b.Property<DateTimeOffset>("CreatedAt");
                b.Property<string>("ErrorCode").HasMaxLength(50);
                b.Property<string>("Details");
                b.Property<string>("IpAddress").HasMaxLength(45);
                b.Property<bool>("IsSuccess");
                b.Property<Guid?>("PartnerId");
                b.Property<string>("ResourceId").HasMaxLength(100);
                b.Property<string>("ResourceType").HasMaxLength(50);
                b.Property<DateTimeOffset>("UpdatedAt");
                b.Property<string>("UserAgent").HasMaxLength(500);
                b.HasKey("Id");
                b.HasIndex("CoupleId");
                b.HasIndex("CreatedAt");
                b.ToTable("AuditLogs");
            });

            modelBuilder.Entity("Saha.Domain.Entities.Couple", b =>
            {
                b.Property<Guid>("Id").ValueGeneratedNever();
                b.Property<DateTimeOffset>("CreatedAt");
                b.Property<bool>("IsActive").HasDefaultValue(true);
                b.Property<string>("PasswordHash").IsRequired().HasMaxLength(100);
                b.Property<string>("TogetherID").IsRequired().HasMaxLength(50);
                b.Property<DateTimeOffset>("UpdatedAt");
                b.HasKey("Id");
                b.HasIndex("TogetherID").IsUnique();
                b.ToTable("Couples");
            });

            modelBuilder.Entity("Saha.Domain.Entities.CoupleConnection", b =>
            {
                b.Property<Guid>("Id").ValueGeneratedNever();
                b.Property<Guid>("CoupleAId");
                b.Property<Guid>("CoupleBId");
                b.Property<DateTimeOffset>("CreatedAt");
                b.Property<Guid>("InitiatedByCoupleId");
                b.Property<string>("Status").IsRequired().HasMaxLength(10);
                b.Property<DateTimeOffset>("UpdatedAt");
                b.HasKey("Id");
                b.HasIndex("CoupleBId");
                b.HasIndex("CoupleAId", "CoupleBId").IsUnique();
                b.ToTable("CoupleConnections");
            });

            modelBuilder.Entity("Saha.Domain.Entities.Partner", b =>
            {
                b.Property<Guid>("Id").ValueGeneratedNever();
                b.Property<Guid>("CoupleId");
                b.Property<DateTimeOffset>("CreatedAt");
                b.Property<DateOnly>("DateOfBirth");
                b.Property<string>("Email").IsRequired().HasMaxLength(254);
                b.Property<string>("Name").IsRequired().HasMaxLength(100);
                b.Property<string>("PhoneNumber").IsRequired().HasMaxLength(20);
                b.Property<string>("ProfilePictureUrl").HasMaxLength(2048);
                b.Property<string>("Role").IsRequired().HasMaxLength(10);
                b.Property<DateTimeOffset>("UpdatedAt");
                b.Property<string>("Username").IsRequired().HasMaxLength(30);
                b.HasKey("Id");
                b.HasIndex("CoupleId");
                b.HasIndex("Email").IsUnique();
                b.HasIndex("Username").IsUnique();
                b.ToTable("Partners");
            });

            modelBuilder.Entity("Saha.Domain.Entities.PasswordResetToken", b =>
            {
                b.Property<Guid>("Id").ValueGeneratedNever();
                b.Property<string>("CodeHash").IsRequired().HasMaxLength(64);
                b.Property<Guid>("CoupleId");
                b.Property<DateTimeOffset>("CreatedAt");
                b.Property<DateTimeOffset>("ExpiresAt");
                b.Property<bool>("IsUsed").HasDefaultValue(false);
                b.Property<DateTimeOffset>("UpdatedAt");
                b.HasKey("Id");
                b.HasIndex("CoupleId");
                b.ToTable("PasswordResetTokens");
            });

            modelBuilder.Entity("Saha.Domain.Entities.RefreshToken", b =>
            {
                b.Property<Guid>("Id").ValueGeneratedNever();
                b.Property<string>("CreatedByIp").IsRequired().HasMaxLength(45);
                b.Property<Guid>("CoupleId");
                b.Property<DateTimeOffset>("CreatedAt");
                b.Property<DateTimeOffset>("ExpiresAt");
                b.Property<bool>("IsRevoked").HasDefaultValue(false);
                b.Property<Guid>("PartnerId");
                b.Property<string>("ReplacedByTokenHash").HasMaxLength(64);
                b.Property<string>("RevokedReason").HasMaxLength(200);
                b.Property<string>("TokenHash").IsRequired().HasMaxLength(64);
                b.Property<DateTimeOffset>("UpdatedAt");
                b.HasKey("Id");
                b.HasIndex("CoupleId");
                b.HasIndex("TokenHash").IsUnique();
                b.ToTable("RefreshTokens");
            });

            modelBuilder.Entity("Saha.Domain.Entities.CoupleConnection", b =>
            {
                b.HasOne("Saha.Domain.Entities.Couple", null)
                    .WithMany()
                    .HasForeignKey("CoupleAId")
                    .OnDelete(DeleteBehavior.Restrict)
                    .IsRequired();

                b.HasOne("Saha.Domain.Entities.Couple", null)
                    .WithMany()
                    .HasForeignKey("CoupleBId")
                    .OnDelete(DeleteBehavior.Restrict)
                    .IsRequired();
            });

            modelBuilder.Entity("Saha.Domain.Entities.Partner", b =>
            {
                b.HasOne("Saha.Domain.Entities.Couple", null)
                    .WithMany()
                    .HasForeignKey("CoupleId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });

            modelBuilder.Entity("Saha.Domain.Entities.PasswordResetToken", b =>
            {
                b.HasOne("Saha.Domain.Entities.Couple", null)
                    .WithMany("PasswordResetTokens")
                    .HasForeignKey("CoupleId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });

            modelBuilder.Entity("Saha.Domain.Entities.RefreshToken", b =>
            {
                b.HasOne("Saha.Domain.Entities.Couple", null)
                    .WithMany("RefreshTokens")
                    .HasForeignKey("CoupleId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });

            modelBuilder.Entity("Saha.Domain.Entities.Couple", b =>
            {
                b.Navigation("PasswordResetTokens");
                b.Navigation("RefreshTokens");
            });
#pragma warning restore 612, 618
        }
    }
}
