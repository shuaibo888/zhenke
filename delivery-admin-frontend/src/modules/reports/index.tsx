import { ReloadOutlined } from '@ant-design/icons';
import { Button, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ManagedReport } from '@/types';
import styles from '@/pages/index.less';

export interface ReportsModuleProps {
  reports: ManagedReport[];
  columns: ColumnsType<ManagedReport>;
  loading: boolean;
  page: number;
  total: number;
  onLoad: (page: number) => void;
}

export default function ReportsModule(props: ReportsModuleProps) {
  return (
    <section className={styles.tableSurface}>
      <div className={styles.tableHeader}>
        <div>
          <p className={styles.eyebrow}>真实体验和必须展示的不足</p>
          <h3>甄客验管理</h3>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => props.onLoad(props.page)}>刷新报告</Button>
      </div>
      <Table
        loading={props.loading}
        rowKey="id"
        columns={props.columns}
        dataSource={props.reports}
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
