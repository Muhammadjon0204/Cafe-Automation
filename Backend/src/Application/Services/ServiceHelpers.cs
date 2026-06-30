using Cafe.Domain.Entities;

namespace Cafe.Application.Services;

internal static class ServiceHelpers
{
    public static string? TrimToNull(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    public static string TrimRequired(string value)
    {
        return value.Trim();
    }

    public static bool HasMaxLength(string? value, int maxLength)
    {
        return value == null || value.Length <= maxLength;
    }

    public static string BuildFullName(string? firstName, string? middleName, string? lastName)
    {
        return string.Join(
            " ",
            new[] { firstName, middleName, lastName }
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x!.Trim()));
    }

    public static string BuildCustomerName(Customer? customer)
    {
        if (customer == null)
        {
            return string.Empty;
        }

        var fullName = BuildFullName(customer.FirstName, null, customer.LastName);
        if (!string.IsNullOrWhiteSpace(fullName))
        {
            return fullName;
        }

        return customer.Phone ?? customer.Email ?? string.Empty;
    }

    public static string BuildStaffName(StaffMember? staff)
    {
        return staff == null ? string.Empty : BuildFullName(staff.FirstName, staff.MiddleName, staff.LastName);
    }
}
