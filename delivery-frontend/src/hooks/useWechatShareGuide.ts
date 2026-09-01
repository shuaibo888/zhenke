import { useCallback, useEffect, useRef, useState } from 'react';

type PrepareWechatShare = (forceRegistration?: boolean) => Promise<void>;

/**
 * Opens the native WeChat menu guide only after both JS-SDK share cards have
 * been registered successfully. Keeping this state outside detail pages makes
 * every share entry follow the same preparation and dismissal contract.
 */
export function useWechatShareGuide(prepareWechatShare: PrepareWechatShare) {
  const [open, setOpen] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const show = useCallback(async () => {
    await prepareWechatShare(true);
    if (mountedRef.current) setOpen(true);
  }, [prepareWechatShare]);

  const close = useCallback(() => setOpen(false), []);

  return { open, show, close };
}
