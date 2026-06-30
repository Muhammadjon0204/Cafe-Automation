using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Payments;

public class CreatePaymentDto
{
    public int OrderId { get; set; }

    public int? CashierId { get; set; }

    public decimal Amount { get; set; }

    public PaymentMethod Method { get; set; }

    public string? TransactionNumber { get; set; }

    public string? Note { get; set; }
}
