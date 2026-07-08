using Cafe.Application.Results;

namespace Cafe.Application.Common;

public static class PagedResultExtensions
{
    public static PagedResult<TDto> MapTo<TEntity, TDto>(this PagedResult<TEntity> source, Func<TEntity, TDto> map)
    {
        var items = source.Items.Select(map).ToList();
        return PagedResult<TDto>.Create(items, source.PageNumber, source.PageSize, source.TotalCount);
    }
}
