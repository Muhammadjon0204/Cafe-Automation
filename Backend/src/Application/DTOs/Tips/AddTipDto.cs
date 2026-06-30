using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Tips;

public class AddTipDto
{
    public int OrderId { get; set; }

    public int? StaffMemberId { get; set; }

    public decimal Amount { get; set; }

    public PaymentMethod Method { get; set; }

    public string? Note { get; set; }
}
