import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const umiConfigSource = readFileSync(new URL('../.umirc.ts', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('development server uses the stable Umi dev bundler', () => {
  assert.doesNotMatch(umiConfigSource, /\butoopack\s*:/);
});

test('development server starts on a fixed localhost port', () => {
  const envSource = readFileSync(new URL('../.env', import.meta.url), 'utf8');

  assert.equal(packageJson.scripts.dev, 'umi dev');
  assert.match(envSource, /^PORT=8000\s*$/);
});
