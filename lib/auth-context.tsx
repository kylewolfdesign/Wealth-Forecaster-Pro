import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiRequest, getApiUrl } from '@/lib/query-client';
import { loadPortfolioFromServer, hydrateStoreFromServer, debouncedSaveToServer } from '@/lib/portfolio-sync';
import { useAppStore } from '@/lib/store';

interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, confirmPassword: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function extractErrorMessage(error: unknown, fallback: string): string {
  const msg = error instanceof Error ? error.message : fallback;
  const cleaned = msg.replace(/^\d+:\s*/, '');
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed === 'object' && parsed !== null && 'message' in parsed) {
      return String(parsed.message);
    }
  } catch {
  }
  return cleaned;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (user) {
      const unsub = useAppStore.subscribe(() => {
        debouncedSaveToServer();
      });
      return unsub;
    }
  }, [user]);

  const checkSession = async () => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL('/api/auth/me', baseUrl);
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        try {
          const portfolioData = await loadPortfolioFromServer();
          if (portfolioData) {
            hydrateStoreFromServer(portfolioData);
          }
        } catch {
        }
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    try {
      const res = await apiRequest('POST', '/api/auth/login', { email, password, rememberMe });
      const data = await res.json();
      setUser(data.user);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: extractErrorMessage(error, 'Login failed') };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, confirmPassword: string, rememberMe = false) => {
    try {
      const res = await apiRequest('POST', '/api/auth/register', { email, password, confirmPassword, rememberMe });
      const data = await res.json();
      setUser(data.user);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: extractErrorMessage(error, 'Registration failed') };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
    } catch {
    }
    setUser(null);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      await apiRequest('POST', '/api/auth/change-password', { currentPassword, newPassword });
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: extractErrorMessage(error, 'Failed to change password') };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
