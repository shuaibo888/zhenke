import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isValidPassword, isValidUsername, passwordHasLetterAndNumber } from './authRules';

test('passwordHasLetterAndNumber requires at least one letter and one number', () => {
  assert.equal(passwordHasLetterAndNumber('abc123'), true);
  assert.equal(passwordHasLetterAndNumber('abcdef'), false);
  assert.equal(passwordHasLetterAndNumber('123456'), false);
});

test('usernames use the same rules as the backend', () => {
  assert.equal(isValidUsername('alice_01'), true);
  assert.equal(isValidUsername('abc'), false);
  assert.equal(isValidUsername('中文账号'), false);
  assert.equal(isValidUsername('a'.repeat(21)), false);
});

test('password validation enforces length and mixed characters', () => {
  assert.equal(isValidPassword('abc123'), true);
  assert.equal(isValidPassword('abc12'), false);
  assert.equal(isValidPassword('abcdefgh'), false);
  assert.equal(isValidPassword('12345678'), false);
  assert.equal(isValidPassword(`${'a'.repeat(20)}1`), false);
});
