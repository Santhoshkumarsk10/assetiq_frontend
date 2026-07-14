'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = localStorage.getItem('assetiq_token');
      if (saved) {
        setToken(saved);
        authApi.me().then(data => {
          setUser(data.user);
        }).catch(() => {
          localStorage.removeItem('assetiq_token');
          setToken(null);
        }).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const login = useCallback(async (loginIdentifier, password) => {
    const data = await authApi.login({ loginIdentifier, password });
    if (data.mfaRequired) {
      return data;
    }
    localStorage.setItem('assetiq_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const verifyMfaChallenge = useCallback(async (tempToken, otp, mfaSecret) => {
    const data = await authApi.verifyMfa({ tempToken, otp, mfaSecret });
    localStorage.setItem('assetiq_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch (e) { /* ignore */ }
    localStorage.removeItem('assetiq_token');
    setToken(null);
    setUser(null);
  }, []);

  const updateLocalUser = useCallback((updatedUser) => {
    setUser(updatedUser);
  }, []);

  const value = { user, token, loading, login, logout, verifyMfaChallenge, updateLocalUser, isAuthenticated: !!token };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
