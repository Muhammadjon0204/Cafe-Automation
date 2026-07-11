using Cafe.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cafe.Infrastructure.Configurations;

public class CafeTableConfiguration : IEntityTypeConfiguration<CafeTable>
{
    public void Configure(EntityTypeBuilder<CafeTable> builder)
    {
        builder.ToTable("CafeTables");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.TableNumber).IsRequired();
        builder.Property(x => x.SeatsCount).IsRequired();
        builder.Property(x => x.Status).IsRequired().HasConversion<int>();
        builder.Property(x => x.Location).HasMaxLength(100);
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.UpdatedAt).IsRequired(false);
        builder.Property(x => x.IsDeleted).HasDefaultValue(false);
        builder.Ignore(x => x.RowVersion);

        builder.HasMany(x => x.Orders)
            .WithOne(x => x.CafeTable)
            .HasForeignKey(x => x.CafeTableId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Reservations)
            .WithOne(x => x.CafeTable)
            .HasForeignKey(x => x.CafeTableId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.TableNumber)
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.SeatsCount);
        builder.HasIndex(x => x.IsDeleted);

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
