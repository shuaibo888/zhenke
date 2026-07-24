import assert from 'node:assert/strict';
import { test } from 'node:test';
import { previewFeed, previewProducts, previewReports } from './previewFixtures';

test('预览首页覆盖四个固定分类和混合内容', () => {
  assert.deepEqual(
    new Set(previewProducts.map((item) => item.categoryCode)),
    new Set(['CATEGORY_1', 'CATEGORY_2', 'CATEGORY_3', 'CATEGORY_4']),
  );
  assert.ok(previewFeed.some((item) => item.contentType === 'REPORT'));
  assert.ok(previewFeed.some((item) => item.contentType === 'TRIAL' && item.trial?.trialType === 'ONLINE'));
  assert.ok(previewFeed.some((item) => item.contentType === 'TRIAL' && item.trial?.trialType === 'OFFLINE'));
});

test('购买甄客验有三项评分，试用甄客验没有购买评分', () => {
  const purchaseReport = previewReports.find((item) => item.reportSource === 'PURCHASE');
  const trialReport = previewReports.find((item) => item.reportSource === 'TRIAL');

  assert.ok(purchaseReport);
  assert.equal(purchaseReport.productQuality, 5);
  assert.equal(purchaseReport.logisticsService, 4);
  assert.equal(purchaseReport.serviceAttitude, 5);
  assert.ok(trialReport);
  assert.equal(trialReport.productQuality, undefined);
  assert.equal(trialReport.logisticsService, undefined);
  assert.equal(trialReport.serviceAttitude, undefined);
});

test('线上和线下试用包含名额和截止日期', () => {
  const trials = previewFeed.filter((item) => item.contentType === 'TRIAL');
  assert.ok(trials.some((item) => item.trial?.trialType === 'ONLINE'));
  assert.ok(trials.some((item) => item.trial?.trialType === 'OFFLINE'));
  trials.forEach((item) => {
    assert.ok((item.trial?.targetCount ?? 0) > 0);
    assert.ok((item.trial?.approvedCount ?? 0) >= 0);
    assert.match(item.trial?.applicationDeadline ?? '', /^\d{4}-\d{2}-\d{2}/);
  });
});
