using System.Linq.Expressions;
using Cafe.Application.Common;
using Cafe.Application.Common.Specifications;
using Cafe.Application.DTOs.Orders;
using Cafe.Domain.Entities;

namespace Cafe.Application.Services.Orders.Specifications;

public class OrderFilterSpecification : BaseSpecification<Order>
{
    public OrderFilterSpecification(OrderFilterDto filter)
        : base(BuildCriteria(filter))
    {
        AddInclude(x => x.Customer);
        AddInclude(x => x.CafeTable);
        AddInclude(x => x.Waiter);
        AddInclude(x => x.CreatedByStaffMember);
        AddInclude("Items.Dish");

        ApplyOrderByDescending(x => x.OrderedAt);

        var pageNumber = PaginationHelper.NormalizePageNumber(filter.PageNumber);
        var pageSize = PaginationHelper.NormalizePageSize(filter.PageSize);
        ApplyPaging((pageNumber - 1) * pageSize, pageSize);
    }

    private static Expression<Func<Order, bool>> BuildCriteria(OrderFilterDto filter)
    {
        var search = string.IsNullOrWhiteSpace(filter.Search) ? null : filter.Search.Trim().ToLower();

        return x =>
            !x.IsDeleted &&
            (search == null ||
                x.OrderNumber.ToLower().Contains(search) ||
                (x.Note != null && x.Note.ToLower().Contains(search)) ||
                (x.Customer != null && (
                    (x.Customer.FirstName != null && x.Customer.FirstName.ToLower().Contains(search)) ||
                    (x.Customer.LastName != null && x.Customer.LastName.ToLower().Contains(search)) ||
                    (x.Customer.Phone != null && x.Customer.Phone.ToLower().Contains(search)) ||
                    (x.Customer.Email != null && x.Customer.Email.ToLower().Contains(search)))) ||
                (x.Waiter != null && (
                    x.Waiter.FirstName.ToLower().Contains(search) ||
                    x.Waiter.LastName.ToLower().Contains(search) ||
                    (x.Waiter.MiddleName != null && x.Waiter.MiddleName.ToLower().Contains(search))))) &&
            (!filter.Status.HasValue || x.Status == filter.Status.Value) &&
            (!filter.Type.HasValue || x.Type == filter.Type.Value) &&
            (!filter.PaymentStatus.HasValue || x.PaymentStatus == filter.PaymentStatus.Value) &&
            (!filter.CustomerId.HasValue || x.CustomerId == filter.CustomerId.Value) &&
            (!filter.CafeTableId.HasValue || x.CafeTableId == filter.CafeTableId.Value) &&
            (!filter.WaiterId.HasValue || x.WaiterId == filter.WaiterId.Value) &&
            (!filter.FromDate.HasValue || x.OrderedAt >= filter.FromDate.Value) &&
            (!filter.ToDate.HasValue || x.OrderedAt <= filter.ToDate.Value);
    }
}
