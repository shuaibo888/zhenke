import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Product } from '@/types';
import type { CartItem } from './cart';
import {
  advanceOrderStatus,
  cancelOrder,
  canApplyRefund,
  canCancelOrder,
  createOrdersFromCart,
  getReviewableProductsFromOrders,
  getReturnDaysByRole,
  orderStatusMeta,
} from './orders';

const product: Product = {
  id: 1,
  title: 'Coffee',
  artisanName: 'A',
  category: 'verified',
  imageUrl: '',
  cover: '',
  price: 128,
  isVerified: true,
  verifyCount: 3,
  detail: '',
  tags: [],
};

const cartItems: CartItem[] = [{ product, quantity: 2 }];

test('getReturnDaysByRole maps member roles to return windows', () => {
  assert.equal(getReturnDaysByRole('zhenke'), 7);
  assert.equal(getReturnDaysByRole('yanzhenke'), 15);
  assert.equal(getReturnDaysByRole('xinzhenke'), 30);
});

test('createOrdersFromCart creates unpaid orders with role return days', () => {
  const orders = createOrdersFromCart(cartItems, 'yanzhenke', 1000);

  assert.equal(orders.length, 1);
  assert.equal(orders[0].status, 'unpaid');
  assert.equal(orders[0].returnDays, 15);
  assert.equal(orders[0].quantity, 2);
  assert.equal(orders[0].amount, 256);
});

test('createOrdersFromCart preserves report and verifier attribution', () => {
  const attributedItems: CartItem[] = [
    {
      product,
      quantity: 1,
      attribution: { fromReviewId: 105, fromVerifierId: 1 },
    },
  ];
  const [order] = createOrdersFromCart(attributedItems, 'zhenke', 2000);

  assert.equal(order.fromReviewId, 105);
  assert.equal(order.fromVerifierId, 1);
});

test('advanceOrderStatus follows unpaid paid shipped completed flow', () => {
  const [order] = createOrdersFromCart(cartItems, 'zhenke', 1000);
  const paid = advanceOrderStatus(order);
  const shipped = advanceOrderStatus(paid);
  const completed = advanceOrderStatus(shipped);

  assert.equal(orderStatusMeta[order.status].label, '待付款');
  assert.equal(orderStatusMeta[paid.status].label, '待发货');
  assert.equal(orderStatusMeta[shipped.status].label, '待收货');
  assert.equal(orderStatusMeta[completed.status].label, '已完成');
});

test('cancelOrder cancels unshipped orders and marks paid orders refunded', () => {
  const [order] = createOrdersFromCart(cartItems, 'zhenke', 1000);
  const canceled = cancelOrder(order);
  const paid = advanceOrderStatus(order);

  assert.equal(canCancelOrder(order), true);
  assert.equal(canceled.status, 'canceled');
  assert.equal(canCancelOrder(paid), true);
  assert.equal(cancelOrder(paid).status, 'canceled');
  assert.equal(cancelOrder(paid).refundStatus, 'refunded');
});

test('refund application requires receipt and no earlier refund record', () => {
  const [unpaid] = createOrdersFromCart(cartItems, 'zhenke', 1000);
  const paid = advanceOrderStatus(unpaid);
  const shipped = advanceOrderStatus(paid);
  const completed = advanceOrderStatus(shipped);

  assert.equal(canApplyRefund(unpaid), false);
  assert.equal(canApplyRefund(paid), false);
  assert.equal(canApplyRefund(shipped), false);
  assert.equal(canApplyRefund(completed), true);
  assert.equal(canApplyRefund({ ...completed, refundStatus: 'applied' }), false);
  assert.equal(canApplyRefund({ ...completed, refundStatus: 'rejected' }), false);
});

test('getReviewableProductsFromOrders returns completed purchased products without existing reports', () => {
  const products: Product[] = [
    product,
    { ...product, id: 2, title: 'Cup' },
    { ...product, id: 3, title: 'Honey' },
  ];
  const orders = [
    { id: 1, orderNo: 'A', productId: 1, productTitle: 'Coffee', status: 'completed' as const, quantity: 1, amount: 128, returnDays: 7 },
    { id: 2, orderNo: 'B', productId: 2, productTitle: 'Cup', status: 'paid' as const, quantity: 1, amount: 268, returnDays: 7 },
    { id: 3, orderNo: 'C', productId: 3, productTitle: 'Honey', status: 'completed' as const, quantity: 1, amount: 96, returnDays: 7 },
  ];
  const reports = [{ productId: 1, userId: 9 }];

  const result = getReviewableProductsFromOrders(products, orders, reports, 9);

  assert.deepEqual(
    result.map((item) => item.title),
    ['Honey'],
  );
});
