import assert from 'node:assert/strict';
import type { ManagedOrder } from '@/types';
import { filterOrders, refundOrderById, shipOrderById, type OrderFilterState } from './orderManagement';

const orders: ManagedOrder[] = [
  {
    id: 1,
    merchantId: 101,
    orderNo: 'ZK20260619001',
    buyerName: '小白',
    status: 'paid',
    amount: 128,
    itemCount: 1,
    productTitles: ['云南高山有机咖啡豆 200g'],
    items: [{ productTitle: '云南高山有机咖啡豆 200g', quantity: 1, unitPrice: 128 }],
    address: '陕西省西安市雁塔区验证路 18 号',
    returnDays: 7,
    refundRequested: false,
    refundStatus: 'none',
    createdAt: '2026-06-19 10:22',
  },
  {
    id: 2,
    merchantId: 102,
    orderNo: 'ZK20260618002',
    buyerName: '阿验',
    status: 'shipped',
    amount: 268,
    itemCount: 1,
    productTitles: ['景德镇手作影青杯'],
    items: [{ productTitle: '景德镇手作影青杯', quantity: 1, unitPrice: 268 }],
    address: '江西省景德镇市珠山区窑火街 8 号',
    returnDays: 15,
    refundRequested: true,
    refundStatus: 'applied',
    createdAt: '2026-06-18 14:40',
  },
  {
    id: 3,
    merchantId: 101,
    orderNo: 'ZK20260617003',
    buyerName: '咖啡老王',
    status: 'completed',
    amount: 316,
    itemCount: 2,
    productTitles: ['云南高山有机咖啡豆 200g', '武夷山岩茶肉桂 80g'],
    items: [
      { productTitle: '云南高山有机咖啡豆 200g', quantity: 1, unitPrice: 128 },
      { productTitle: '武夷山岩茶肉桂 80g', quantity: 1, unitPrice: 188 },
    ],
    address: '福建省武夷山市茶山路 3 号',
    returnDays: 30,
    refundRequested: true,
    refundStatus: 'applied',
    createdAt: '2026-06-17 09:11',
  },
];

function ids(filters: Partial<OrderFilterState>) {
  return filterOrders(orders, {
    status: 'all',
    keyword: '',
    ...filters,
  }).map((order) => order.id);
}

assert.deepEqual(ids({ status: 'paid' }), [1]);
assert.deepEqual(ids({ keyword: 'ZK20260618' }), [2]);
assert.deepEqual(ids({ keyword: '咖啡老王' }), [3]);
assert.deepEqual(ids({ status: 'completed', keyword: '咖啡' }), [3]);

const shipped = shipOrderById(orders, 1);
assert.equal(shipped.find((order) => order.id === 1)?.status, 'shipped');
assert.equal(shipOrderById(orders, 2), orders);

const refunded = refundOrderById(orders, 2);
assert.equal(refunded.find((order) => order.id === 2)?.status, 'refunded');
assert.equal(refunded.find((order) => order.id === 2)?.refundRequested, false);
assert.equal(refundOrderById(orders, 1), orders);

console.log('order management ok');
