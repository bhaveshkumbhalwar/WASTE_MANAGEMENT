import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, getMe } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Session key — changes on every login, forces child components to remount
  const [sessionKey, setSessionKey] = useState(0);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('wms_token');
    if (token) {
      getMe()
        .then((res) => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem('wms_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (userId, password, role) => {
    const res = await loginUser({ userId, password, role });
    localStorage.setItem('wms_token', res.data.token);
    setUser(res.data.user);
    // Increment session key to force all dashboard components to remount with fresh state
    setSessionKey((k) => k + 1);
    console.log(`🔑 [AUTH] Logged in as ${res.data.user.userId} | role: ${res.data.user.role} | block: ${res.data.user.block || 'N/A'}`);
    return res.data.user;
  }, []);

  const register = useCallback(async (data) => {
    const res = await registerUser(data);
    localStorage.setItem('wms_token', res.data.token);
    setUser(res.data.user);
    setSessionKey((k) => k + 1);
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    console.log('🔓 [AUTH] Logging out — clearing all state');
    localStorage.removeItem('wms_token');
    setUser(null);
    // Increment session key so next login gets completely fresh components
    setSessionKey((k) => k + 1);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await getMe();
      setUser(res.data.user);
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, sessionKey }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
