import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  currentUser,
  earningRecords,
  logisticsRecords,
  productEvidence,
  products,
  reports,
  trialRecords,
  trialRecruitments,
} from './commerce';

test('products expose standalone imageUrl for future OSS integration', () => {
  assert.ok(products.length >= 10);

  for (const product of products) {
    assert.ok(product.imageUrl.startsWith('/goods/'));
    assert.equal(product.cover, `url("${product.imageUrl}")`);
  }
});

test('profile mock data covers logistics, all trial states, and five-percent earnings', () => {
  assert.ok(logisticsRecords.some((item) => item.events.length > 0));
  assert.deepEqual(
    new Set(trialRecords.map((item) => item.status)),
    new Set(['pending_report', 'completed', 'overdue']),
  );
  assert.ok(earningRecords.every((item) => item.commissionRate === 0.05));
});

test('current user report count and earnings point to the same zhenke reports', () => {
  const currentUserReports = reports.filter((report) => report.userId === currentUser.id);
  const currentUserReportIds = new Set(currentUserReports.map((report) => report.id));

  assert.equal(currentUserReports.length, currentUser.reportCount);
  assert.ok(earningRecords.every((earning) => currentUserReportIds.has(earning.reportId)));
});

test('closed-loop mock data covers recruitments, evidence, and report images', () => {
  assert.ok(trialRecruitments.length > 0);
  assert.ok(trialRecruitments.every((item) => !reports.some((report) => report.productId === item.productId)));
  assert.ok(trialRecruitments.every((item) => productEvidence.some((evidence) => evidence.productId === item.productId)));
  assert.ok(reports.every((report) => report.images.length > 0));
});
