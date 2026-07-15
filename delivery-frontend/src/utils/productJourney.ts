import type { TrialRecruitment } from '@/types';

export function getProductJourneyState(productId: number, reports: Array<{ productId: number }>) {
  return reports.some((report) => report.productId === productId) ? 'verified' : 'recruiting';
}

export function applyForRecruitment(recruitment: TrialRecruitment, userId: number) {
  if (recruitment.applicantUserIds.includes(userId)) {
    return { ok: false as const, reason: 'already_applied' as const, recruitment };
  }

  if (recruitment.claimedCount >= recruitment.targetCount) {
    return { ok: false as const, reason: 'full' as const, recruitment };
  }

  return {
    ok: true as const,
    recruitment: {
      ...recruitment,
      claimedCount: recruitment.claimedCount + 1,
      applicantUserIds: [...recruitment.applicantUserIds, userId],
    },
  };
}
