using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.CafeTables;

public class UpdateCafeTableStatusDto
{
    public TableStatus Status { get; set; }
}
