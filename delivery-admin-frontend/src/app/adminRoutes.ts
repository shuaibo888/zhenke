import type { NavKey } from '@/types';

export const adminNavPaths: Record<NavKey, string> = {
  dashboard: '/dashboard',
  users: '/users',
  coupons: '/coupons',
  products: '/products',
  trials: '/trials',
  orders: '/orders',
  reports: '/reports',
  zhenkePosts: '/zhenke-posts',
  enjoys: '/zhenke-enjoys',
  banners: '/home-banners',
  merchants: '/merchants',
};

const navKeys = new Set<NavKey>(Object.keys(adminNavPaths) as NavKey[]);

export function getAdminNavKey(pathname: string): NavKey | null {
  const section = pathname.split('/').filter(Boolean)[0];
  if (!section) return 'dashboard';
  return navKeys.has(section as NavKey) ? section as NavKey : null;
}
