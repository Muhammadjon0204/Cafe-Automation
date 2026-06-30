using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Customers;

public class CreateCustomerDto
{
    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public string? Phone { get; set; }

    public string? Email { get; set; }

    public CustomerStatus Status { get; set; }

    public string? Note { get; set; }
}
