import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { api } from '../services/api';

const NotificationCountContext = createContext(null);

const POLL_INTERVAL_MS = 30000;

export function NotificationCountProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await api.notificaciones.contarSinLeer();
      setUnreadCount(res?.data?.sin_leer ?? 0);
    } catch (e) {
      // Silencioso: conserva el conteo anterior si falla.
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      subscription?.remove?.();
    };
  }, [refresh]);

  return (
    <NotificationCountContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </NotificationCountContext.Provider>
  );
}

export function useNotificationCount() {
  const ctx = useContext(NotificationCountContext);
  if (!ctx) {
    return { unreadCount: 0, refresh: async () => {} };
  }
  return ctx;
}
