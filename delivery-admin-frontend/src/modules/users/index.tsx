import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Select, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ShopMemberLevel, ShopUserAccount } from '@/types';
import styles from '@/pages/index.less';

export interface UsersModuleProps {
  users: ShopUserAccount[];
  columns: ColumnsType<ShopUserAccount>;
  loading: boolean;
  total: number;
  page: number;
  keyword: string;
  status?: string;
  levelId?: number;
  levels: ShopMemberLevel[];
  onKeywordChange: (value: string) => void;
  onStatusChange: (value?: string) => void;
  onLevelChange: (value?: number) => void;
  onLoad: (page: number) => void;
  onReset: () => void;
}

export default function UsersModule(props: UsersModuleProps) {
  return (
    <section className={styles.tableSurface}>
      <div className={styles.tableHeader}>
        <div>
          <p className={styles.eyebrow}>真实注册账号与会员等级</p>
          <h3>商城用户</h3>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => props.onLoad(props.page)} loading={props.loading}>
          刷新
        </Button>
      </div>
      <div className={styles.productToolbar}>
        <Input
          className={styles.productSearch}
          prefix={<SearchOutlined />}
          allowClear
          placeholder="搜索用户名或昵称"
          value={props.keyword}
          onChange={(event) => props.onKeywordChange(event.target.value)}
          onPressEnter={() => props.onLoad(1)}
        />
        <Select
          className={styles.productFilter}
          allowClear
          placeholder="全部等级"
          value={props.levelId}
          onChange={props.onLevelChange}
          options={props.levels.map((level) => ({ value: level.levelId, label: level.levelName }))}
        />
        <Select
          className={styles.productFilter}
          allowClear
          placeholder="全部状态"
          value={props.status}
          onChange={props.onStatusChange}
          options={[
            { label: '正常', value: '0' },
            { label: '停用', value: '1' },
          ]}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={() => props.onLoad(1)}>查询</Button>
        <Button icon={<ReloadOutlined />} onClick={props.onReset}>重置</Button>
        <span className={styles.filterSummary}>共 {props.total} 个用户</span>
      </div>
      <Table
        rowKey="userId"
        columns={props.columns}
        dataSource={props.users}
        loading={props.loading}
        scroll={{ x: 'max-content' }}
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
