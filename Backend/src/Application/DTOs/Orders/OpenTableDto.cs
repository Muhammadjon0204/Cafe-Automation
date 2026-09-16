namespace Cafe.Application.DTOs.Orders;

public class OpenTableDto
{
    public int CafeTableId { get; set; }

    public int? WaiterId { get; set; }

    public string? Note { get; set; }

    // Only honored when the caller holds Admin - see RolePolicies matrix in the plan.
    // A non-Admin caller setting this to true gets an explicit failure, not a silent
    // downgrade to the normal block.
    public bool ForceOpen { get; set; }
}
