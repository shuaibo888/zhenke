import {
  AppstoreOutlined,
  AuditOutlined,
  RiseOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  TeamOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import { Column, Line, Pie } from '@ant-design/charts';
import type { ReactNode } from 'react';
import type { DashboardSummaryDto } from '@/services/adminApi';
import styles from '@/pages/index.less';

const orderStatusLabels: Record<string, string> = {
  PENDING_PAYMENT: '待付款',
  PAID: '待发货',
  SHIPPED: '待收货',
  RECEIVED: '已完成',
  CANCELLED: '已取消',
  REFUNDING: '退款中',
  REFUNDED: '已退款',
};

const productStatusLabels: Record<string, string> = {
  ON_SALE: '在售',
  OFF_SALE: '已下架',
  DRAFT: '草稿',
};

type DashboardMetric = {
  key: 'productTotal' | 'onSaleCount' | 'orderTotal' | 'todayOrders' | 'salesAmount' | 'userTotal' | 'reportTotal';
  title: string;
  hint: string;
  icon: ReactNode;
  tone: 'green' | 'gold' | 'blue' | 'red';
  money?: boolean;
};

const dashboardMetrics: readonly DashboardMetric[] = [
  { key: 'productTotal', title: '商品总数', hint: '当前权限范围内商品', icon: <AppstoreOutlined />, tone: 'green' },
  { key: 'onSaleCount', title: '在售数', hint: '可在用户端展示', icon: <ShopOutlined />, tone: 'gold' },
  { key: 'orderTotal', title: '订单总数', hint: '全部订单状态合计', icon: <AuditOutlined />, tone: 'blue' },
  { key: 'todayOrders', title: '今日订单数', hint: '按下单日期统计', icon: <TruckOutlined />, tone: 'red' },
  { key: 'salesAmount', title: '总销售额', hint: '排除待付款、已取消、已退款', icon: <RiseOutlined />, tone: 'green', money: true },
  { key: 'userTotal', title: '用户数', hint: '平台用户或当前买家', icon: <TeamOutlined />, tone: 'blue' },
  { key: 'reportTotal', title: '报告总数', hint: '全部验证报告数量', icon: <SafetyCertificateOutlined />, tone: 'gold' },
];

function formatMoney(value: number) {
  return `¥${value.toFixed(2)}`;
}

export interface DashboardModuleProps {
  summary: DashboardSummaryDto;
  isAdmin: boolean;
}

export default function DashboardModule({ summary, isAdmin }: DashboardModuleProps) {
  const orderStatusChartData = summary.orderStatusCounts.map((item) => ({
    status: orderStatusLabels[item.code] ?? item.code,
    count: item.count,
  }));
  const productStatusPieData = summary.productStatusCounts.map((item) => ({
    status: productStatusLabels[item.code] ?? item.code,
    count: item.count,
  }));

  return (
    <div className={styles.dashboardGrid}>
      <div className={styles.dashboardMetricsGrid}>
        {dashboardMetrics.filter((metric) => !isAdmin || metric.key !== 'reportTotal').map((metric) => {
          const value = summary[metric.key];
          return (
            <div key={metric.key} className={`${styles.metricCard} ${styles[`metric${metric.tone}`]}`}>
              <div className={styles.metricIcon}>{metric.icon}</div>
              <div className={styles.metricBody}>
                <span>{metric.title}</span>
                <strong>{metric.money ? formatMoney(value) : value}</strong>
                <small>{metric.key === 'userTotal' && !isAdmin ? '当前订单买家去重' : metric.hint}</small>
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.dashboardChartsGrid}>
        <section className={styles.chartPanel}>
          <div><p className={styles.eyebrow}>柱状图</p><h3>订单状态分布</h3></div>
          <Column
            data={orderStatusChartData}
            xField="status"
            yField="count"
            height={260}
            colorField="status"
            axis={{ y: { title: false }, x: { title: false } }}
            legend={false}
            tooltip={{ items: [{ field: 'count', name: '数量' }] }}
          />
        </section>
        <section className={styles.chartPanel}>
          <div><p className={styles.eyebrow}>折线图</p><h3>近 7 日订单趋势</h3></div>
          <Line
            data={summary.orderDailyCounts}
            xField="date"
            yField="count"
            height={260}
            point={{ shapeField: 'circle', sizeField: 4 }}
            axis={{ y: { title: false }, x: { title: false } }}
            tooltip={{ items: [{ field: 'count', name: '数量' }] }}
          />
        </section>
        <section className={`${styles.chartPanel} ${styles.chartPanelCompact}`}>
          <div><p className={styles.eyebrow}>饼图</p><h3>商品状态占比</h3></div>
          <Pie
            data={productStatusPieData}
            angleField="count"
            colorField="status"
            height={260}
            radius={0.76}
            paddingTop={32}
            legend={{ color: { position: 'bottom' } }}
            label={{ text: 'status', position: 'outside' }}
            tooltip={{ items: [{ field: 'count', name: '数量' }] }}
          />
        </section>
      </div>
    </div>
  );
}
