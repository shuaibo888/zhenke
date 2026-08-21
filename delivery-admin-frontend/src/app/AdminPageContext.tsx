import { createContext, useContext } from 'react';
import type { CouponModuleProps } from '@/modules/coupons';
import type { DashboardModuleProps } from '@/modules/dashboard';
import type { MerchantsModuleProps } from '@/modules/merchants';
import type { OrdersModuleProps } from '@/modules/orders';
import type { ProductsModuleProps } from '@/modules/products';
import type { ReportsModuleProps } from '@/modules/reports';
import type { TrialsModuleProps } from '@/modules/trials';
import type { UsersModuleProps } from '@/modules/users';

export interface AdminPagePropsMap {
  dashboard: DashboardModuleProps;
  users: UsersModuleProps;
  coupons: CouponModuleProps;
  products: ProductsModuleProps;
  trials: TrialsModuleProps;
  orders: OrdersModuleProps;
  reports: ReportsModuleProps;
  merchants: MerchantsModuleProps;
}

export const AdminPageContext = createContext<AdminPagePropsMap | null>(null);

export function useAdminPageProps<Key extends keyof AdminPagePropsMap>(key: Key): AdminPagePropsMap[Key] {
  const context = useContext(AdminPageContext);
  if (!context) {
    throw new Error('管理端页面必须在 AdminWorkspace 中渲染');
  }
  return context[key];
}
