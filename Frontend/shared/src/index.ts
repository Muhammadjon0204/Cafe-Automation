export { useThemeTransition } from './theme/useThemeTransition';

export { apiClient, setConflictHandler, setUnauthorizedHandler } from './api/client';
export { ApiError } from './api/types';
export type { ApiResult, PagedData } from './api/types';

export { decodeJwt, isTokenExpired, ROLE_CLAIM } from './auth/jwt';
export type { DecodedAccessToken } from './auth/jwt';
export { getAccessToken, getRefreshToken, setTokens, clearTokens } from './auth/tokenStorage';
export { STAFF_ROLES, normalizeRoleClaim } from './auth/roles';
export type { StaffRole } from './auth/roles';

export type { Lang } from './i18n/types';

export { useRealtimeSync } from './realtime/useRealtimeSync';
export type { OrderChangedPayload, TableChangedPayload, RealtimeSyncOptions } from './realtime/useRealtimeSync';
