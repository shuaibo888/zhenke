import assert from 'node:assert/strict';
import type { ManagedOrder, ManagedProduct, ManagedReport, MerchantAccount } from '@/types';
import {
  buildMerchantOverview,
  buildOrderStatusChart,
  buildOrderTrendChart,
  buildProductStatusPie,
  getDashboardStats,
  toggleMerchantStatus,
  toggleReportStatus,
} from './adminDashboard';

const products: ManagedProduct[] = [
  {
    id: 1,
    merchantId: 101,
    title: '咖啡豆',
    artisanName: '老李咖啡',
    category: 'verified',
    status: 'onSale',
    imageUrl: '',
    detail: '坚果香明显。',
    price: 128,
    cost: 66,
    stock: 42,
    sales: 61,
    verifyCount: 3,
  },
  {
    id: 2,
    merchantId: 102,
    title: '影青杯',
    artisanName: '观窑器物',
    category: 'local',
    status: 'offSale',
    imageUrl: '',
    detail: '杯体轻薄。',
    price: 268,
    cost: 130,
    stock: 18,
    sales: 22,
    verifyCount: 5,
  },
];

const orders: ManagedOrder[] = [
  {
    id: 1,
    merchantId: 101,
    orderNo: 'ZK1',
    buyerName: '小白',
    status: 'paid',
    amount: 128,
    itemCount: 1,
    productTitles: ['咖啡豆'],
    items: [{ productTitle: '咖啡豆', quantity: 1, unitPrice: 128 }],
    address: '陕西西安',
    returnDays: 7,
    refundRequested: false,
    createdAt: '2026-06-24 10:00',
  },
  {
    id: 2,
    merchantId: 102,
    orderNo: 'ZK2',
    buyerName: '阿验',
    status: 'refunded',
    amount: 268,
    itemCount: 1,
    productTitles: ['影青杯'],
    items: [{ productTitle: '影青杯', quantity: 1, unitPrice: 268 }],
    address: '江西景德镇',
    returnDays: 15,
    refundRequested: false,
    createdAt: '2026-06-23 10:00',
  },
];

const reports: ManagedReport[] = [
  { id: 1, merchantId: 101, reportSource: 'TRIAL', trialType: 'ONLINE', productTitle: '咖啡豆', userName: '咖啡老王', status: 'published', shortcoming: '偏深', usefulCount: 47, createdAt: '2026-06-20 12:00' },
  { id: 2, merchantId: 102, reportSource: 'PURCHASE', productTitle: '影青杯', userName: '阿验', status: 'deleted', shortcoming: '杯口略不齐', usefulCount: 36, createdAt: '2026-06-21 12:00' },
];

const merchants: MerchantAccount[] = [
  { id: 101, username: 'merchant_li', password: '123456', name: '老李咖啡', ownerName: '李师傅', phone: '13800000001', productCount: 1, orderCount: 1, status: 'active' },
  { id: 102, username: 'merchant_guan', password: '123456', name: '观窑器物', ownerName: '周窑主', phone: '13800000002', productCount: 1, orderCount: 1, status: 'disabled' },
];

assert.equal(toggleReportStatus(reports, 1).find((report) => report.id === 1)?.status, 'deleted');
assert.equal(toggleReportStatus(reports, 2).find((report) => report.id === 2)?.status, 'published');
assert.equal(toggleMerchantStatus(merchants, 101).find((merchant) => merchant.id === 101)?.status, 'disabled');
assert.equal(toggleMerchantStatus(merchants, 102).find((merchant) => merchant.id === 102)?.status, 'active');

const stats = getDashboardStats({ products, orders, reports, userTotal: 12, today: '2026-06-24' });
assert.deepEqual(stats, {
  productTotal: 2,
  onSaleCount: 1,
  orderTotal: 2,
  todayOrders: 1,
  salesAmount: 128,
  userTotal: 12,
  reportTotal: 2,
});

assert.deepEqual(buildOrderStatusChart(orders), [
  { status: '待发货', count: 1 },
  { status: '已退款', count: 1 },
]);
assert.deepEqual(buildMerchantOverview(products, orders, merchants), [
  { merchant: '老李咖啡', productTotal: 1, onSaleCount: 1, salesAmount: 128 },
  { merchant: '观窑器物', productTotal: 1, onSaleCount: 0, salesAmount: 0 },
]);
assert.deepEqual(buildProductStatusPie(products), [
  { status: '在售', count: 1 },
  { status: '已下架', count: 1 },
]);
assert.deepEqual(buildOrderTrendChart(orders), [
  { date: '2026-06-23', count: 1 },
  { date: '2026-06-24', count: 1 },
]);

console.log('admin dashboard ok');
