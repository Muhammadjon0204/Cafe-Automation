namespace Cafe.Domain.Constants;

public static class SystemRoles
{
    public const string Admin = "Admin";
    public const string Manager = "Manager";
    public const string Waiter = "Waiter";
    public const string Cashier = "Cashier";
    public const string Kitchen = "Kitchen";

    public static readonly string[] All = { Admin, Manager, Waiter, Cashier, Kitchen };
}
