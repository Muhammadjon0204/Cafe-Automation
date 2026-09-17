using Cafe.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cafe.Infrastructure.Configurations;

public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("Orders");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.OrderNumber).IsRequired().HasMaxLength(50);
        builder.Property(x => x.OrderedAt).IsRequired();
        builder.Property(x => x.ClosedAt).IsRequired(false);
        builder.Property(x => x.Status).IsRequired().HasConversion<int>();
        builder.Property(x => x.Type).IsRequired().HasConversion<int>();
        builder.Property(x => x.CustomerId).IsRequired(false);
        builder.Property(x => x.CafeTableId).IsRequired(false);
        builder.Property(x => x.DeliveryAddress).HasMaxLength(300);
        builder.Property(x => x.WaiterId).IsRequired(false);
        builder.Property(x => x.CreatedByStaffMemberId).IsRequired(false);
        builder.Property(x => x.ReservationId).IsRequired(false);
        builder.Property(x => x.SendToKitchenAt).IsRequired(false);
        builder.Property(x => x.SubTotal).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.DiscountAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.TipAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.TotalAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.PaymentStatus).IsRequired().HasConversion<int>();
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.UpdatedAt).IsRequired(false);
        builder.Property(x => x.IsDeleted).HasDefaultValue(false);
        // Npgsql has no native auto-generating rowversion type (unlike SQL Server), so
        // ValueGeneratedOnAddOrUpdate (the .IsRowVersion() default) leaves the column out of
        // the INSERT statement entirely and it hits its NOT NULL constraint. ValueGeneratedNever
        // keeps the concurrency-token behavior but makes AppDbContext.SaveChanges responsible
        // for supplying a fresh value on every Add/Modify (see ApplyRowVersions).
        builder.Property(x => x.RowVersion).IsRowVersion().ValueGeneratedNever();

        builder.HasOne(x => x.Customer)
            .WithMany(x => x.Orders)
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.CafeTable)
            .WithMany(x => x.Orders)
            .HasForeignKey(x => x.CafeTableId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Waiter)
            .WithMany(x => x.Orders)
            .HasForeignKey(x => x.WaiterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.CreatedByStaffMember)
            .WithMany()
            .HasForeignKey(x => x.CreatedByStaffMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Reservation)
            .WithMany()
            .HasForeignKey(x => x.ReservationId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Items)
            .WithOne(x => x.Order)
            .HasForeignKey(x => x.OrderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Payments)
            .WithOne(x => x.Order)
            .HasForeignKey(x => x.OrderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Discounts)
            .WithOne(x => x.Order)
            .HasForeignKey(x => x.OrderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Tips)
            .WithOne(x => x.Order)
            .HasForeignKey(x => x.OrderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.OrderNumber)
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");
        builder.HasIndex(x => x.OrderedAt);
        builder.HasIndex(x => x.ClosedAt);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.Type);
        builder.HasIndex(x => x.PaymentStatus);
        builder.HasIndex(x => x.CustomerId);
        builder.HasIndex(x => x.CafeTableId);
        builder.HasIndex(x => x.WaiterId);
        builder.HasIndex(x => x.CreatedByStaffMemberId);
        builder.HasIndex(x => x.IsDeleted);
        builder.HasIndex(x => new { x.Status, x.SendToKitchenAt });

        // At most one non-cancelled order per reservation - allows a fresh pre-order to be
        // created after an earlier one for the same reservation was cancelled (Status = 7).
        builder.HasIndex(x => x.ReservationId)
            .IsUnique()
            .HasDatabaseName("IX_Orders_ActiveByReservation")
            .HasFilter("\"ReservationId\" IS NOT NULL AND \"Status\" != 7 AND \"IsDeleted\" = false");

        // Concurrency guard for TZ "open table" race (two waiters, same table, near-simultaneous
        // requests): at most one actively-occupying order per table. Status 8 (Scheduled) is
        // deliberately excluded - a future pre-order must not block the table from being opened
        // for a walk-in today; it only starts competing for the table once promoted out of
        // Scheduled. This is the last line of defense behind OrderService.OpenTableAsync's
        // Serializable transaction (see IUnitOfWork.ExecuteInTransactionAsync) - a violation here
        // surfaces as Postgres 23505 and is translated to 409 by ExceptionHandlingMiddleware.
        builder.HasIndex(x => x.CafeTableId)
            .IsUnique()
            .HasDatabaseName("IX_Orders_ActiveByTable")
            .HasFilter("\"CafeTableId\" IS NOT NULL AND \"Status\" NOT IN (6,7,8) AND \"IsDeleted\" = false");

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
