using System.Data;

namespace Cafe.Application.Interfaces.Repositories;

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    // System.Data.IsolationLevel is an ADO.NET/BCL type, not an EF Core leak - Application
    // stays decoupled from EF Core per the project's layering rule. Used by
    // OrderService.OpenTableAsync to close the check-then-act race on "is this table free"
    // (see IX_Orders_ActiveByTable in OrderConfiguration for the second line of defense).
    Task<T> ExecuteInTransactionAsync<T>(
        Func<CancellationToken, Task<T>> operation,
        IsolationLevel isolationLevel = IsolationLevel.Serializable,
        CancellationToken cancellationToken = default);
}
