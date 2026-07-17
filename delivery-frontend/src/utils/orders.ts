import type { MemberRole, Order, OrderStatus, Product } from '@/types';
import type { CartItem } from './cart';

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
};

const roleReturnDays: Record<MemberRole, number> = {
  zhenke: 7,
  yanzhenke: 15,
  xinzhenke: 30,
};

export function getReturnDaysByRole(role: MemberRole) {
  return roleReturnDays[role];
}

export function createOrdersFromCart(items: CartItem[], role: MemberRole, seed = Date.now()): Order[] {
  const orderPrefix = `ZK${seed}`;

  return items.map((item, index) => ({
    id: seed + index,
    orderNo: `${orderPrefix}${String(index + 1).padStart(2, '0')}`,
    productId: item.product.id,
    productTitle: item.product.title,
    status: 'unpaid',
    quantity: item.quantity,
    amount: item.product.price * item.quantity,
    returnDays: getReturnDaysByRole(role),
    fromReviewId: item.attribution?.fromReviewId,
    fromVerifierId: item.attribution?.fromVerifierId,
  }));
}

export function advanceOrderStatus(order: Order): Order {
  const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
    unpaid: 'paid',
    paid: 'shipped',
    shipped: 'completed',
  };

  return { ...order, status: nextStatus[order.status] ?? order.status };
}

export function canCancelOrder(order: Order) {
  return order.status === 'unpaid';
}

export function cancelOrder(order: Order): Order {
  if (!canCancelOrder(order)) return order;
  return { ...order, status: 'canceled' };
}

export function getReviewableProductsFromOrders(
  products: Product[],
  orders: Order[],
  reports: Array<{ productId: number; userId: number }>,
  userId: number,
) {
  const reportedProductIds = new Set(reports.filter((report) => report.userId === userId).map((report) => report.productId));
  const completedProductIds = new Set(
    orders.filter((order) => order.status === 'completed' && !reportedProductIds.has(order.productId)).map((order) => order.productId),
  );

  return products.filter((product) => completedProductIds.has(product.id));
}
