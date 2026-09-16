namespace Cafe.Application.DTOs.Orders;

public class OpenTableResultDto
{
    public GetOrderDto Order { get; set; } = null!;

    // Non-blocking heads-up (e.g. "table has a reservation in 90 minutes") - null when
    // there's nothing to warn about. Distinct from a Result.Failure, which blocks the request.
    public string? Warning { get; set; }
}
