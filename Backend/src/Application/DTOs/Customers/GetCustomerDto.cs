using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Customers;

public class GetCustomerDto
{
    public int Id { get; set; }

    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string? Phone { get; set; }

    public string? Email { get; set; }

    public DateTime RegisteredAt { get; set; }

    public CustomerStatus Status { get; set; }

    public string? Note { get; set; }

    public int OrdersCount { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
