import type { ManagedOrder, ManagedProduct, ManagedReport, MerchantAccount } from '@/types';

const orderStatusLabel = {
  unpaid: '待付款',
  paid: '待发货',
  shipped: '待收货',
  completed: '已完成',
  canceled: '已取消',
  refunding: '退款中',
  refunded: '已退款',
};

export function toggleReportStatus(reports: ManagedReport[], reportId: number) {
  return reports.map((report) =>
    report.id === reportId
      ? {
          ...report,
          status: report.status === 'published' ? 'deleted' as const : 'published' as const,
        }
      : report,
  );
}

export function toggleMerchantStatus(merchants: MerchantAccount[], merchantId: number) {
  return merchants.map((merchant) =>
    merchant.id === merchantId
      ? {
          ...merchant,
          status: merchant.status === 'active' ? 'disabled' as const : 'active' as const,
        }
      : merchant,
  );
}

export function getDashboardStats({
  products,
  orders,
  reports,
  userTotal,
  today,
}: {
  products: ManagedProduct[];
  orders: ManagedOrder[];
  reports: ManagedReport[];
  userTotal: number;
  today: string;
}) {
  return {
    productTotal: products.length,
    onSaleCount: products.filter((product) => product.status === 'onSale').length,
    orderTotal: orders.length,
    todayOrders: orders.filter((order) => order.createdAt.startsWith(today)).length,
    salesAmount: orders
      .filter((order) => order.status !== 'canceled' && order.status !== 'unpaid'
        && order.status !== 'refunding' && order.status !== 'refunded')
      .reduce((sum, order) => sum + order.amount, 0),
    userTotal,
    reportTotal: reports.length,
  };
}

export function buildOrderStatusChart(orders: ManagedOrder[]) {
  const counts = new Map<string, number>();

  orders.forEach((order) => {
    const label = orderStatusLabel[order.status];
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
}

export function buildMerchantOverview(products: ManagedProduct[], orders: ManagedOrder[], merchants: MerchantAccount[]) {
  return merchants.map((merchant) => {
    const merchantProducts = products.filter((product) => product.merchantId === merchant.id);
    const merchantOrders = orders.filter((order) => order.merchantId === merchant.id);

    return {
      merchant: merchant.name,
      productTotal: merchantProducts.length,
      onSaleCount: merchantProducts.filter((product) => product.status === 'onSale').length,
      salesAmount: merchantOrders
        .filter((order) => order.status !== 'canceled' && order.status !== 'unpaid'
          && order.status !== 'refunding' && order.status !== 'refunded')
        .reduce((sum, order) => sum + order.amount, 0),
    };
  });
}

export function buildProductStatusPie(products: ManagedProduct[]) {
  const onSaleCount = products.filter((product) => product.status === 'onSale').length;
  const offSaleCount = products.filter((product) => product.status === 'offSale').length;
  const draftCount = products.filter((product) => product.status === 'draft').length;

  return [
    { status: '在售', count: onSaleCount },
    { status: '已下架', count: offSaleCount },
    { status: '草稿', count: draftCount },
  ].filter((item) => item.count > 0);
}

export function buildOrderTrendChart(orders: ManagedOrder[]) {
  const counts = new Map<string, number>();

  orders.forEach((order) => {
    const date = order.createdAt.slice(0, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-7)
    .map(([date, count]) => ({ date, count }));
}
