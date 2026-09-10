import type { StaffRole } from '@cafe/shared';

// Mirrors Backend/src/Api/Common/RolePolicies.cs's named groups. Dashboard,
// Orders, Menu, and Reservations are deliberately absent — every staff role
// touches those day-to-day, so they stay open to any authenticated user.
export const ROUTE_ROLES: Record<string, StaffRole[]> = {
  staff: ['Admin', 'Manager'],
  reports: ['Admin', 'Manager'],
  settings: ['Admin'],
};
