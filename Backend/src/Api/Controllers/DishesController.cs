using Cafe.Api.Common;
using Cafe.Application.DTOs.Dishes;
using Cafe.Application.Interfaces.Services;
using Cafe.Application.Results;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;

namespace Cafe.Api.Controllers;

[ApiController]
[Route("api/dishes")]
public class DishesController : ControllerBase
{
    // Kept in sync with the client-side accept/validation in DishEditorDrawer.tsx.
    private static readonly Dictionary<string, string> AllowedPhotoContentTypes = new()
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
    };
    private const long MaxPhotoFileSizeBytes = 8 * 1024 * 1024;

    private readonly IDishService _dishService;
    private readonly IWebHostEnvironment _webHostEnvironment;

    public DishesController(IDishService dishService, IWebHostEnvironment webHostEnvironment)
    {
        _dishService = dishService;
        _webHostEnvironment = webHostEnvironment;
    }

    // Public menu browsing (no CostPrice) — no account required.
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] DishFilterDto filter, CancellationToken cancellationToken)
    {
        var result = await _dishService.GetAllAsync(filter, cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await _dishService.GetByIdAsync(id, cancellationToken);
        return result.ToActionResult();
    }

    // Admin-only projection that includes CostPrice.
    [HttpGet("admin")]
    [Authorize(Roles = RolePolicies.AdminOnly)]
    public async Task<IActionResult> GetAllAdmin([FromQuery] DishFilterDto filter, CancellationToken cancellationToken)
    {
        var result = await _dishService.GetAllAdminAsync(filter, cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("admin/{id:int}")]
    [Authorize(Roles = RolePolicies.AdminOnly)]
    public async Task<IActionResult> GetByIdAdmin(int id, CancellationToken cancellationToken)
    {
        var result = await _dishService.GetByIdAdminAsync(id, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPost]
    [Authorize(Roles = RolePolicies.AdminManager)]
    public async Task<IActionResult> Create([FromBody] CreateDishDto dto, CancellationToken cancellationToken)
    {
        var result = await _dishService.CreateAsync(dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = RolePolicies.AdminManager)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateDishDto dto, CancellationToken cancellationToken)
    {
        var result = await _dishService.UpdateAsync(id, dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPatch("{id:int}/availability")]
    [Authorize(Roles = RolePolicies.AdminManagerWaiter)]
    public async Task<IActionResult> UpdateAvailability(int id, [FromBody] UpdateDishAvailabilityDto dto, CancellationToken cancellationToken)
    {
        var result = await _dishService.UpdateAvailabilityAsync(id, dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RolePolicies.AdminManager)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var result = await _dishService.DeleteAsync(id, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPost("{id:int}/restore")]
    [Authorize(Roles = RolePolicies.AdminManager)]
    public async Task<IActionResult> Restore(int id, CancellationToken cancellationToken)
    {
        var result = await _dishService.RestoreAsync(id, cancellationToken);
        return result.ToActionResult();
    }

    // Simple upload, not a full asset-management flow (same approach as
    // ZonesController.UploadBackground): saves under wwwroot/uploads/dishes and hands back
    // the resulting relative URL. Not id-scoped like the zone background upload — a dish photo
    // is picked while composing the create-dish form too, before any Dish row exists yet — so
    // this just returns a URL for the client to put on DishFormValues.imageUrl like any other
    // string it could have pasted in manually. No dish row is touched here.
    [HttpPost("photo-uploads")]
    [Authorize(Roles = RolePolicies.AdminManager)]
    [RequestSizeLimit(MaxPhotoFileSizeBytes)]
    public async Task<IActionResult> UploadPhoto(IFormFile? file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return Result<UploadedFileDto>.Failure("Photo file is required.").ToActionResult();
        }
        if (file.Length > MaxPhotoFileSizeBytes)
        {
            return Result<UploadedFileDto>.Failure("Image must be 8 MB or smaller.").ToActionResult();
        }
        if (!AllowedPhotoContentTypes.TryGetValue(file.ContentType, out var extension))
        {
            return Result<UploadedFileDto>.Failure("Only JPEG, PNG, or WebP images are allowed.").ToActionResult();
        }

        var webRootPath = _webHostEnvironment.WebRootPath ?? Path.Combine(_webHostEnvironment.ContentRootPath, "wwwroot");
        var uploadsDirectory = Path.Combine(webRootPath, "uploads", "dishes");
        Directory.CreateDirectory(uploadsDirectory);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadsDirectory, fileName);

        await using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        return Result<UploadedFileDto>.Success(new UploadedFileDto { Url = $"/uploads/dishes/{fileName}" }).ToActionResult();
    }
}
