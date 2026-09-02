import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchUnreadNotificationCount } from '@/services/notifications';

export function useUnreadNotificationCount(accountKey?: number | string | null) {
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    if (accountKey == null) {
      setUnreadCount(null);
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const nextCount = await fetchUnreadNotificationCount();
      if (version !== requestVersion.current) return;
      setUnreadCount(nextCount);
      setError('');
    } catch (reason) {
      if (version !== requestVersion.current) return;
      setUnreadCount(null);
      setError(reason instanceof Error ? reason.message : '未读消息数量加载失败');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [accountKey]);

  useEffect(() => {
    void refresh();
    return () => {
      requestVersion.current += 1;
    };
  }, [refresh]);

  return { unreadCount, loading, error, refresh, setUnreadCount };
}
