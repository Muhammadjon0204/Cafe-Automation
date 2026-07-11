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
        builder.Property(x => x.WaiterId).IsRequired(false);
        builder.Property(x => x.CreatedByStaffMemberId).IsRequired(false);
        builder.Property(x => x.SubTotal).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.DiscountAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.TipAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.TotalAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.PaymentStatus).IsRequired().HasConversion<int>();
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.UpdatedAt).IsRequired(false);
        builder.Property(x => x.IsDeleted).HasDefaultValue(false);
        builder.Property(x => x.RowVersion).IsRowVersion();

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

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
