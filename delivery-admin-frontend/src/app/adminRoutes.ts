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

const navPathEntries = Object.entries(adminNavPaths) as Array<[NavKey, string]>;

export function getAdminNavKey(pathname: string): NavKey | null {
  let normalizedPath = `/${(pathname.split(/[?#]/)[0] || '').split('/').filter(Boolean).join('/')}`;
  if (normalizedPath === '/admin') normalizedPath = '/';
  else if (normalizedPath.startsWith('/admin/')) normalizedPath = normalizedPath.slice('/admin'.length);
  if (normalizedPath === '/') return 'dashboard';

  return navPathEntries.find(([, path]) => (
    normalizedPath === path || normalizedPath.startsWith(`${path}/`)
  ))?.[0] ?? null;
}
