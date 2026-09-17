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
  const [user, setUser] = useState<AuthUser | null>(userFromStoredToken);
  const navigate = useNavigate();

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
