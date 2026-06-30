using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Payments;

public class GetPaymentDto
{
    public int Id { get; set; }

    public int OrderId { get; set; }

    public string OrderNumber { get; set; } = string.Empty;

    public int? CashierId { get; set; }

    public string? CashierName { get; set; }

    public decimal Amount { get; set; }

    public PaymentMethod Method { get; set; }

    public PaymentStatus Status { get; set; }

    public DateTime PaidAt { get; set; }

    public string? TransactionNumber { get; set; }

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
