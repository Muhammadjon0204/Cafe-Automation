import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../auth/tokenStorage';
import { ApiError, type ApiResult } from './types';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

/** Fires once a refresh attempt has failed (or there was no refresh token to
 * try) and a request still came back 401 — the host app wires this to "clear
 * the session and bounce to /login" since that requires router access this
 * framework-agnostic module doesn't have. */
type UnauthorizedHandler = () => void;
/** Fires on a 409 from the backend's DbUpdateConcurrencyException mapping
 * (see ExceptionHandlingMiddleware) — someone else wrote to the same row
 * first. The host app wires this to a toast with a refetch action. */
type ConflictHandler = (message: string) => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let conflictHandler: ConflictHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export function setConflictHandler(handler: ConflictHandler | null): void {
  conflictHandler = handler;
}

interface RefreshResponseData {
  accessToken: string;
  refreshToken: string;
}

// Concurrent 401s (several requests in flight when the access token expires)
// must share a single in-flight refresh call rather than each spending the
// refresh token — the backend revokes a refresh token once it's used, so a
// second parallel call would invalidate the first.
let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    // Bare axios, not the `http` instance — going through `http` would re-enter
    // these same interceptors and, if this call itself 401s, recurse forever.
    const response = await axios.post<ApiResult<RefreshResponseData>>(
      `${import.meta.env.VITE_API_BASE_URL}/auth/refresh-token`,
      { refreshToken },
    );
    if (!response.data.isSuccess || !response.data.data) return null;
    setTokens(response.data.data.accessToken, response.data.data.refreshToken);
    return response.data.data.accessToken;
  } catch {
    return null;
  }
}

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

interface RetriableConfig extends AxiosRequestConfig {
  _retried?: boolean;
}

http.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResult<unknown>;
    if (!body.isSuccess) {
      throw new ApiError(body.message, response.status, body.errors ?? []);
    }
    // Deliberately returns the unwrapped inner value, not an AxiosResponse —
    // apiClient's wrapper methods below are what actually give callers the
    // correct Promise<T> type; this cast just satisfies axios's own typing.
    return body.data as unknown as AxiosResponse;
  },
  async (error: AxiosError<ApiResult<unknown>>) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data;
    const message = body?.message ?? error.message;
    const errors = body?.errors ?? [];
    const config = error.config as RetriableConfig | undefined;
    const isAuthEndpoint = Boolean(config?.url && /\/auth\/(login|refresh-token)$/.test(config.url));

    if (status === 401 && config && !isAuthEndpoint) {
      if (!config._retried) {
        config._retried = true;
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          return http.request(config);
        }
      }
      clearTokens();
      unauthorizedHandler?.();
    }

    if (status === 409) {
      conflictHandler?.(message);
    }

    return Promise.reject(new ApiError(message, status, errors));
  },
);

/**
 * Thin typed wrapper over the axios instance: every method resolves with the
 * already-unwrapped `T` from the backend's `{isSuccess, message, data, errors}`
 * envelope (see the response interceptor above), not an AxiosResponse.
 */
export const apiClient = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return http.get(url, config) as unknown as Promise<T>;
  },
  post<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return http.post(url, body, config) as unknown as Promise<T>;
  },
  put<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return http.put(url, body, config) as unknown as Promise<T>;
  },
  patch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return http.patch(url, body, config) as unknown as Promise<T>;
  },
  // Some endpoints (e.g. OrdersController.RemoveItem) are body-carrying DELETEs
  // — pass the payload via config.data, matching axios's own convention.
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return http.delete(url, config) as unknown as Promise<T>;
  },
};
