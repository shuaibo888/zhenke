import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { EarningRecord, LogisticsInfo, Order, TrialRecord } from '@/types';
import {
  calculateEarningAmount,
  getLogisticsView,
  getTrialDeadlineMeta,
  summarizeEarnings,
} from './profileData';

const baseOrder: Order = {
  id: 1,
  orderNo: 'ZK001',
  productId: 1,
  productTitle: '测试商品',
  status: 'paid',
  quantity: 1,
  amount: 128,
  returnDays: 7,
};

const logistics: LogisticsInfo = {
  orderId: 1,
  carrier: '顺丰速运',
  trackingNo: 'SF1234567890',
  events: [
    { time: '2026-07-05 10:30', description: '快件已签收' },
    { time: '2026-07-04 08:20', description: '快件运输中' },
  ],
};

test('getLogisticsView maps order states to preparing, transit, delivered, and empty views', () => {
  assert.equal(getLogisticsView(baseOrder).kind, 'preparing');
  assert.equal(getLogisticsView({ ...baseOrder, status: 'shipped' }, logistics).kind, 'in_transit');
  assert.equal(getLogisticsView({ ...baseOrder, status: 'completed' }, logistics).kind, 'delivered');
  assert.equal(getLogisticsView({ ...baseOrder, status: 'canceled' }, logistics).kind, 'none');
});

test('getTrialDeadlineMeta describes received, shipped, and overdue trial states', () => {
  const pending: TrialRecord = {
    id: 1,
    productId: 2,
    productTitle: '试用商品',
    status: 'pending_report',
    claimedAt: '2026-07-01',
    deadline: '2026-07-08',
  };

  assert.deepEqual(getTrialDeadlineMeta(pending, '2026-07-05'), {
    tone: 'processing',
    label: '已确认收货，可自愿发布甄客验',
  });
  assert.equal(getTrialDeadlineMeta({ ...pending, status: 'shipped' }, '2026-07-05').label, '商家已发货，请收货后确认');
  assert.equal(getTrialDeadlineMeta({ ...pending, status: 'overdue' }, '2026-07-09').tone, 'danger');
});

test('earnings use a five-percent rate and summarize by settlement status', () => {
  const records: EarningRecord[] = [
    {
      id: 1,
      reportId: 101,
      reportTitle: '咖啡甄客验',
      orderNo: 'ZK001',
      orderAmount: 128,
      commissionRate: 0.05,
      commissionAmount: 6.4,
      publicWelfareRate: 0.05,
      publicWelfareAmount: 6.4,
      status: 'settled',
      createdAt: '2026-07-01',
    },
    {
      id: 2,
      reportId: 102,
      reportTitle: '茶杯甄客验',
      orderNo: 'ZK002',
      orderAmount: 268,
      commissionRate: 0.05,
      commissionAmount: 13.4,
      publicWelfareRate: 0.05,
      publicWelfareAmount: 13.4,
      status: 'pending',
      createdAt: '2026-07-03',
    },
  ];

  assert.equal(calculateEarningAmount(records[0]), 6.4);
  assert.deepEqual(summarizeEarnings(records), {
    total: 19.8,
    pending: 13.4,
    settled: 6.4,
  });
});
