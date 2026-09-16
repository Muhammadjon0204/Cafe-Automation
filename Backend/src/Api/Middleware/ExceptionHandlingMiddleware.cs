using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Text.Json;
using Cafe.Application.Results;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Cafe.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            await HandleExceptionAsync(context, exception);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message) = exception switch
        {
            DbUpdateConcurrencyException => (HttpStatusCode.Conflict, "The record was modified by another request. Reload and try again."),
            // OrderService.OpenTableAsync's second line of defense (see IX_Orders_ActiveByTable
            // in OrderConfiguration): a unique-violation on that specific index means someone else
            // opened the table first. Scoped to that index by name so an unrelated unique
            // constraint elsewhere still falls through to the generic 500 path.
            DbUpdateException { InnerException: PostgresException { SqlState: "23505" } pg }
                when pg.ConstraintName == "IX_Orders_ActiveByTable" =>
                (HttpStatusCode.Conflict, "Table is already occupied by another order."),
            // Same reasoning, for two concurrent CreatePreOrderAsync calls on the same
            // reservation (CreatePreOrderAsync's own existence-check is the primary guard;
            // this is the same check-then-act race as above, just lower-stakes).
            DbUpdateException { InnerException: PostgresException { SqlState: "23505" } pg }
                when pg.ConstraintName == "IX_Orders_ActiveByReservation" =>
                (HttpStatusCode.Conflict, "A pre-order already exists for this reservation."),
            // Postgres serializable-isolation write-skew conflict, raised on commit of
            // IUnitOfWork.ExecuteInTransactionAsync (currently only OpenTableAsync). SQLSTATE
            // 40001 always means "retry the transaction" per Postgres's own contract.
            PostgresException { SqlState: "40001" } =>
                (HttpStatusCode.Conflict, "This operation conflicts with another concurrent request. Please retry."),
            ValidationException validationException => (HttpStatusCode.BadRequest, validationException.Message),
            UnauthorizedAccessException => (HttpStatusCode.Forbidden, "You do not have permission to perform this action."),
            _ => (HttpStatusCode.InternalServerError, "An unexpected error occurred.")
        };

        if (statusCode == HttpStatusCode.InternalServerError)
        {
            _logger.LogError(exception, "Unhandled exception processing {Method} {Path}", context.Request.Method, context.Request.Path);
        }
        else
        {
            _logger.LogWarning(exception, "Handled exception ({StatusCode}) processing {Method} {Path}", statusCode, context.Request.Method, context.Request.Path);
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var result = Result.Failure(message);
        await context.Response.WriteAsync(JsonSerializer.Serialize(result));
    }
}
