import { ReloadOutlined, ScanOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Select, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ManagedOrder } from '@/types';
import type { OrderStatusFilter } from '@/utils/orderManagement';
import styles from '@/pages/index.less';

export interface OrdersModuleProps {
  isAdmin: boolean;
  orders: ManagedOrder[];
  columns: ColumnsType<ManagedOrder>;
  loading: boolean;
  total: number;
  page: number;
  keyword: string;
  statusFilter: OrderStatusFilter;
  onKeywordChange: (value: string) => void;
  onStatusChange: (value: OrderStatusFilter) => void;
  onOpenRedeem: () => void;
  onLoad: (page: number) => void;
  onReset: () => void;
}

export default function OrdersModule(props: OrdersModuleProps) {
  return (
    <section className={styles.tableSurface}>
      <div className={styles.tableHeader}>
        <div>
          <p className={styles.eyebrow}>
            {props.isAdmin ? '平台全部真实订单、发货、物流与退款审核' : '真实订单、发货与收货地址'}
          </p>
          <h3>订单管理</h3>
        </div>
        <Space wrap size={8}>
          <Button type="primary" icon={<ScanOutlined />} onClick={props.onOpenRedeem}>
            核销
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => props.onLoad(props.page)}>刷新订单</Button>
        </Space>
      </div>
      <div className={styles.productToolbar}>
        <Input
          className={styles.productSearch}
          prefix={<SearchOutlined />}
          allowClear
          placeholder="搜索订单号或买家"
          value={props.keyword}
          onChange={(event) => props.onKeywordChange(event.target.value)}
          onPressEnter={() => props.onLoad(1)}
        />
        <Select<OrderStatusFilter>
          className={styles.orderFilter}
          value={props.statusFilter}
          onChange={props.onStatusChange}
          options={[
            { label: '全部订单状态', value: 'all' },
            { label: '待付款', value: 'unpaid' },
            { label: '待发货', value: 'paid' },
            { label: '待收货', value: 'shipped' },
            { label: '已完成', value: 'completed' },
            { label: '已取消', value: 'canceled' },
            { label: '退款中', value: 'refunding' },
            { label: '已退款', value: 'refunded' },
          ]}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={() => props.onLoad(1)}>查询</Button>
        <Button icon={<ReloadOutlined />} onClick={props.onReset}>重置</Button>
        <span className={styles.filterSummary}>共 {props.total} 个订单</span>
      </div>
      <Table
        loading={props.loading}
        rowKey="id"
        columns={props.columns}
        dataSource={props.orders}
        pagination={{
          current: props.page,
          pageSize: 10,
          total: props.total,
          showSizeChanger: false,
          showTotal: (total) => `共 ${total} 条`,
          onChange: props.onLoad,
        }}
      />
    </section>
  );
}
