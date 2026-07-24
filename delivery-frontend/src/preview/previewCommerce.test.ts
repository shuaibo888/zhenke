import assert from 'node:assert/strict';
import { test } from 'node:test';
import { previewCart, previewOrders, previewTrials } from './previewCommerce';

test('预览订单覆盖主要购买状态', () => {
  assert.deepEqual(
    new Set(previewOrders.map((item) => item.status)),
    new Set(['unpaid', 'paid', 'shipped', 'completed', 'refunding']),
  );
});

test('预览试用保持线上和线下两种来源', () => {
  assert.ok(previewTrials.some((item) => item.trialType === 'ONLINE' && item.status === 'shipped'));
  assert.ok(previewTrials.some((item) => item.trialType === 'OFFLINE' && item.status === 'pending_report'));
});

test('预览购物车包含可操作商品', () => {
  assert.equal(previewCart.length, 2);
  assert.ok(previewCart.every((item) => item.quantity > 0 && item.product.purchasable));
});
