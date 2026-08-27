import { message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'umi';
import { AuthExpiredError } from '@/services/apiClient';

function normalizedPath(pathname: string) {
  return pathname.replace(/\/+$/, '') || '/';
}

export function useRefreshOnRoute(
  routePath: string,
  refresh: () => Promise<void>,
  errorMessage: string,
) {
  const location = useLocation();
  const requestVersion = useRef(0);
  const [refreshError, setRefreshError] = useState('');

  const retry = useCallback(async () => {
    const version = ++requestVersion.current;
    setRefreshError('');
    try {
      await refresh();
    } catch (error) {
      if (requestVersion.current !== version || error instanceof AuthExpiredError) return;
      const reason = error instanceof Error ? error.message : errorMessage;
      setRefreshError(reason);
      message.error(reason);
    }
  }, [errorMessage, refresh]);

  useEffect(() => {
    if (normalizedPath(location.pathname) !== normalizedPath(routePath)) return undefined;
    void retry();
    return () => {
      requestVersion.current += 1;
    };
  }, [location.pathname, retry, routePath]);

  return { refreshError, retry };
}
