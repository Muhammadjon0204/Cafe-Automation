using Cafe.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cafe.Infrastructure.Configurations;

public class ReservationConfiguration : IEntityTypeConfiguration<Reservation>
{
    public void Configure(EntityTypeBuilder<Reservation> builder)
    {
        builder.ToTable("Reservations");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.CafeTableId).IsRequired();
        builder.Property(x => x.CustomerId).IsRequired(false);
        builder.Property(x => x.CustomerName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.Phone).HasMaxLength(30);
        builder.Property(x => x.GuestsCount).IsRequired();
        builder.Property(x => x.ReservedAt).IsRequired();
        builder.Property(x => x.ReservedUntil).IsRequired(false);
        builder.Property(x => x.CancelledAt).IsRequired(false);
        builder.Property(x => x.Status).IsRequired().HasConversion<int>();
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.UpdatedAt).IsRequired(false);
        builder.Property(x => x.IsDeleted).HasDefaultValue(false);
        builder.Ignore(x => x.RowVersion);

        builder.HasOne(x => x.CafeTable)
            .WithMany(x => x.Reservations)
            .HasForeignKey(x => x.CafeTableId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Customer)
            .WithMany(x => x.Reservations)
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.CafeTableId);
        builder.HasIndex(x => x.CustomerId);
        builder.HasIndex(x => x.CustomerName);
        builder.HasIndex(x => x.Phone);
        builder.HasIndex(x => x.ReservedAt);
        builder.HasIndex(x => x.ReservedUntil);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.IsDeleted);

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
