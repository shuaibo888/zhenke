import { PlusOutlined, ReloadOutlined, ScanOutlined } from '@ant-design/icons';
import { Button, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ManagedTrialApplication, ManagedTrialRecruitment } from '@/types';
import styles from '@/pages/index.less';

export interface TrialsModuleProps {
  isAdmin: boolean;
  trials: ManagedTrialRecruitment[];
  trialColumns: ColumnsType<ManagedTrialRecruitment>;
  trialsLoading: boolean;
  trialPage: number;
  trialTotal: number;
  applications: ManagedTrialApplication[];
  applicationColumns: ColumnsType<ManagedTrialApplication>;
  applicationsLoading: boolean;
  applicationPage: number;
  applicationTotal: number;
  onPublish: () => void;
  onOpenRedeem: () => void;
  onLoadTrials: (page: number) => void;
  onLoadApplications: (page: number) => void;
}

export default function TrialsModule(props: TrialsModuleProps) {
  return (
    <section className={styles.tableSurface}>
      <div className={styles.tableHeader}>
        <div>
          <p className={styles.eyebrow}>
            {props.isAdmin ? '所有商家的试用招募' : '发布试用招募，获取真实验证报告'}
          </p>
          <h3>试用招募</h3>
        </div>
        {!props.isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={props.onPublish}>
            发布试用
          </Button>
        )}
      </div>
      <Table
        loading={props.trialsLoading}
        rowKey="id"
        columns={props.trialColumns}
        dataSource={props.trials}
        pagination={{
          current: props.trialPage,
          pageSize: 10,
          total: props.trialTotal,
          showSizeChanger: false,
          showTotal: (total) => `共 ${total} 条`,
          onChange: props.onLoadTrials,
        }}
      />
      <div style={{ marginTop: 28 }}>
          <div className={styles.tableHeader}>
            <div>
              <p className={styles.eyebrow}>线上审核后寄送，线下审核后到店出示核销码，扫码核销后获得报告资格</p>
              <h3>试用申请</h3>
            </div>
            <Space wrap size={8}>
              <Button type="primary" icon={<ScanOutlined />} onClick={props.onOpenRedeem}>
                核销
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => props.onLoadApplications(props.applicationPage)}>
                刷新申请
              </Button>
            </Space>
          </div>
          <Table
            loading={props.applicationsLoading}
            rowKey="applicationId"
            columns={props.applicationColumns}
            dataSource={props.applications}
            scroll={{ x: 'max-content' }}
            pagination={{
              current: props.applicationPage,
              pageSize: 10,
              total: props.applicationTotal,
              showSizeChanger: false,
              showTotal: (total) => `共 ${total} 条`,
              onChange: props.onLoadApplications,
            }}
          />
      </div>
    </section>
  );
}
