import {
  EnvironmentOutlined,
  FileTextOutlined,
  ShopOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import { Button, Result, Spin, Tag, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'umi';
import { useShop } from '@/app/ShopContext';
import { ZkTaskHeader } from '@/components/ZkPage';
import { LogisticsModal } from '@/components/LogisticsModal';
import { PublishReportModal } from '@/components/PublishReportModal';
import { TrialRedeemCodeModal } from '@/components/TrialRedeemCodeModal';
import {
  confirmTrialReceived,
  fetchMyTrialApplication,
  fetchTrialApplicationLogistics,
  type LogisticsTraceDto,
  type TrialApplicationDto,
  type VerificationReportDto,
} from '@/services/shopContent';
import { formatDateTime } from '@/utils/shop';
import styles from '@/styles/commerce.less';

const statusMeta: Record<TrialApplicationDto['status'], { label: string; color: string; description: string }> = {
  APPLIED: { label: '待审核', color: 'processing', description: '申请已提交，正在等待商家审核' },
  APPROVED: { label: '已通过', color: 'success', description: '申请已通过，等待商家安排试用' },
  REJECTED: { label: '未通过', color: 'error', description: '本次申请未通过，可查看审核说明' },
  SHIPPED: { label: '待收货', color: 'cyan', description: '试用品已发货，请留意物流信息' },
  RECEIVED: { label: '待发布', color: 'gold', description: '已确认收货，可以发布真实甄客验' },
  PENDING_REDEMPTION: { label: '待核销', color: 'processing', description: '申请已通过，到店后请出示核销码' },
  REDEEMED: { label: '待发布', color: 'gold', description: '线下试用已核销，可以发布真实甄客验' },
  COMPLETED: { label: '已完成', color: 'default', description: '本次试用流程已完成' },
  EXPIRED: { label: '已过期', color: 'default', description: '本次试用资格已过期' },
};

type TrialTimelineItem = { label: string; time?: string; note?: string };

function buildTimeline(trial: TrialApplicationDto): TrialTimelineItem[] {
  const items: TrialTimelineItem[] = [{ label: '提交试用申请', time: trial.createTime, note: trial.applyReason }];
  if (trial.auditTime || trial.status !== 'APPLIED') {
    items.push({
      label: trial.status === 'REJECTED' ? '申请未通过' : '审核完成',
      time: trial.auditTime,
      note: trial.auditRemark,
    });
  }
  if (trial.status === 'PENDING_REDEMPTION') items.push({ label: '等待到店核销' });
  if (trial.shippedAt) items.push({ label: '商家已发货', time: trial.shippedAt, note: trial.trackingNo });
  if (trial.receivedAt) items.push({ label: '已确认收货', time: trial.receivedAt });
  if (trial.redeemedAt) items.push({ label: '到店核销完成', time: trial.redeemedAt });
  if (trial.completedAt) items.push({ label: '甄客验已发布', time: trial.completedAt });
  if (trial.status === 'EXPIRED') items.push({ label: '试用资格已过期' });
  return items;
}

export default function TrialDetailPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const { user, replaceTrial, replaceReport, refreshTrials, refreshReports } = useShop();
  const numericApplicationId = Number(applicationId);
  const [trial, setTrial] = useState<TrialApplicationDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mutating, setMutating] = useState(false);
  const [logistics, setLogistics] = useState<LogisticsTraceDto | null>(null);
  const [logisticsOpen, setLogisticsOpen] = useState(false);
  const [logisticsLoading, setLogisticsLoading] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isSafeInteger(numericApplicationId) || numericApplicationId <= 0) {
      setError('试用申请编号无效');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setTrial(await fetchMyTrialApplication(numericApplicationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '试用详情加载失败');
    } finally {
      setLoading(false);
    }
  }, [numericApplicationId]);

  useEffect(() => {
    if (user) void load();
  }, [load, user]);

  if (!user) return <Navigate to="/auth" replace />;

  const updateTrial = (next: TrialApplicationDto) => {
    setTrial(next);
    replaceTrial(next);
  };

  const confirmReceived = async () => {
    if (!trial) return;
    setMutating(true);
    try {
      updateTrial(await confirmTrialReceived(trial.applicationId));
      message.success('已确认收货，现在可以自愿发布甄客验');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '确认收货失败');
    } finally {
      setMutating(false);
    }
  };

  const openLogistics = async () => {
    if (!trial) return;
    setLogisticsOpen(true);
    setLogisticsLoading(true);
    try {
      setLogistics(await fetchTrialApplicationLogistics(trial.applicationId));
    } catch (err) {
      message.error(err instanceof Error ? err.message : '物流查询失败');
    } finally {
      setLogisticsLoading(false);
    }
  };

  const reportPublished = async (report: VerificationReportDto) => {
    replaceReport(report);
    setPublishOpen(false);
    await Promise.all([load(), refreshTrials(), refreshReports()]);
    navigate(`/reports/${report.reportId}`);
  };

  if (loading) {
    return <main className={`${styles.profileDetailPage} ${styles.businessDetailPage}`}><Spin size="large" /></main>;
  }

  if (error || !trial) {
    return (
      <main className={`${styles.profileDetailPage} ${styles.businessDetailPage}`}>
        <Result
          status="warning"
          title={error || '试用申请不存在'}
          extra={<Button onClick={() => navigate('/profile/trials')}>返回我的试用</Button>}
        />
      </main>
    );
  }

  const status = statusMeta[trial.status];
  const publishable = (trial.trialType === 'OFFLINE' && trial.status === 'REDEEMED')
    || (trial.trialType === 'ONLINE' && trial.status === 'RECEIVED');
  const timeline = buildTimeline(trial);

  return (
    <>
      <main className={`${styles.profileDetailPage} ${styles.businessDetailPage}`}>
        <ZkTaskHeader eyebrow="参与服务" title="试用详情" description="按真实状态完成审核、收货或核销，再发布可信甄客验。" backTo="/profile/trials" />
        <section className={styles.businessStatusHero}>
          <div>
            <span className={styles.eyebrow}>试用详情</span>
            <h2>{status.label}</h2>
            <p>{status.description}</p>
          </div>
          <Tag color={status.color}>{status.label}</Tag>
        </section>

        <section className={styles.businessInfoCard}>
          <div className={styles.businessSectionTitle}><ShopOutlined /><h3>{trial.campaignTitle}</h3></div>
          <button type="button" className={styles.businessTrialProduct} onClick={() => navigate(`/products/${trial.productId}?campaign=${trial.campaignId}`)}>
            {trial.productCoverUrl ? <img src={trial.productCoverUrl} alt={trial.productName} /> : <span>验</span>}
            <span>
              <strong>{trial.productName}</strong>
              <small>{trial.merchantName || '甄客行'}</small>
            </span>
            <Tag color={trial.trialType === 'ONLINE' ? 'green' : 'cyan'}>{trial.trialType === 'ONLINE' ? '线上试用' : '线下试用'}</Tag>
          </button>
          {trial.campaignSummary && <p className={styles.businessSummary}>{trial.campaignSummary}</p>}
        </section>

        <section className={styles.businessInfoCard}>
          <div className={styles.businessSectionTitle}><FileTextOutlined /><h3>申请信息</h3></div>
          <dl className={styles.businessDefinitionList}>
            <div><dt>申请编号</dt><dd>{trial.applicationId}</dd></div>
            <div><dt>申请时间</dt><dd>{formatDateTime(trial.createTime)}</dd></div>
            {trial.applicationDeadline && <div><dt>招募截止</dt><dd>{formatDateTime(trial.applicationDeadline)}</dd></div>}
            <div className={styles.businessLongValue}><dt>申请理由</dt><dd>{trial.applyReason}</dd></div>
            {trial.auditRemark && <div className={styles.businessLongValue}><dt>审核说明</dt><dd>{trial.auditRemark}</dd></div>}
          </dl>
        </section>

        {trial.trialType === 'ONLINE' && (
          <section className={styles.businessInfoCard}>
            <div className={styles.businessSectionTitle}><EnvironmentOutlined /><h3>收货与物流</h3></div>
            <dl className={styles.businessDefinitionList}>
              <div><dt>收货人</dt><dd>{trial.recipientName} {trial.recipientPhone}</dd></div>
              <div className={styles.businessLongValue}><dt>收货地址</dt><dd>{trial.shippingAddress}</dd></div>
              {trial.trackingNo && <div><dt>物流单号</dt><dd>{trial.carrier ? `${trial.carrier} · ` : ''}{trial.trackingNo}</dd></div>}
            </dl>
          </section>
        )}

        <section className={styles.businessInfoCard}>
          <div className={styles.businessSectionTitle}><TruckOutlined /><h3>试用进度</h3></div>
          <div className={styles.businessTimeline}>
            {timeline.map((item, index) => (
              <div className={index === timeline.length - 1 ? styles.businessTimelineCurrent : ''} key={`${item.label}-${index}`}>
                <i />
                <span><strong>{item.label}</strong>{item.note && <small>{item.note}</small>}</span>
                <time>{formatDateTime(item.time)}</time>
              </div>
            ))}
          </div>
        </section>

        <div className={styles.businessActionBar}>
          <Button onClick={() => navigate('/profile/trials')}>返回列表</Button>
          {trial.trialType === 'ONLINE' && trial.trackingNo && ['SHIPPED', 'RECEIVED', 'COMPLETED'].includes(trial.status) && <Button onClick={() => void openLogistics()}>查看物流</Button>}
          {trial.status === 'SHIPPED' && <Button type="primary" loading={mutating} onClick={() => void confirmReceived()}>确认收货</Button>}
          {trial.trialType === 'OFFLINE' && trial.status === 'PENDING_REDEMPTION' && <Button type="primary" onClick={() => setRedeemOpen(true)}>出示核销码</Button>}
          {publishable && <Button type="primary" onClick={() => setPublishOpen(true)}>发布甄客验</Button>}
          {trial.verificationReportId && <Button type="primary" onClick={() => navigate(`/reports/${trial.verificationReportId}`)}>查看甄客验</Button>}
        </div>
      </main>

      <LogisticsModal open={logisticsOpen} loading={logisticsLoading} title="试用物流详情" referenceNo={trial.trackingNo} trace={logistics} onClose={() => setLogisticsOpen(false)} />
      <PublishReportModal open={publishOpen} trial={trial} onClose={() => setPublishOpen(false)} onPublished={(report) => void reportPublished(report)} />
      <TrialRedeemCodeModal open={redeemOpen} trial={trial} onClose={() => setRedeemOpen(false)} onRedeemed={() => { setRedeemOpen(false); void load(); void refreshTrials(); }} />
    </>
  );
}
