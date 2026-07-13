import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setUnauthorizedHandler } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    try {
      const storedUser = await api.auth.getCurrentUser();
      if (storedUser) {
        setUser(storedUser);
        setIsAuthenticated(true);
      }
    } catch {
      // sesión no restaurable
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
    setUnauthorizedHandler(() => {
      setUser(null);
      setIsAuthenticated(false);
    });
  }, [restoreSession]);

  const login = useCallback(async (email, password) => {
    const result = await api.auth.login(email.trim().toLowerCase(), password);
    if (result.ok && result.data?.usuario) {
      setUser(result.data.usuario);
      setIsAuthenticated(true);
    }
    return result;
  }, []);

  const register = useCallback(async (userData) => {
    return api.auth.registro(userData);
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
