using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Saha.Domain.Entities;

namespace Saha.Infrastructure.Persistence.Configurations;

public sealed class CoupleConnectionConfiguration : IEntityTypeConfiguration<CoupleConnection>
{
    public void Configure(EntityTypeBuilder<CoupleConnection> builder)
    {
        builder.ToTable("CoupleConnections");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).ValueGeneratedNever();

        builder.Property(c => c.CoupleAId).IsRequired();
        builder.Property(c => c.CoupleBId).IsRequired();
        builder.Property(c => c.InitiatedByCoupleId).IsRequired();

        builder.Property(c => c.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(c => c.CreatedAt).IsRequired();
        // The status transition is a compare-and-swap operation: two tabs/partners may try to
        // accept and reject the same pending request at the same time. Including UpdatedAt in the
        // UPDATE predicate means only the first writer can commit; the repository maps the losing
        // DbUpdateConcurrencyException to a stable 409 instead of reporting two successful actions.
        // This is provider-agnostic and uses the existing column, so it needs no schema migration.
        builder.Property(c => c.UpdatedAt)
            .IsRequired()
            .IsConcurrencyToken();

        // Unique, not merely indexed. The send handler checks for an existing connection and then
        // inserts; without a database-level constraint two concurrent identical requests can both
        // pass the check and both insert, breaking the one-relation-per-pair invariant (SAHA-D17).
        // The application check remains the primary path — this is the guard that actually holds
        // under concurrency, and the repository maps its violation back to the same 409.
        builder.HasIndex(c => new { c.CoupleAId, c.CoupleBId })
            .IsUnique()
            .HasDatabaseName("IX_CoupleConnections_CoupleAId_CoupleBId");

        builder.HasIndex(c => c.Status)
            .HasDatabaseName("IX_CoupleConnections_Status");
    }
}
