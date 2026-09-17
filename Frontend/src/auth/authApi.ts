import { apiClient } from '@cafe/shared';
import { clearTokens, getRefreshToken, setTokens } from './tokenStorage';

export interface AuthUser {
  userId: string;
  email: string;
  fullName: string;
  customerId: number;
}

interface UserInfoDto {
  userId: string;
  email: string;
  fullName: string;
  staffMemberId: number | null;
  staffRole: string | null;
  customerId: number | null;
}

interface CurrentUserDto {
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
  staffMemberId: number | null;
  customerId: number | null;
}

interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: UserInfoDto;
  roles: string[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterClientPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

// A staff (Admin/Waiter/...) account that somehow ends up here has no customerId - the
// client-app has nothing useful to do with that session, so it's treated as "not a customer"
// rather than silently rendering a broken account state.
function toAuthUser(dto: UserInfoDto | CurrentUserDto): AuthUser | null {
  if (dto.customerId == null) return null;
  return { userId: dto.userId, email: dto.email, fullName: dto.fullName, customerId: dto.customerId };
}

async function persistAndReturnUser(response: AuthResponseDto): Promise<AuthUser | null> {
  setTokens(response.accessToken, response.refreshToken);
  return toAuthUser(response.user);
}

export function login(payload: LoginPayload): Promise<AuthUser | null> {
  return apiClient.post<AuthResponseDto>('/auth/login', payload).then(persistAndReturnUser);
}

export function registerClient(payload: RegisterClientPayload): Promise<AuthUser | null> {
  return apiClient.post<AuthResponseDto>('/auth/register-client', payload).then(persistAndReturnUser);
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  clearTokens();
  if (!refreshToken) return;
  try {
    await apiClient.post('/auth/logout', { refreshToken });
  } catch {
    // Token is already cleared locally - a failed server-side revoke isn't worth surfacing.
  }
}

export function fetchMe(): Promise<AuthUser | null> {
  return apiClient.get<CurrentUserDto>('/auth/me').then(toAuthUser);
}
