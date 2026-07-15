import type { AdminSession, NavKey } from '@/types';

type MerchantOwnedRow = {
  merchantId: number;
};

export function hasGlobalAccess(session: AdminSession | null) {
  return session?.loginType === 'admin';
}

export function filterRowsForSession<T extends MerchantOwnedRow>(rows: T[], session: AdminSession | null) {
  if (!session) return [];
  if (hasGlobalAccess(session)) return rows;

  return rows.filter((row) => row.merchantId === session.merchantId);
}

export function getAvailableNavKeys(session: AdminSession | null): NavKey[] {
  const baseKeys: NavKey[] = ['dashboard', 'products', 'trials', 'orders', 'reports'];

  if (hasGlobalAccess(session)) {
    return ['dashboard', 'users', 'products', 'trials', 'orders', 'reports', 'merchants'];
  }

  return baseKeys;
}
