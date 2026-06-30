using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Customers;

public class CustomerFilterDto
{
    public string? Search { get; set; }

    public string? Phone { get; set; }

    public string? Email { get; set; }

    public CustomerStatus? Status { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}
