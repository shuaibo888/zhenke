import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./PreviewInspector.tsx', import.meta.url), 'utf8');

test('巡检菜单提供完整用户流程入口和预览标识', () => {
  ['首页', '购买甄客验', '试用甄客验', '线上试用', '线下试用', '购物车', '全部订单', '我的甄客验', '个人中心']
    .forEach((label) => assert.match(source, new RegExp(label)));
  assert.match(source, /本地预览数据/);
  assert.match(source, /仅用于界面巡检/);
});
