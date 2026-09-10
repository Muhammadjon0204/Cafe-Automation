using Cafe.Api.Common;
using Cafe.Application.DTOs.Zones;
using Cafe.Application.Interfaces.Services;
using Cafe.Application.Results;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;

namespace Cafe.Api.Controllers;

[ApiController]
[Route("api/zones")]
public class ZonesController : ControllerBase
{
    // Kept in sync with the client-side accept/validation in ZoneManagerModal.tsx.
    private static readonly Dictionary<string, string> AllowedContentTypes = new()
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
    };
    private const long MaxBackgroundFileSizeBytes = 8 * 1024 * 1024;

    private readonly IZoneService _zoneService;
    private readonly IWebHostEnvironment _webHostEnvironment;

    public ZonesController(IZoneService zoneService, IWebHostEnvironment webHostEnvironment)
    {
        _zoneService = zoneService;
        _webHostEnvironment = webHostEnvironment;
    }

    // Read access is public, mirroring CafeTablesController's GET endpoints.
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var result = await _zoneService.GetAllAsync(cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await _zoneService.GetByIdAsync(id, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPost]
    [Authorize(Roles = RolePolicies.AdminOnly)]
    public async Task<IActionResult> Create([FromBody] CreateZoneDto dto, CancellationToken cancellationToken)
    {
        var result = await _zoneService.CreateAsync(dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = RolePolicies.AdminOnly)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateZoneDto dto, CancellationToken cancellationToken)
    {
        var result = await _zoneService.UpdateAsync(id, dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RolePolicies.AdminOnly)]
    public async Task<IActionResult> Delete(int id, [FromQuery] bool force, CancellationToken cancellationToken)
    {
        var result = await _zoneService.DeleteAsync(id, force, cancellationToken);
        return result.ToActionResult();
    }

    // Simple upload/replace, not a full asset-management flow (per CLAUDE.md's /tables scope
    // note): saves under wwwroot/uploads/zones and stores the resulting relative URL on the
    // zone. Editor-mode/Admin-only, mirroring the rest of this controller's write endpoints.
    [HttpPost("{id:int}/background")]
    [Authorize(Roles = RolePolicies.AdminOnly)]
    [RequestSizeLimit(MaxBackgroundFileSizeBytes)]
    public async Task<IActionResult> UploadBackground(int id, IFormFile? file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return Result<GetZoneDto>.Failure("Background image file is required.").ToActionResult();
        }
        if (file.Length > MaxBackgroundFileSizeBytes)
        {
            return Result<GetZoneDto>.Failure("Image must be 8 MB or smaller.").ToActionResult();
        }
        if (!AllowedContentTypes.TryGetValue(file.ContentType, out var extension))
        {
            return Result<GetZoneDto>.Failure("Only JPEG, PNG, or WebP images are allowed.").ToActionResult();
        }

        var existing = await _zoneService.GetByIdAsync(id, cancellationToken);
        if (!existing.IsSuccess)
        {
            return existing.ToActionResult();
        }

        var webRootPath = _webHostEnvironment.WebRootPath ?? Path.Combine(_webHostEnvironment.ContentRootPath, "wwwroot");
        var uploadsDirectory = Path.Combine(webRootPath, "uploads", "zones");
        Directory.CreateDirectory(uploadsDirectory);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadsDirectory, fileName);

        await using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var result = await _zoneService.UpdateBackgroundAsync(
            id,
            new UpdateZoneBackgroundDto { BackgroundImageUrl = $"/uploads/zones/{fileName}" },
            cancellationToken);

        if (!result.IsSuccess)
        {
            System.IO.File.Delete(filePath);
            return result.ToActionResult();
        }

        DeleteLocalUploadIfPresent(existing.Data?.BackgroundImageUrl, webRootPath);
        return result.ToActionResult();
    }

    [HttpDelete("{id:int}/background")]
    [Authorize(Roles = RolePolicies.AdminOnly)]
    public async Task<IActionResult> RemoveBackground(int id, CancellationToken cancellationToken)
    {
        var existing = await _zoneService.GetByIdAsync(id, cancellationToken);
        if (!existing.IsSuccess)
        {
            return existing.ToActionResult();
        }

        var result = await _zoneService.UpdateBackgroundAsync(id, new UpdateZoneBackgroundDto { BackgroundImageUrl = null }, cancellationToken);
        if (result.IsSuccess)
        {
            var webRootPath = _webHostEnvironment.WebRootPath ?? Path.Combine(_webHostEnvironment.ContentRootPath, "wwwroot");
            DeleteLocalUploadIfPresent(existing.Data?.BackgroundImageUrl, webRootPath);
        }

        return result.ToActionResult();
    }

    // Best-effort cleanup of the previous file on replace/remove — a lingering lock (e.g. an
    // AV scanner) shouldn't turn an otherwise-successful background update into a 500.
    private static void DeleteLocalUploadIfPresent(string? backgroundImageUrl, string webRootPath)
    {
        if (string.IsNullOrEmpty(backgroundImageUrl) || !backgroundImageUrl.StartsWith("/uploads/zones/", StringComparison.Ordinal))
        {
            return;
        }

        try
        {
            var physicalPath = Path.Combine(webRootPath, backgroundImageUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(physicalPath))
            {
                System.IO.File.Delete(physicalPath);
            }
        }
        catch (IOException)
        {
        }
    }
}
