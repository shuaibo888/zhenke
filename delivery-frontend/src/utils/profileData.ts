import type { EarningRecord, LogisticsInfo, Order, TrialRecord } from '@/types';

export function getLogisticsView(order: Order, logistics?: LogisticsInfo) {
  if (order.status === 'canceled') {
    return { kind: 'none' as const, title: '暂无物流信息', logistics: undefined };
  }

  if (order.status === 'unpaid' || order.status === 'paid') {
    return { kind: 'preparing' as const, title: '商家备货中', logistics: undefined };
  }

  if (!logistics) {
    return { kind: 'none' as const, title: '暂无物流信息', logistics: undefined };
  }

  return {
    kind: order.status === 'completed' ? ('delivered' as const) : ('in_transit' as const),
    title: order.status === 'completed' ? '已签收' : '运输中',
    logistics,
  };
}

function dateAtShanghaiMidnight(value: string) {
  return new Date(`${value}T00:00:00+08:00`).getTime();
}

export function getTrialDeadlineMeta(trial: TrialRecord, today: string) {
  if (trial.trialType === 'OFFLINE' && trial.status === 'pending_report') {
    return { tone: 'processing' as const, label: '线下试用审核已通过，可自愿发布甄客验' };
  }
  const workflowLabels = {
    applied: '申请待审核',
    approved: '申请已通过，等待商家发货',
    rejected: '申请未通过',
    shipped: '商家已发货，请收货后确认',
    pending_report: '已确认收货，可自愿发布甄客验',
  } as const;
  if (trial.status in workflowLabels) {
    const label = workflowLabels[trial.status as keyof typeof workflowLabels];
    return { tone: trial.status === 'rejected' ? 'danger' as const : 'processing' as const, label };
  }
  if (trial.status === 'completed') {
    return { tone: 'success' as const, label: `已于 ${trial.completedAt} 完成` };
  }

  const days = Math.ceil((dateAtShanghaiMidnight(trial.deadline) - dateAtShanghaiMidnight(today)) / 86_400_000);

  if (trial.status === 'overdue' || days < 0) {
    return { tone: 'danger' as const, label: `已逾期 ${Math.abs(days)} 天` };
  }

  return { tone: 'processing' as const, label: `剩余 ${days} 天` };
}

export function calculateEarningAmount(record: EarningRecord) {
  return record.commissionAmount;
}

export function summarizeEarnings(records: EarningRecord[]) {
  return records.reduce(
    (summary, record) => {
      const amount = calculateEarningAmount(record);
      summary.total = Math.round((summary.total + amount) * 100) / 100;
      summary[record.status] = Math.round((summary[record.status] + amount) * 100) / 100;
      return summary;
    },
    { total: 0, pending: 0, settled: 0 },
  );
}
