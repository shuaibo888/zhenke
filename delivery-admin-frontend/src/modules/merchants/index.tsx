import { ReloadOutlined } from '@ant-design/icons';
import { Button, Dropdown, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MerchantAccount } from '@/types';
import styles from '@/pages/index.less';

function formatDateTime(value?: string, emptyText = '-') {
  if (!value) return emptyText;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
  return match ? `${match[1]} ${match[2]}` : value;
}

export interface MerchantsModuleProps {
  merchants: MerchantAccount[];
  loading: boolean;
  page: number;
  total: number;
  onLoad: (page: number) => void;
  onOpenDetail: (merchant: MerchantAccount) => void;
  onAudit: (merchant: MerchantAccount) => void;
  onToggleStatus: (merchant: MerchantAccount) => void;
}

export default function MerchantsModule(props: MerchantsModuleProps) {
  const columns: ColumnsType<MerchantAccount> = [
    { title: '店铺名称', dataIndex: 'name', width: 120 },
    { title: '申请编号', dataIndex: 'applicationNo', width: 190, responsive: ['md'] },
    { title: '后台账号', dataIndex: 'username', width: 120, responsive: ['md'] },
    { title: '负责人', dataIndex: 'ownerName', width: 80, responsive: ['md'] },
    { title: '手机号', dataIndex: 'phone', width: 120, responsive: ['md'] },
    { title: '公司地址', dataIndex: 'companyAddress', ellipsis: true, responsive: ['md'] },
    {
      title: '入驻时间',
      dataIndex: 'registeredAt',
      width: 170,
      responsive: ['md'],
      render: (value?: string) => <span className={styles.tableDateTime}>{formatDateTime(value)}</span>,
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_, merchant) => (
        <Space size={4}>
          <Tag color={merchant.auditStatus === 'approved' ? 'green' : merchant.auditStatus === 'rejected' ? 'red' : 'processing'}>
            {merchant.auditStatus === 'approved' ? '已通过' : merchant.auditStatus === 'rejected' ? '已驳回' : '待审核'}
          </Tag>
          {merchant.auditStatus === 'approved' && (
            <Tag color={merchant.status === 'active' ? 'blue' : 'default'}>
              {merchant.status === 'active' ? '启用' : '停用'}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 68,
      render: (_, merchant) => (
        <Dropdown
          menu={{
            items: [
              { key: 'view', label: '查看材料与审核记录', onClick: () => props.onOpenDetail(merchant) },
              ...(merchant.auditStatus === 'pending'
                ? [{ key: 'audit', label: '审核', onClick: () => props.onAudit(merchant) }]
                : []),
              ...(merchant.auditStatus === 'approved'
                ? [{
                    key: 'toggle',
                    label: merchant.status === 'active' ? '停用' : '启用',
                    onClick: () => props.onToggleStatus(merchant),
                  }]
                : []),
            ],
          }}
        >
          <Button size="small">操作</Button>
        </Dropdown>
      ),
    },
  ];

  return (
    <section className={styles.tableSurface}>
      <div className={styles.tableHeader}>
        <div>
          <p className={styles.eyebrow}>管理员专属</p>
          <h3>商家管理</h3>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => props.onLoad(props.page)} loading={props.loading}>
          刷新
        </Button>
      </div>
      <Table
        rowKey="id"
        dataSource={props.merchants}
        loading={props.loading}
        pagination={{
          current: props.page,
          pageSize: 10,
          total: props.total,
          showSizeChanger: false,
          showTotal: (total) => `共 ${total} 条`,
          onChange: props.onLoad,
        }}
        scroll={{ x: 'max-content' }}
        columns={columns}
      />
    </section>
  );
}
