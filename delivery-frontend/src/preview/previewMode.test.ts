import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isPreviewModeAllowed } from './previewMode';

test('开发环境允许本机和局域网地址显式开启预览', () => {
  [
    'http://localhost:8000/?preview=1',
    'http://127.0.0.1:8000/?preview=1',
    'http://192.168.1.172:8000/?preview=1',
    'http://10.0.0.8:8000/?preview=1',
    'http://172.16.0.8:8000/?preview=1',
    'http://172.31.255.8:8000/?preview=1',
  ].forEach((url) => assert.equal(isPreviewModeAllowed('development', url), true, url));
});

test('生产环境、公网地址和缺少显式参数时禁止预览', () => {
  assert.equal(isPreviewModeAllowed('production', 'http://192.168.1.172:8000/?preview=1'), false);
  assert.equal(isPreviewModeAllowed('development', 'https://example.com/?preview=1'), false);
  assert.equal(isPreviewModeAllowed('development', 'http://192.168.1.172:8000/'), false);
  assert.equal(isPreviewModeAllowed('development', 'http://172.32.0.8:8000/?preview=1'), false);
});
