import type { StaffRole } from '@cafe/shared';

// Mirrors Backend/src/Api/Common/RolePolicies.cs's named groups. Dashboard,
// Orders, Menu, and Reservations are deliberately absent — every staff role
// touches those day-to-day, so they stay open to any authenticated user.
//
// kitchen/waiter are UI-only gates, not a new authorization boundary: both
// pages call the same /api/orders endpoints OrdersPage already uses (PATCH
// .../status is [Authorize(Roles = AllStaff)] on the backend, with
// OrderService.UpdateStatusAsync itself restricting a Kitchen-only caller to
// the Accepted/Cooking/Ready targets — see CanMoveToStatus/IsKitchenOnly).
// Admin/Manager are included on both so they retain full visibility.
export const ROUTE_ROLES: Record<string, StaffRole[]> = {
  staff: ['Admin', 'Manager'],
  reports: ['Admin', 'Manager'],
  settings: ['Admin'],
  kitchen: ['Admin', 'Manager', 'Kitchen'],
  waiter: ['Admin', 'Manager', 'Waiter'],
};
