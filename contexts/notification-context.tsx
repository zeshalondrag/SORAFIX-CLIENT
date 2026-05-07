import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { isRead, notificationsApi, type Notification } from '@/lib/notifications-api';

type NotificationContextValue = {
  unreadCount: number;
  notifications: Notification[];
  loading: boolean;
  /** Перезагрузить список уведомлений с сервера */
  refresh: () => Promise<void>;
  /** Пометить одно уведомление как прочитанное (обновляет и список, и счётчик) */
  markAsRead: (id: number) => Promise<void>;
  /** Пометить все уведомления как прочитанные */
  markAllAsRead: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  notifications: [],
  loading: true,
  refresh: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter((n) => !isRead(n)).length;

  const refresh = useCallback(async () => {
    try {
      const data = await notificationsApi.getNotifications();
      setNotifications(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Загрузка при старте + периодическое обновление
  useEffect(() => {
    if (!user || authLoading) return;
    refresh();
    const interval = setInterval(refresh, 1500);
    return () => clearInterval(interval);
  }, [user, authLoading, refresh]);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, isRead: true, is_read: true } : n
        )
      );
    } catch {
      // ignore
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, is_read: true }))
      );
    } catch {
      // ignore
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{ unreadCount, notifications, loading, refresh, markAsRead, markAllAsRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
