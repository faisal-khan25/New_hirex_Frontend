import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { deduplicatedGet } from '../services/api';

const NotificationContext = createContext({ unreadCount: 0 });

// Poll every 30s as a fallback only — real-time updates come via WebSocket.
// PERF FIX: This is now the ONLY poller for unread counts in the whole app.
// Previously ManagerLayout (15s) and JobSeekerLayout (10s) each ran their
// OWN independent setInterval hitting the same endpoints, so up to three
// separate timers were firing duplicate network requests at any given
// moment. Navbar, ManagerLayout, and JobSeekerLayout all now read from
// this single context instead.
const POLL_INTERVAL = 30000;

const UNREAD_ENDPOINT = {
  JOBSEEKER: '/api/chat/jobseeker/unread-count',
  MANAGER:   '/api/chat/manager/unread-count',
};

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);

  const fetchUnread = useCallback(async () => {
    if (!user?.role) return;
    const endpoint = UNREAD_ENDPOINT[user.role];
    if (!endpoint) return;
    try {
      const { data } = await deduplicatedGet(endpoint);
      setUnreadCount(data.count || 0);
    } catch {
      // Silent — badge simply won't update if network fails
    }
  }, [user?.role]);

  useEffect(() => {
    setUnreadCount(0);
    if (!user?.role || !UNREAD_ENDPOINT[user.role]) return;

    fetchUnread();

    const startPolling = () => {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(fetchUnread, POLL_INTERVAL);
    };
    const stopPolling = () => clearInterval(intervalRef.current);

    // PERF FIX: pause polling while the tab is hidden/backgrounded so we
    // don't burn network requests and battery for a badge nobody is
    // looking at, then refresh immediately and resume when it's visible
    // again.
    const onVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchUnread();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user?.role, fetchUnread]);

  const decrementUnread = useCallback(() => {
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const resetUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Lets ChatWindow bump the badge immediately when a WebSocket NEW_MESSAGE
  // arrives, without waiting for the next 30s poll tick.
  const incrementUnread = useCallback(() => {
    setUnreadCount(prev => prev + 1);
  }, []);

  // PERF FIX: memoize the context value so consumers (Navbar, layouts)
  // don't re-render on every NotificationProvider render — only when
  // unreadCount itself (or one of the stable callbacks) actually changes.
  const value = useMemo(
    () => ({ unreadCount, fetchUnread, decrementUnread, resetUnread, incrementUnread }),
    [unreadCount, fetchUnread, decrementUnread, resetUnread, incrementUnread]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);