import { useEffect } from 'react';

const APP_TITLE = '甄客行';

function routeTitle(pathname: string) {
  if (pathname === '/') return APP_TITLE;
  if (pathname === '/posts/publish') return `发布甄客帖｜${APP_TITLE}`;
  if (pathname.startsWith('/posts/')) return `甄客帖详情｜${APP_TITLE}`;
  if (pathname.startsWith('/posts')) return `甄客帖｜${APP_TITLE}`;
  if (pathname.startsWith('/enjoy/')) return `甄必享详情｜${APP_TITLE}`;
  if (pathname.startsWith('/enjoy')) return `甄必享｜${APP_TITLE}`;
  if (pathname.startsWith('/places/')) return `地点详情｜${APP_TITLE}`;
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
  if (pathname.startsWith('/profile/messages')) return `消息中心｜${APP_TITLE}`;
  if (pathname.startsWith('/profile/useful')) return `内容有用反馈｜${APP_TITLE}`;
  if (pathname.startsWith('/profile')) return `个人中心｜${APP_TITLE}`;
  if (pathname.startsWith('/auth')) return `登录｜${APP_TITLE}`;
  return APP_TITLE;
}

export function useWechatBrowserChrome(pathname: string) {
  useEffect(() => {
    document.title = routeTitle(pathname);
  }, [pathname]);
}
