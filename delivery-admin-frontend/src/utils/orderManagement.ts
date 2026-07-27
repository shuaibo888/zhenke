import type { ManagedOrder, OrderStatus } from '@/types';

export type OrderStatusFilter = OrderStatus | 'all';

export interface OrderFilterState {
  status: OrderStatusFilter;
  keyword: string;
}

export function filterOrders(orders: ManagedOrder[], filters: OrderFilterState) {
  const normalizedKeyword = filters.keyword.trim().toLowerCase();

  return orders.filter((order) => {
    if (filters.status !== 'all' && order.status !== filters.status) {
      return false;
    }

    if (!normalizedKeyword) {
      return true;
    }

    return [order.orderNo, order.buyerName].some((value) => value.toLowerCase().includes(normalizedKeyword));
  });
}
