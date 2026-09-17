using Cafe.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cafe.Infrastructure.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("RefreshTokens", t => t.HasCheckConstraint(
            "CK_RefreshTokens_ExactlyOneOwner",
            "(\"StaffMemberId\" IS NOT NULL AND \"CustomerId\" IS NULL) OR (\"StaffMemberId\" IS NULL AND \"CustomerId\" IS NOT NULL)"));

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Token).IsRequired().HasMaxLength(200);
        builder.Property(x => x.ExpiresAt).IsRequired();
        builder.Property(x => x.IsRevoked).IsRequired().HasDefaultValue(false);
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Ignore(x => x.RowVersion);

        builder.HasOne(x => x.StaffMember)
            .WithMany()
            .HasForeignKey(x => x.StaffMemberId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Customer)
            .WithMany()
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.Token).IsUnique();
        builder.HasIndex(x => x.StaffMemberId);
        builder.HasIndex(x => x.CustomerId);
        builder.HasIndex(x => x.ExpiresAt);

        // Match the owning principal's own soft-delete filter: once a staff member/customer is
        // soft-deleted, their refresh tokens should drop out of query results the same way the
        // principal already does. Each row has exactly one owner (see check constraint above),
        // so the other side's IsDeleted check is skipped via the null guard.
        builder.HasQueryFilter(x =>
            (x.StaffMemberId == null || !x.StaffMember!.IsDeleted) &&
            (x.CustomerId == null || !x.Customer!.IsDeleted));
    }
}
