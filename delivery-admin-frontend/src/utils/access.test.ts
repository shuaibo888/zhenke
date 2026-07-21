import assert from 'node:assert/strict';
import { filterRowsForSession, getAvailableNavKeys, hasGlobalAccess } from './access';
import type { AdminSession, ManagedOrder, ManagedProduct, ManagedReport } from '@/types';

const adminSession: AdminSession = {
  id: 1,
  username: 'admin',
  name: '运营小二',
  loginType: 'admin',
};

const merchantSession: AdminSession = {
  id: 2,
  username: 'merchant_li',
  name: '老李咖啡',
  loginType: 'merchant',
  merchantId: 101,
};

const products: ManagedProduct[] = [
  { id: 1, merchantId: 101, title: '咖啡豆', artisanName: '老李咖啡', category: 'verified', status: 'onSale', imageUrl: '', detail: '坚果香明显。', price: 128, cost: 66, stock: 42, sales: 61, verifyCount: 3 },
  { id: 2, merchantId: 102, title: '影青杯', artisanName: '观窑器物', category: 'local', status: 'offSale', imageUrl: '', detail: '杯体轻薄。', price: 268, cost: 130, stock: 18, sales: 22, verifyCount: 5 },
];

const orders: ManagedOrder[] = [
  { id: 1, merchantId: 101, orderNo: 'ZK1', buyerName: '小白', status: 'paid', amount: 128, itemCount: 1, productTitles: ['咖啡豆'], items: [{ productTitle: '咖啡豆', quantity: 1, unitPrice: 128 }], address: '陕西西安', returnDays: 7, refundRequested: false, createdAt: '2026-06-20 10:00' },
  { id: 2, merchantId: 102, orderNo: 'ZK2', buyerName: '阿验', status: 'shipped', amount: 268, itemCount: 1, productTitles: ['影青杯'], items: [{ productTitle: '影青杯', quantity: 1, unitPrice: 268 }], address: '江西景德镇', returnDays: 15, refundRequested: false, createdAt: '2026-06-21 10:00' },
];

const reports: ManagedReport[] = [
  { id: 1, merchantId: 101, reportSource: 'TRIAL', trialType: 'ONLINE', productTitle: '咖啡豆', userName: '咖啡老王', status: 'published', shortcoming: '偏深', usefulCount: 47, createdAt: '2026-06-20 12:00' },
  { id: 2, merchantId: 102, reportSource: 'PURCHASE', productTitle: '影青杯', userName: '阿验', status: 'published', shortcoming: '杯口略不齐', usefulCount: 36, createdAt: '2026-06-21 12:00' },
];

assert.equal(hasGlobalAccess(adminSession), true);
assert.equal(hasGlobalAccess(merchantSession), false);
assert.deepEqual(filterRowsForSession(products, adminSession).map((item) => item.id), [1, 2]);
assert.deepEqual(filterRowsForSession(products, merchantSession).map((item) => item.id), [1]);
assert.deepEqual(filterRowsForSession(orders, merchantSession).map((item) => item.id), [1]);
assert.deepEqual(filterRowsForSession(reports, merchantSession).map((item) => item.id), [1]);
assert.deepEqual(getAvailableNavKeys(adminSession), ['dashboard', 'users', 'products', 'trials', 'orders', 'reports', 'merchants']);
assert.deepEqual(getAvailableNavKeys(merchantSession), ['dashboard', 'products', 'trials', 'orders', 'reports']);

console.log('access rules ok');
