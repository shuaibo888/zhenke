import { message } from 'antd';
import { useEffect } from 'react';
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

  useEffect(() => {
    if (normalizedPath(location.pathname) !== normalizedPath(routePath)) return undefined;
    let active = true;
    void refresh().catch((error) => {
      if (active && !(error instanceof AuthExpiredError)) {
        message.error(error instanceof Error ? error.message : errorMessage);
      }
    });
    return () => {
      active = false;
    };
  }, [errorMessage, location.pathname, refresh, routePath]);
}
