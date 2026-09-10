import { apiClient, type PagedData } from '@cafe/shared';

// Numeric Role/Status — no JsonStringEnumConverter is registered on the API, so these
// cross the wire as raw ints from Backend/src/Domain/Enums/{StaffRole,StaffStatus}.cs.
export interface StaffMember {
  id: number;
  identityUserId: string | null;
  firstName: string;
  lastName: string;
  middleName: string | null;
  fullName: string;
  phone: string | null;
  email: string | null;
  role: number;
  status: number;
  hireDate: string;
  firedDate: string | null;
  note: string | null;
  ordersCount: number;
  totalTips: number;
  salary?: number | null; // only present via the /admin projection (Admin role)
  createdAt: string;
  updatedAt: string | null;
}

export interface StaffFilter {
  search?: string;
  role?: number;
  status?: number;
  pageNumber?: number;
  pageSize?: number;
}

export interface StaffFormValues {
  firstName: string;
  lastName: string;
  middleName?: string;
  phone?: string;
  email?: string;
  role: number;
  status: number;
  hireDate: string;
  salary?: number;
  note?: string;
}

export function getStaff(filter: StaffFilter): Promise<PagedData<StaffMember>> {
  return apiClient.get<PagedData<StaffMember>>('/staff-members', { params: filter });
}

export function getStaffAdmin(filter: StaffFilter): Promise<PagedData<StaffMember>> {
  return apiClient.get<PagedData<StaffMember>>('/staff-members/admin', { params: filter });
}

export function createStaffMember(dto: StaffFormValues): Promise<StaffMember> {
  return apiClient.post<StaffMember>('/staff-members', dto);
}

export function updateStaffMember(id: number, dto: StaffFormValues): Promise<StaffMember> {
  return apiClient.put<StaffMember>(`/staff-members/${id}`, dto);
}

// Soft delete — StaffMemberService.DeleteAsync sets Status=Fired and stamps FiredDate
// rather than removing the row.
export function dismissStaffMember(id: number): Promise<void> {
  return apiClient.delete<void>(`/staff-members/${id}`);
}
