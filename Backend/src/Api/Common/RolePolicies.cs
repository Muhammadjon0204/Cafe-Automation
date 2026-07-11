using Cafe.Domain.Constants;

namespace Cafe.Api.Common;

// Named role groups for [Authorize(Roles = ...)]. See the RBAC matrix in the session report
// for the reasoning behind each combination — Manager/Cashier placement in particular is an
// assumption filled in where the spec did not define them explicitly.
public static class RolePolicies
{
    public const string AdminOnly = SystemRoles.Admin;

    public const string AdminManager = SystemRoles.Admin + "," + SystemRoles.Manager;

    public const string AdminManagerWaiter = AdminManager + "," + SystemRoles.Waiter;

    public const string AdminManagerCashier = AdminManager + "," + SystemRoles.Cashier;

    public const string AdminManagerWaiterCashier = AdminManagerWaiter + "," + SystemRoles.Cashier;

    public const string AdminManagerWaiterKitchen = AdminManagerWaiter + "," + SystemRoles.Kitchen;

    public const string AllStaff = AdminManagerWaiterCashier + "," + SystemRoles.Kitchen;
}
