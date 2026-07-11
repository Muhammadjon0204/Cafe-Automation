using Cafe.Api.Common;
using Cafe.Application.DTOs.Staff;
using Cafe.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cafe.Api.Controllers;

[ApiController]
[Route("api/staff-members")]
[Authorize(Roles = RolePolicies.AdminManager)]
public class StaffMembersController : ControllerBase
{
    private readonly IStaffMemberService _staffMemberService;

    public StaffMembersController(IStaffMemberService staffMemberService)
    {
        _staffMemberService = staffMemberService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] StaffMemberFilterDto filter, CancellationToken cancellationToken)
    {
        var result = await _staffMemberService.GetAllAsync(filter, cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await _staffMemberService.GetByIdAsync(id, cancellationToken);
        return result.ToActionResult();
    }

    // Salary-bearing projection — Admin only.
    [HttpGet("admin")]
    [Authorize(Roles = RolePolicies.AdminOnly)]
    public async Task<IActionResult> GetAllAdmin([FromQuery] StaffMemberFilterDto filter, CancellationToken cancellationToken)
    {
        var result = await _staffMemberService.GetAllAdminAsync(filter, cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("admin/{id:int}")]
    [Authorize(Roles = RolePolicies.AdminOnly)]
    public async Task<IActionResult> GetByIdAdmin(int id, CancellationToken cancellationToken)
    {
        var result = await _staffMemberService.GetByIdAdminAsync(id, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPost]
    [Authorize(Roles = RolePolicies.AdminOnly)]
    public async Task<IActionResult> Create([FromBody] CreateStaffMemberDto dto, CancellationToken cancellationToken)
    {
        var result = await _staffMemberService.CreateAsync(dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = RolePolicies.AdminOnly)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateStaffMemberDto dto, CancellationToken cancellationToken)
    {
        var result = await _staffMemberService.UpdateAsync(id, dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = RolePolicies.AdminOnly)]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStaffStatusDto dto, CancellationToken cancellationToken)
    {
        var result = await _staffMemberService.UpdateStatusAsync(id, dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RolePolicies.AdminOnly)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var result = await _staffMemberService.DeleteAsync(id, cancellationToken);
        return result.ToActionResult();
    }
}
