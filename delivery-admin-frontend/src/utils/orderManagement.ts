import type { ManagedOrder, OrderStatus } from '@/types';

export type OrderStatusFilter = OrderStatus | 'all';

export interface OrderFilterState {
  status: OrderStatusFilter;
  keyword: string;
}

const orderStatusMeta: Record<OrderStatus, { label: string; color: string }> = {
  unpaid: { label: '待付款', color: 'default' },
  paid: { label: '待发货', color: 'gold' },
  shipped: { label: '待收货', color: 'blue' },
  completed: { label: '已完成', color: 'green' },
  canceled: { label: '已取消', color: 'red' },
  refunding: { label: '退款中', color: 'blue' },
  refunded: { label: '已退款', color: 'purple' },
};

export function getManagedOrderStatusMeta(
  order: Pick<ManagedOrder, 'status' | 'fulfillmentType'>,
) {
  if (order.fulfillmentType === 'OFFLINE') {
    if (order.status === 'paid') {
      return { label: '待使用', color: 'gold' };
    }
    if (order.status === 'completed') {
      return { label: '已核销', color: 'green' };
    }
  }

  return orderStatusMeta[order.status];
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
