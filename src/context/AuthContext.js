'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // M-01 Fix: No longer reads from localStorage.
  // Session is restored via the httpOnly cookie automatically sent to /auth/me.
  useEffect(() => {
    const timer = setTimeout(() => {
      authApi.me()
        .then(data => setUser(data.user))
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const login = useCallback(async (loginIdentifier, password) => {
    const data = await authApi.login({ loginIdentifier, password });
    if (data.mfaRequired) {
      return data;
    }
    // M-01 Fix: Do NOT store token in localStorage.
    // The backend sets an httpOnly cookie; all subsequent requests use that cookie.
    setUser(data.user);
    return data;
  }, []);

  const verifyMfaChallenge = useCallback(async (tempToken, otp) => {
    // H-03 Fix: mfaSecret is no longer sent from the client — backend reads from DB
    const data = await authApi.verifyMfa({ tempToken, otp });
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch (e) { /* ignore */ }
    // M-01 Fix: No localStorage to clear.
    setUser(null);
  }, []);

  const updateLocalUser = useCallback((updatedUser) => {
    setUser(updatedUser);
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    verifyMfaChallenge,
    updateLocalUser,
    isAuthenticated: !!user,
    // 'token' is intentionally removed — auth is cookie-based
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
