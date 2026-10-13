import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getUnreadNotificationCount } from '../services/notificationApi';

type NotificationContextValue = {
  unreadCount: number;
  loading: boolean;
  refreshUnreadCount: () => Promise<void>;
  consumeUnread: (count?: number) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);
const POLL_INTERVAL_MS = 30_000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshUnreadCount = useCallback(async () => {
    try {
      setUnreadCount(Math.max(0, await getUnreadNotificationCount()));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!active || document.visibilityState !== 'visible') return;
      await refreshUnreadCount().catch(() => undefined);
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, POLL_INTERVAL_MS);
    const onVisibilityChange = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refreshUnreadCount]);

  const value = useMemo<NotificationContextValue>(() => ({
    unreadCount,
    loading,
    refreshUnreadCount,
    consumeUnread: (count = 1) => setUnreadCount(current => Math.max(0, current - count)),
  }), [loading, refreshUnreadCount, unreadCount]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('NotificationProvider 안에서 사용해야 합니다.');
  return context;
}
