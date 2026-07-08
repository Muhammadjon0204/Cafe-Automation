using System.Linq.Expressions;
using Cafe.Application.Common;
using Cafe.Application.Common.Specifications;
using Cafe.Application.DTOs.Dishes;
using Cafe.Domain.Entities;

namespace Cafe.Application.Services.Dishes.Specifications;

public class DishFilterSpecification : BaseSpecification<Dish>
{
    public DishFilterSpecification(DishFilterDto filter)
        : base(BuildCriteria(filter))
    {
        AddInclude(x => x.Category);

        ApplyOrderBy(x => x.Name);

        var pageNumber = PaginationHelper.NormalizePageNumber(filter.PageNumber);
        var pageSize = PaginationHelper.NormalizePageSize(filter.PageSize);
        ApplyPaging((pageNumber - 1) * pageSize, pageSize);
    }

    private static Expression<Func<Dish, bool>> BuildCriteria(DishFilterDto filter)
    {
        var search = string.IsNullOrWhiteSpace(filter.Search) ? null : filter.Search.Trim().ToLower();

        return x =>
            !x.IsDeleted &&
            (search == null ||
                x.Name.ToLower().Contains(search) ||
                (x.Description != null && x.Description.ToLower().Contains(search)) ||
                (x.IngredientsDescription != null && x.IngredientsDescription.ToLower().Contains(search))) &&
            (!filter.CategoryId.HasValue || x.CategoryId == filter.CategoryId.Value) &&
            (!filter.IsAvailable.HasValue || x.IsAvailable == filter.IsAvailable.Value) &&
            (!filter.IsSeasonal.HasValue || x.IsSeasonal == filter.IsSeasonal.Value) &&
            (!filter.Status.HasValue || x.Status == filter.Status.Value) &&
            (!filter.Type.HasValue || x.Type == filter.Type.Value) &&
            (!filter.MinPrice.HasValue || x.Price >= filter.MinPrice.Value) &&
            (!filter.MaxPrice.HasValue || x.Price <= filter.MaxPrice.Value);
    }
}
