import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { scheduleLocalNotification, setBadgeCount } from '../lib/notifications';
import {
  fetchNotifications,
  markAllNotificationsRead as markAllReadQuery,
  markNotificationRead as markReadQuery,
} from '../lib/queries';
import { supabase } from '../lib/supabase';
import type { AppNotification } from '../lib/types';
import { useAuth } from './useAuth';

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  reload: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await fetchNotifications(userId);
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch {
      // notifications are non-critical — fail silently
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    load();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const fresh = await fetchNotifications(userId).catch(() => null);
          if (!fresh) return;
          setNotifications(fresh);
          setUnreadCount(fresh.filter((n) => !n.read).length);

          if (payload.eventType === 'INSERT') {
            const row = payload.new as Record<string, unknown>;
            const incoming = fresh.find((n) => n.id === String(row.id));
            if (incoming) {
              const actorName = incoming.actor?.fullName || incoming.actor?.username || '';
              scheduleLocalNotification(
                incoming.type,
                actorName,
                incoming.post?.title,
                incoming.post?.sparkedCount,
              );
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  useEffect(() => {
    setBadgeCount(unreadCount);
  }, [unreadCount]);

  const markRead = useCallback(async (id: string): Promise<void> => {
    await markReadQuery(id).catch(() => {});
    const wasUnread = notifications.some((n) => n.id === id && !n.read);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (wasUnread) setUnreadCount((count) => Math.max(0, count - 1));
  }, [notifications]);

  const markAllRead = useCallback(async (): Promise<void> => {
    if (!userId) return;
    await markAllReadQuery(userId).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    setBadgeCount(0);
  }, [userId]);

  return createElement(
    NotificationsContext.Provider,
    {
      value: { notifications, unreadCount, isLoading, markRead, markAllRead, reload: load },
    },
    children,
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return ctx;
}
