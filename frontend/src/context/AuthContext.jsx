import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAccessToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.post('/auth/refresh', undefined)
      .then((payload) => {
        if (!mounted) return;
        setAccessToken(payload.data.accessToken);
        setUser(payload.data.user);
      })
      .catch(() => {
        setAccessToken(null);
        if (mounted) setUser(null);
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const login = async (credentials) => {
    const payload = await api.post('/auth/login', credentials);
    setAccessToken(payload.data.accessToken);
    setUser(payload.data.user);
    return payload.data.user;
  };

  const register = async (form) => {
    const payload = await api.post('/auth/register', form);
    setAccessToken(payload.data.accessToken);
    setUser(payload.data.user);
    return payload.data.user;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const updateProfile = async (form) => {
    const payload = await api.put('/auth/profile', form, { auth: true });
    setUser(payload.data);
    return payload.data;
  };

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    updateProfile,
    setUser,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth phải được dùng bên trong AuthProvider');
  return context;
};
