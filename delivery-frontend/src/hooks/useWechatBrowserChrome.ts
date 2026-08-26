import { useEffect } from 'react';
import { isWechatBrowser } from '@/hooks/useWechatShare';

const APP_TITLE = '㤫者商城';

function routeTitle(pathname: string) {
  if (pathname === '/') return APP_TITLE;
  if (pathname.startsWith('/mall')) return `商城｜${APP_TITLE}`;
  if (pathname.startsWith('/products/')) return `商品详情｜${APP_TITLE}`;
  if (pathname.startsWith('/merchants/')) return `商家详情｜${APP_TITLE}`;
  if (pathname.startsWith('/reports/')) return `甄客验详情｜${APP_TITLE}`;
  if (pathname.startsWith('/checkout/success')) return `下单成功｜${APP_TITLE}`;
  if (pathname.startsWith('/checkout')) return `确认订单｜${APP_TITLE}`;
  if (pathname.startsWith('/profile/orders/')) return `订单详情｜${APP_TITLE}`;
  if (pathname.startsWith('/profile/orders')) return `我的订单｜${APP_TITLE}`;
  if (pathname.startsWith('/profile/trials/')) return `试用详情｜${APP_TITLE}`;
  if (pathname.startsWith('/profile/trials')) return `我的试用｜${APP_TITLE}`;
  if (pathname.startsWith('/profile/coupons/')) return `优惠券详情｜${APP_TITLE}`;
  if (pathname.startsWith('/profile/coupons')) return `我的优惠券｜${APP_TITLE}`;
  if (pathname.startsWith('/profile/point-records')) return `积分明细｜${APP_TITLE}`;
  if (pathname.startsWith('/profile/points')) return `我的积分｜${APP_TITLE}`;
  if (pathname.startsWith('/profile/reports')) return `我的甄客验｜${APP_TITLE}`;
  if (pathname.startsWith('/profile')) return `个人中心｜${APP_TITLE}`;
  if (pathname.startsWith('/auth')) return `登录｜${APP_TITLE}`;
  return APP_TITLE;
}

type WechatBridgeWindow = Window & {
  WeixinJSBridge?: {
    call?: (method: string) => void;
  };
};

export function useWechatBrowserChrome(pathname: string) {
  useEffect(() => {
    document.title = routeTitle(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!isWechatBrowser()) return undefined;

    const hideToolbar = () => {
      const bridge = (window as WechatBridgeWindow).WeixinJSBridge;
      bridge?.call?.('hideToolbar');
    };
    const hideWhenVisible = () => {
      if (document.visibilityState === 'visible') hideToolbar();
    };

    hideToolbar();
    const timers = [0, 300, 1000].map((delay) => window.setTimeout(hideToolbar, delay));
    document.addEventListener('WeixinJSBridgeReady', hideToolbar);
    document.addEventListener('visibilitychange', hideWhenVisible);
    window.addEventListener('pageshow', hideToolbar);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      document.removeEventListener('WeixinJSBridgeReady', hideToolbar);
      document.removeEventListener('visibilitychange', hideWhenVisible);
      window.removeEventListener('pageshow', hideToolbar);
    };
  }, [pathname]);
}
