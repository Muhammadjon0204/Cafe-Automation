using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Tips;

public class GetTipDto
{
    public int Id { get; set; }

    public int OrderId { get; set; }

    public string OrderNumber { get; set; } = string.Empty;

    public int? StaffMemberId { get; set; }

    public string? StaffMemberName { get; set; }

    public decimal Amount { get; set; }

    public PaymentMethod Method { get; set; }

    public DateTime GivenAt { get; set; }

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; }
}
