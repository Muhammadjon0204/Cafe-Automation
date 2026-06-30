using Cafe.Application.Common;
using Cafe.Application.DTOs.Customers;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Interfaces.Services;
using Cafe.Application.Results;
using Cafe.Domain.Entities;
using Cafe.Domain.Enums;

namespace Cafe.Application.Services;

public class CustomerService : ICustomerService
{
    private readonly ICustomerRepository _customerRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CustomerService(ICustomerRepository customerRepository, IUnitOfWork unitOfWork)
    {
        _customerRepository = customerRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<PagedResult<GetCustomerDto>>> GetAllAsync(CustomerFilterDto filter, CancellationToken cancellationToken = default)
    {
        var customers = await _customerRepository.GetAllAsync(cancellationToken);
        var query = customers.Where(x => !x.IsDeleted);

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim();
            query = query.Where(x =>
                (x.FirstName != null && x.FirstName.Contains(search, StringComparison.OrdinalIgnoreCase)) ||
                (x.LastName != null && x.LastName.Contains(search, StringComparison.OrdinalIgnoreCase)) ||
                (x.Phone != null && x.Phone.Contains(search, StringComparison.OrdinalIgnoreCase)) ||
                (x.Email != null && x.Email.Contains(search, StringComparison.OrdinalIgnoreCase)));
        }

        if (!string.IsNullOrWhiteSpace(filter.Phone)) query = query.Where(x => x.Phone == filter.Phone.Trim());
        if (!string.IsNullOrWhiteSpace(filter.Email)) query = query.Where(x => x.Email == filter.Email.Trim());
        if (filter.Status.HasValue) query = query.Where(x => x.Status == filter.Status.Value);

        var result = PaginationHelper.CreatePagedResult(query.OrderByDescending(x => x.CreatedAt).Select(MapToDto), filter.PageNumber, filter.PageSize);
        return Result<PagedResult<GetCustomerDto>>.Success(result);
    }

    public async Task<Result<GetCustomerDto>> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var customer = await _customerRepository.GetByIdAsync(id, cancellationToken);
        if (customer == null || customer.IsDeleted)
        {
            return Result<GetCustomerDto>.Failure("Customer not found.");
        }

        return Result<GetCustomerDto>.Success(MapToDto(customer));
    }

    public async Task<Result<GetCustomerDto>> CreateAsync(CreateCustomerDto dto, CancellationToken cancellationToken = default)
    {
        var validation = await ValidateAsync(dto.FirstName, dto.LastName, dto.Phone, dto.Email, dto.Note, dto.Status, null, cancellationToken);
        if (!validation.IsSuccess)
        {
            return Result<GetCustomerDto>.Failure(validation.Message, validation.Errors);
        }

        var customer = new Customer
        {
            FirstName = ServiceHelpers.TrimToNull(dto.FirstName),
            LastName = ServiceHelpers.TrimToNull(dto.LastName),
            Phone = ServiceHelpers.TrimToNull(dto.Phone),
            Email = ServiceHelpers.TrimToNull(dto.Email),
            Status = dto.Status,
            Note = ServiceHelpers.TrimToNull(dto.Note),
            RegisteredAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        await _customerRepository.AddAsync(customer, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<GetCustomerDto>.Success(MapToDto(customer), "Customer created.");
    }

    public async Task<Result<GetCustomerDto>> UpdateAsync(int id, UpdateCustomerDto dto, CancellationToken cancellationToken = default)
    {
        var customer = await _customerRepository.GetByIdAsync(id, cancellationToken);
        if (customer == null || customer.IsDeleted)
        {
            return Result<GetCustomerDto>.Failure("Customer not found.");
        }

        var validation = await ValidateAsync(dto.FirstName, dto.LastName, dto.Phone, dto.Email, dto.Note, dto.Status, id, cancellationToken);
        if (!validation.IsSuccess)
        {
            return Result<GetCustomerDto>.Failure(validation.Message, validation.Errors);
        }

        customer.FirstName = ServiceHelpers.TrimToNull(dto.FirstName);
        customer.LastName = ServiceHelpers.TrimToNull(dto.LastName);
        customer.Phone = ServiceHelpers.TrimToNull(dto.Phone);
        customer.Email = ServiceHelpers.TrimToNull(dto.Email);
        customer.Status = dto.Status;
        customer.Note = ServiceHelpers.TrimToNull(dto.Note);
        customer.UpdatedAt = DateTime.UtcNow;

        _customerRepository.Update(customer);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<GetCustomerDto>.Success(MapToDto(customer), "Customer updated.");
    }

    public async Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var customer = await _customerRepository.GetByIdAsync(id, cancellationToken);
        if (customer == null || customer.IsDeleted)
        {
            return Result.Failure("Customer not found.");
        }

        customer.IsDeleted = true;
        customer.Status = CustomerStatus.Blocked;
        customer.UpdatedAt = DateTime.UtcNow;
        _customerRepository.Update(customer);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success("Customer deleted.");
    }

    private async Task<Result> ValidateAsync(string? firstName, string? lastName, string? phone, string? email, string? note, CustomerStatus status, int? excludeId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(firstName) && string.IsNullOrWhiteSpace(lastName) && string.IsNullOrWhiteSpace(phone) && string.IsNullOrWhiteSpace(email)) return Result.Failure("At least one customer identifier is required.");
        if (!ServiceHelpers.HasMaxLength(firstName, 100)) return Result.Failure("First name must be 100 characters or less.");
        if (!ServiceHelpers.HasMaxLength(lastName, 100)) return Result.Failure("Last name must be 100 characters or less.");
        if (!ServiceHelpers.HasMaxLength(phone, 30)) return Result.Failure("Phone must be 30 characters or less.");
        if (!ServiceHelpers.HasMaxLength(email, 150)) return Result.Failure("Email must be 150 characters or less.");
        if (!ServiceHelpers.HasMaxLength(note, 500)) return Result.Failure("Note must be 500 characters or less.");
        if (!Enum.IsDefined(typeof(CustomerStatus), status)) return Result.Failure("Invalid customer status.");
        if (!string.IsNullOrWhiteSpace(phone) && await _customerRepository.PhoneExistsAsync(phone.Trim(), excludeId, cancellationToken)) return Result.Failure("Phone already exists.");
        if (!string.IsNullOrWhiteSpace(email) && await _customerRepository.EmailExistsAsync(email.Trim(), excludeId, cancellationToken)) return Result.Failure("Email already exists.");
        return Result.Success();
    }

    private static GetCustomerDto MapToDto(Customer customer)
    {
        return new GetCustomerDto
        {
            Id = customer.Id,
            FirstName = customer.FirstName,
            LastName = customer.LastName,
            FullName = ServiceHelpers.BuildFullName(customer.FirstName, null, customer.LastName),
            Phone = customer.Phone,
            Email = customer.Email,
            RegisteredAt = customer.RegisteredAt,
            Status = customer.Status,
            Note = customer.Note,
            OrdersCount = customer.Orders?.Count(x => !x.IsDeleted) ?? 0,
            CreatedAt = customer.CreatedAt,
            UpdatedAt = customer.UpdatedAt
        };
    }
}
