import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TrialRecruitment } from '@/types';
import { applyForRecruitment, getProductJourneyState } from './productJourney';

test('product state follows published report count', () => {
  assert.equal(getProductJourneyState(4, []), 'recruiting');
  assert.equal(getProductJourneyState(4, [{ productId: 4 }]), 'verified');
});

test('recruitment rejects duplicate and full applications', () => {
  const open: TrialRecruitment = {
    id: 1,
    productId: 4,
    trialType: 'ONLINE',
    targetCount: 3,
    claimedCount: 1,
    deadline: '2026-07-12',
    applicantUserIds: [],
  };

  assert.equal(applyForRecruitment(open, 9).ok, true);
  assert.equal(applyForRecruitment({ ...open, applicantUserIds: [9] }, 9).reason, 'already_applied');
  assert.equal(applyForRecruitment({ ...open, claimedCount: 3 }, 9).reason, 'full');
});
