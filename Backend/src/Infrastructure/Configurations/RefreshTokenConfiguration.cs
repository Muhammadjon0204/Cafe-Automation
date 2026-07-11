using Cafe.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cafe.Infrastructure.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("RefreshTokens");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Token).IsRequired().HasMaxLength(200);
        builder.Property(x => x.StaffMemberId).IsRequired();
        builder.Property(x => x.ExpiresAt).IsRequired();
        builder.Property(x => x.IsRevoked).IsRequired().HasDefaultValue(false);
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Ignore(x => x.RowVersion);

        builder.HasOne(x => x.StaffMember)
            .WithMany()
            .HasForeignKey(x => x.StaffMemberId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.Token).IsUnique();
        builder.HasIndex(x => x.StaffMemberId);
        builder.HasIndex(x => x.ExpiresAt);

        // Match StaffMember's own soft-delete filter: once a staff member is soft-deleted
        // (StaffMemberService.DeleteAsync also revokes their tokens), their refresh tokens
        // should drop out of query results the same way the required principal already does.
        builder.HasQueryFilter(x => !x.StaffMember!.IsDeleted);
    }
}
