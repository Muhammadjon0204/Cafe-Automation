using System.Linq.Expressions;

namespace Cafe.Application.Common.Specifications;

public interface ISpecification<T>
{
    Expression<Func<T, bool>>? Criteria { get; }

    List<Expression<Func<T, object?>>> Includes { get; }

    List<string> IncludeStrings { get; }

    Expression<Func<T, object>>? OrderBy { get; }

    Expression<Func<T, object>>? OrderByDescending { get; }

    Expression<Func<T, object>>? ThenBy { get; }

    Expression<Func<T, object>>? ThenByDescending { get; }

    int Skip { get; }

    int Take { get; }

    bool IsPagingEnabled { get; }

    // Opt-in escape hatch for a soft-delete query filter (e.g. Dish's HasQueryFilter(x =>
    // !x.IsDeleted) - see DishConfiguration). That filter applies to every query against the
    // DbSet regardless of what Criteria says, so a spec whose own Criteria already asks for
    // deleted rows (an admin "include archived" view) still needs this to actually see them.
    bool IgnoreQueryFilters { get; }
}
