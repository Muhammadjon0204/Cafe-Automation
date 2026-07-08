using System.Linq.Expressions;
using Cafe.Application.Common;
using Cafe.Application.Common.Specifications;
using Cafe.Application.DTOs.Staff;
using Cafe.Domain.Entities;

namespace Cafe.Application.Services.Staff.Specifications;

public class StaffMemberFilterSpecification : BaseSpecification<StaffMember>
{
    public StaffMemberFilterSpecification(StaffMemberFilterDto filter)
        : base(BuildCriteria(filter))
    {
        AddInclude(x => x.Orders);
        AddInclude(x => x.Tips);

        ApplyOrderBy(x => x.LastName);

        var pageNumber = PaginationHelper.NormalizePageNumber(filter.PageNumber);
        var pageSize = PaginationHelper.NormalizePageSize(filter.PageSize);
        ApplyPaging((pageNumber - 1) * pageSize, pageSize);
    }

    private static Expression<Func<StaffMember, bool>> BuildCriteria(StaffMemberFilterDto filter)
    {
        var search = string.IsNullOrWhiteSpace(filter.Search) ? null : filter.Search.Trim().ToLower();

        return x =>
            !x.IsDeleted &&
            (search == null ||
                x.FirstName.ToLower().Contains(search) ||
                x.LastName.ToLower().Contains(search) ||
                (x.MiddleName != null && x.MiddleName.ToLower().Contains(search)) ||
                (x.Phone != null && x.Phone.ToLower().Contains(search)) ||
                (x.Email != null && x.Email.ToLower().Contains(search))) &&
            (!filter.Role.HasValue || x.Role == filter.Role.Value) &&
            (!filter.Status.HasValue || x.Status == filter.Status.Value);
    }
}
