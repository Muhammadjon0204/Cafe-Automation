using Cafe.Application.Common.Specifications;
using Cafe.Application.Results;
using Microsoft.EntityFrameworkCore;

namespace Cafe.Infrastructure.Specifications;

public static class SpecificationEvaluator<T> where T : class
{
    public static IQueryable<T> GetQuery(IQueryable<T> inputQuery, ISpecification<T> spec)
    {
        var query = inputQuery;

        if (spec.Criteria != null)
        {
            query = query.Where(spec.Criteria);
        }

        query = spec.Includes.Aggregate(query, (current, include) => current.Include(include));
        query = spec.IncludeStrings.Aggregate(query, (current, include) => current.Include(include));

        if (spec.OrderBy != null)
        {
            query = ApplyThenBy(query.OrderBy(spec.OrderBy), spec);
        }
        else if (spec.OrderByDescending != null)
        {
            query = ApplyThenBy(query.OrderByDescending(spec.OrderByDescending), spec);
        }

        if (spec.IsPagingEnabled)
        {
            query = query.Skip(spec.Skip).Take(spec.Take);
        }

        return query;
    }

    public static async Task<PagedResult<T>> GetPagedResultAsync(IQueryable<T> inputQuery, ISpecification<T> spec, CancellationToken cancellationToken = default)
    {
        var filteredQuery = spec.Criteria != null ? inputQuery.Where(spec.Criteria) : inputQuery;
        var totalCount = await filteredQuery.CountAsync(cancellationToken);

        var items = await GetQuery(inputQuery, spec).ToListAsync(cancellationToken);

        var pageSize = spec.IsPagingEnabled ? spec.Take : totalCount;
        var pageNumber = spec.IsPagingEnabled && pageSize > 0 ? (spec.Skip / pageSize) + 1 : 1;

        return PagedResult<T>.Create(items, pageNumber, pageSize, totalCount);
    }

    private static IQueryable<T> ApplyThenBy(IOrderedQueryable<T> ordered, ISpecification<T> spec)
    {
        if (spec.ThenBy != null)
        {
            return ordered.ThenBy(spec.ThenBy);
        }

        if (spec.ThenByDescending != null)
        {
            return ordered.ThenByDescending(spec.ThenByDescending);
        }

        return ordered;
    }
}
