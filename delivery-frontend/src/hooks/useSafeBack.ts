import { useCallback } from 'react';
import { useNavigate } from 'umi';
import { safeInternalRedirect } from '@/utils/safeRedirect';

type BrowserHistoryState = {
  idx?: unknown;
};

/**
 * Return to an actual in-app predecessor when one exists. A shared link or a
 * refreshed detail page starts at history index 0, so it uses a deterministic
 * business parent instead of doing nothing or leaving the application.
 */
export function useSafeBack(fallback: string) {
  const navigate = useNavigate();
  const safeFallback = safeInternalRedirect(fallback);

  return useCallback(() => {
    const historyIndex = (window.history.state as BrowserHistoryState | null)?.idx;
    if (typeof historyIndex === 'number' && historyIndex > 0) {
      navigate(-1);
      return;
    }
    navigate(safeFallback, { replace: true });
  }, [navigate, safeFallback]);
}
