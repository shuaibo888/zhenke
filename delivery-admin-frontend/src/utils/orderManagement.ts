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

export function shipOrderById(orders: ManagedOrder[], orderId: number) {
  const target = orders.find((order) => order.id === orderId);
  if (!target || target.status !== 'paid') return orders;

  return orders.map((order) => (order.id === orderId ? { ...order, status: 'shipped' as const } : order));
}

export function refundOrderById(orders: ManagedOrder[], orderId: number) {
  const target = orders.find((order) => order.id === orderId);
  if (!target || !target.refundRequested || target.status === 'refunded' || target.status === 'canceled') return orders;

  return orders.map((order) =>
    order.id === orderId
      ? {
          ...order,
          status: 'refunded' as const,
          refundRequested: false,
        }
      : order,
  );
}
