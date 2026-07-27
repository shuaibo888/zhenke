import type { Order, OrderStatus } from '@/types';

export const orderStatusMeta: Record<
  OrderStatus,
  {
    label: string;
    color: 'default' | 'processing' | 'success' | 'warning';
    actionLabel?: string;
  }
> = {
  unpaid: { label: '待付款', color: 'warning', actionLabel: '去付款' },
  paid: { label: '待发货', color: 'processing' },
  shipped: { label: '待收货', color: 'processing', actionLabel: '确认收货' },
  completed: { label: '已完成', color: 'success' },
  canceled: { label: '已取消', color: 'default' },
  refunding: { label: '退款中', color: 'processing' },
  refunded: { label: '已退款', color: 'default' },
};

export function canCancelOrder(order: Order) {
  return order.status === 'unpaid';
}
