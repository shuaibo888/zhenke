import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAvatarFileName } from './avatarUpload';

test('createAvatarFileName keeps safe extensions and removes unsafe filename characters', () => {
  const fileName = createAvatarFileName(9, ' ../阿白 avatar!!.PNG ', 1700000000000);

  assert.equal(fileName, 'avatar-9-1700000000000-avatar.png');
});

test('createAvatarFileName falls back to jpg when extension is missing or unsafe', () => {
  assert.equal(createAvatarFileName(3, 'profile', 1700000000000), 'avatar-3-1700000000000-profile.jpg');
  assert.equal(createAvatarFileName(3, 'profile.svg', 1700000000000), 'avatar-3-1700000000000-profile.jpg');
});
