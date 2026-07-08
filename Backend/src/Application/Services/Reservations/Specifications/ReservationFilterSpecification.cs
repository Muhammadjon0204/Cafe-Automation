using System.Linq.Expressions;
using Cafe.Application.Common;
using Cafe.Application.Common.Specifications;
using Cafe.Application.DTOs.Reservations;
using Cafe.Domain.Entities;

namespace Cafe.Application.Services.Reservations.Specifications;

public class ReservationFilterSpecification : BaseSpecification<Reservation>
{
    public ReservationFilterSpecification(ReservationFilterDto filter)
        : base(BuildCriteria(filter))
    {
        AddInclude(x => x.CafeTable);

        ApplyOrderByDescending(x => x.ReservedAt);

        var pageNumber = PaginationHelper.NormalizePageNumber(filter.PageNumber);
        var pageSize = PaginationHelper.NormalizePageSize(filter.PageSize);
        ApplyPaging((pageNumber - 1) * pageSize, pageSize);
    }

    private static Expression<Func<Reservation, bool>> BuildCriteria(ReservationFilterDto filter)
    {
        var search = string.IsNullOrWhiteSpace(filter.Search) ? null : filter.Search.Trim().ToLower();

        return x =>
            !x.IsDeleted &&
            (!filter.CafeTableId.HasValue || x.CafeTableId == filter.CafeTableId.Value) &&
            (!filter.CustomerId.HasValue || x.CustomerId == filter.CustomerId.Value) &&
            (!filter.Status.HasValue || x.Status == filter.Status.Value) &&
            (!filter.FromDate.HasValue || x.ReservedAt >= filter.FromDate.Value) &&
            (!filter.ToDate.HasValue || x.ReservedAt <= filter.ToDate.Value) &&
            (search == null ||
                x.CustomerName.ToLower().Contains(search) ||
                (x.Phone != null && x.Phone.ToLower().Contains(search)));
    }
}
