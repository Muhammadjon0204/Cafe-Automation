import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { decodeJwt, isTokenExpired } from '@cafe/shared';
import { clearTokens, getAccessToken } from './tokenStorage';
import {
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  registerClient as apiRegisterClient,
  type AuthUser,
  type LoginPayload,
  type RegisterClientPayload,
} from './authApi';

// What the visitor was trying to do when the auth gate stopped them - lets the modal show a
// contextual message ("Log in to book a table" vs "...to place an order") instead of a generic one.
export type AuthIntent = 'reserve' | 'order' | null;

interface AuthContextValue {
  customer: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isModalOpen: boolean;
  modalIntent: AuthIntent;
  modalTab: 'login' | 'register';
  login(payload: LoginPayload): Promise<void>;
  registerClient(payload: RegisterClientPayload): Promise<void>;
  logout(): Promise<void>;
  // If already logged in, runs onReady immediately and returns true. Otherwise opens the auth
  // modal (seeded with `intent`) and queues onReady to run right after a successful
  // login/registration - so a guest who hits "book a table" isn't dropped back to a blank form
  // after signing in, the booking just goes through.
  requireAuth(intent: AuthIntent, onReady: () => void): boolean;
  openAuthModal(intent: AuthIntent, tab?: 'login' | 'register'): void;
  closeAuthModal(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIntent, setModalIntent] = useState<AuthIntent>(null);
  const [modalTab, setModalTab] = useState<'login' | 'register'>('login');
  // A ref, not state: this is a stash for the gated action, not something that's ever rendered -
  // storing it in state would need a placeholder unused-value workaround for noUnusedLocals.
  const pendingActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || isTokenExpired(decodeJwt(token))) {
      setIsLoading(false);
      return;
    }
    fetchMe()
      .then(setCustomer)
      .catch(() => {
        clearTokens();
        setCustomer(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const runPendingAction = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action?.();
  }, []);

  const openAuthModal = useCallback((intent: AuthIntent, tab: 'login' | 'register' = 'login') => {
    setModalIntent(intent);
    setModalTab(tab);
    setIsModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsModalOpen(false);
    pendingActionRef.current = null;
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const user = await apiLogin(payload);
      setCustomer(user);
      setIsModalOpen(false);
      runPendingAction();
    },
    [runPendingAction],
  );

  const registerClient = useCallback(
    async (payload: RegisterClientPayload) => {
      const user = await apiRegisterClient(payload);
      setCustomer(user);
      setIsModalOpen(false);
      runPendingAction();
    },
    [runPendingAction],
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setCustomer(null);
  }, []);

  const requireAuth = useCallback(
    (intent: AuthIntent, onReady: () => void): boolean => {
      if (customer) {
        onReady();
        return true;
      }
      pendingActionRef.current = onReady;
      openAuthModal(intent);
      return false;
    },
    [customer, openAuthModal],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      customer,
      isAuthenticated: customer != null,
      isLoading,
      isModalOpen,
      modalIntent,
      modalTab,
      login,
      registerClient,
      logout,
      requireAuth,
      openAuthModal,
      closeAuthModal,
    }),
    [customer, isLoading, isModalOpen, modalIntent, modalTab, login, registerClient, logout, requireAuth, openAuthModal, closeAuthModal],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
