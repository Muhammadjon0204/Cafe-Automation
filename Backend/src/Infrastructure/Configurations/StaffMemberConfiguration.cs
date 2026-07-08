using Cafe.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cafe.Infrastructure.Configurations;

public class StaffMemberConfiguration : IEntityTypeConfiguration<StaffMember>
{
    public void Configure(EntityTypeBuilder<StaffMember> builder)
    {
        builder.ToTable("StaffMembers");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.IdentityUserId).HasMaxLength(450);
        builder.Property(x => x.FirstName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.LastName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.MiddleName).HasMaxLength(100);
        builder.Property(x => x.Phone).HasMaxLength(30);
        builder.Property(x => x.Email).HasMaxLength(150);
        builder.Property(x => x.Role).IsRequired().HasConversion<int>();
        builder.Property(x => x.Status).IsRequired().HasConversion<int>();
        builder.Property(x => x.HireDate).IsRequired();
        builder.Property(x => x.FiredDate).IsRequired(false);
        builder.Property(x => x.Salary).HasPrecision(18, 2);
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.UpdatedAt).IsRequired(false);
        builder.Property(x => x.IsDeleted).HasDefaultValue(false);

        builder.HasIndex(x => x.IdentityUserId);
        builder.HasIndex(x => x.Email)
            .IsUnique()
            .HasFilter("\"Email\" IS NOT NULL AND \"IsDeleted\" = false");
        builder.HasIndex(x => x.Phone)
            .IsUnique()
            .HasFilter("\"Phone\" IS NOT NULL AND \"IsDeleted\" = false");
        builder.HasIndex(x => x.Role);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.HireDate);
        builder.HasIndex(x => x.IsDeleted);

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
