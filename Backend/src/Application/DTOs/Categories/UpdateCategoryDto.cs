namespace Cafe.Application.DTOs.Categories;

public class UpdateCategoryDto
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsActive { get; set; }
}
