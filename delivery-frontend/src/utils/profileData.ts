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
