namespace Cafe.Application.DTOs.Categories;

public class CreateCategoryDto
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }
}
