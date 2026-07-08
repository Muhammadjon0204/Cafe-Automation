using Cafe.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cafe.Infrastructure.Configurations;

public class DishConfiguration : IEntityTypeConfiguration<Dish>
{
    public void Configure(EntityTypeBuilder<Dish> builder)
    {
        builder.ToTable("Dishes");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).IsRequired().HasMaxLength(150);
        builder.Property(x => x.Description).HasMaxLength(1000);
        builder.Property(x => x.Price).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.CostPrice).HasPrecision(18, 2);
        builder.Property(x => x.CookingTimeMinutes).IsRequired();
        builder.Property(x => x.Calories).IsRequired(false);
        builder.Property(x => x.ImageUrl).HasMaxLength(500);
        builder.Property(x => x.IngredientsDescription).HasMaxLength(1000);
        builder.Property(x => x.IsAvailable).HasDefaultValue(true);
        builder.Property(x => x.IsSeasonal).HasDefaultValue(false);
        builder.Property(x => x.Status).IsRequired().HasConversion<int>();
        builder.Property(x => x.Type).IsRequired().HasConversion<int>();
        builder.Property(x => x.CategoryId).IsRequired();
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.UpdatedAt).IsRequired(false);
        builder.Property(x => x.IsDeleted).HasDefaultValue(false);

        builder.HasOne(x => x.Category)
            .WithMany(x => x.Dishes)
            .HasForeignKey(x => x.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.OrderItems)
            .WithOne(x => x.Dish)
            .HasForeignKey(x => x.DishId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.Name)
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");
        builder.HasIndex(x => x.CategoryId);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.Type);
        builder.HasIndex(x => x.IsAvailable);
        builder.HasIndex(x => x.IsSeasonal);
        builder.HasIndex(x => x.IsDeleted);
        builder.HasIndex(x => x.Price);

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
