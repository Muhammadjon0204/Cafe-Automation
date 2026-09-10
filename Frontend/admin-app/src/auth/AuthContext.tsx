import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  apiClient,
  clearTokens,
  decodeJwt,
  getAccessToken,
  getRefreshToken,
  isTokenExpired,
  normalizeRoleClaim,
  ROLE_CLAIM,
  setConflictHandler,
  setTokens,
  setUnauthorizedHandler,
  type StaffRole,
} from '@cafe/shared';
import { pushToast } from '../components/toast/toastBus';
import { queryClient } from '../lib/queryClient';
import { ROUTES } from '../routes/routePaths';

interface UserInfoDto {
  userId: string;
  email: string;
  fullName: string;
  staffMemberId: number | null;
  staffRole: string | null;
}

interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: UserInfoDto;
  roles: string[];
}

export interface AuthUser {
  userId: string;
  email: string;
  fullName: string;
  staffMemberId: number | null;
  roles: StaffRole[];
}

export interface AuthContextValue {
  user: AuthUser | null;
  roles: StaffRole[];
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function userFromStoredToken(): AuthUser | null {
  const token = getAccessToken();
  if (!token) return null;

  const decoded = decodeJwt(token);
  if (!decoded || isTokenExpired(decoded)) {
    clearTokens();
    return null;
  }

  return {
    userId: decoded.sub,
    email: decoded.email,
    fullName: decoded.name,
    staffMemberId: decoded.staff_member_id ? Number(decoded.staff_member_id) : null,
    roles: normalizeRoleClaim(decoded[ROLE_CLAIM]),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Lazy initializer: decoding a stored JWT is synchronous local work, so the
  // very first render already knows whether we're authenticated — no loading
  // flicker, no false redirect-to-login flash on a hard reload.
  const [user, setUser] = useState<AuthUser | null>(userFromStoredToken);
  const navigate = useNavigate();

  // Wires the two cross-cutting failure paths from the framework-agnostic
  // apiClient (shared/api/client.ts) to app-specific behavior: a 401 that
  // survived a refresh attempt means the session is dead, so drop the user
  // and bounce to /login; a 409 means someone else wrote to the same row
  // first (DbUpdateConcurrencyException), so surface it as a toast with a
  // one-click refetch instead of silently failing.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      navigate(ROUTES.login, { replace: true });
    });
    setConflictHandler((message) => {
      pushToast(message || 'Данные были изменены другим пользователем.', {
        variant: 'error',
        actionLabel: 'Обновить',
        onAction: () => {
          void queryClient.invalidateQueries();
        },
      });
    });
    return () => {
      setUnauthorizedHandler(null);
      setConflictHandler(null);
    };
  }, [navigate]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient.post<AuthResponseDto>('/auth/login', { email, password });
    setTokens(response.accessToken, response.refreshToken);
    setUser({
      userId: response.user.userId,
      email: response.user.email,
      fullName: response.user.fullName,
      staffMemberId: response.user.staffMemberId,
      roles: normalizeRoleClaim(response.roles),
    });
  }, []);

  const logout = useCallback(() => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      apiClient.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    clearTokens();
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    roles: user?.roles ?? [],
    isAuthenticated: user !== null,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
