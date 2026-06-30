using Cafe.Application.Results;

namespace Cafe.Application.Common;

public static class PaginationHelper
{
    public static int NormalizePageNumber(int pageNumber)
    {
        return pageNumber < 1 ? 1 : pageNumber;
    }

    public static int NormalizePageSize(int pageSize)
    {
        if (pageSize < 1)
        {
            return 10;
        }

        return pageSize > 100 ? 100 : pageSize;
    }

    public static PagedResult<T> CreatePagedResult<T>(IEnumerable<T> source, int pageNumber, int pageSize)
    {
        var normalizedPageNumber = NormalizePageNumber(pageNumber);
        var normalizedPageSize = NormalizePageSize(pageSize);
        var totalCount = source.Count();
        var items = source
            .Skip((normalizedPageNumber - 1) * normalizedPageSize)
            .Take(normalizedPageSize)
            .ToList();

        return PagedResult<T>.Create(items, normalizedPageNumber, normalizedPageSize, totalCount);
    }
}
