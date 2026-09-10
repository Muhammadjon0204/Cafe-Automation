export const STAFF_ROLES = ['Admin', 'Manager', 'Waiter', 'Cashier', 'Kitchen'] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

function isStaffRole(value: string): value is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(value);
}

/**
 * Normalizes a raw JWT role-claim value to StaffRole[]. .NET serializes a
 * single role claim as a bare string and 2+ roles as a JSON array, so both
 * shapes have to be handled here rather than at every call site.
 */
export function normalizeRoleClaim(value: unknown): StaffRole[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw.filter((v): v is string => typeof v === 'string').filter(isStaffRole);
}
