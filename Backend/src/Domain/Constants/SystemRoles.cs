namespace Cafe.Domain.Constants;

public static class SystemRoles
{
    public const string Admin = "Admin";
    public const string Manager = "Manager";
    public const string Waiter = "Waiter";
    public const string Cashier = "Cashier";
    public const string Kitchen = "Kitchen";

    // Self-registered customer account (client-app). Deliberately NOT part of `All` below -
    // that list validates staff self-registration role input (AuthController.Register,
    // Admin-only), and Client accounts are never StaffMembers (there is no matching
    // StaffRole.Client). Seeded separately in Program.cs.
    public const string Client = "Client";

    public static readonly string[] All = { Admin, Manager, Waiter, Cashier, Kitchen };
}
