import { Button, Spin, Tag, message } from 'antd';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { LoginRedirect } from '@/components/LoginRedirect';
import { ZkRefreshError, ZkTaskHeader } from '@/components/ZkPage';
import { LogisticsModal } from '@/components/LogisticsModal';
import { PublishReportModal } from '@/components/PublishReportModal';
import { TrialRedeemCodeModal } from '@/components/TrialRedeemCodeModal';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useRefreshOnRoute } from '@/hooks/useRefreshOnRoute';
import {
  confirmTrialReceived,
  fetchTrialApplicationLogistics,
  type LogisticsTraceDto,
  type TrialApplicationDto,
  type VerificationReportDto,
} from '@/services/shopContent';
import { formatDateTime } from '@/utils/shop';
import styles from '@/styles/commerce.less';

type TrialFilter = 'all' | 'APPLIED' | 'APPROVED' | 'SHIPPED' | 'publishable' | 'COMPLETED' | 'closed';

const statusMeta: Record<TrialApplicationDto['status'], { label: string; color: string }> = {
  APPLIED: { label: '待审核', color: 'processing' },
  APPROVED: { label: '已通过', color: 'success' },
  REJECTED: { label: '未通过', color: 'error' },
  SHIPPED: { label: '已发货', color: 'cyan' },
  RECEIVED: { label: '待发布', color: 'gold' },
  PENDING_REDEMPTION: { label: '待核销', color: 'processing' },
  REDEEMED: { label: '已核销', color: 'success' },
  COMPLETED: { label: '已完成', color: 'default' },
  EXPIRED: { label: '已过期', color: 'default' },
};

export default function TrialsPage() {
  const navigate = useNavigate();
  const {
    user,
    trials,
    trialsLoading,
    replaceTrial,
    replaceReport,
    refreshTrials,
    refreshReports,
  } = useShop();
  const [filter, setFilter] = useState<TrialFilter>('all');
  const [mutatingId, setMutatingId] = useState<number | null>(null);
  const [logisticsTrial, setLogisticsTrial] = useState<TrialApplicationDto | null>(null);
  const [logistics, setLogistics] = useState<LogisticsTraceDto | null>(null);
  const [logisticsLoading, setLogisticsLoading] = useState(false);
  const [logisticsError, setLogisticsError] = useState('');
  const logisticsRequestRef = useRef(0);
  const [publishTrial, setPublishTrial] = useState<TrialApplicationDto | null>(null);
  const [redeemTrial, setRedeemTrial] = useState<TrialApplicationDto | null>(null);
  useBodyScrollLock(Boolean(logisticsTrial) || Boolean(publishTrial) || Boolean(redeemTrial));
  const { refreshError, retry } = useRefreshOnRoute('/profile/trials', refreshTrials, '试用记录刷新失败');

  const filtered = useMemo(() => trials.filter((trial) => {
    if (filter === 'all') return true;
    if (filter === 'APPROVED') return trial.status === 'APPROVED' || trial.status === 'PENDING_REDEMPTION';
    if (filter === 'SHIPPED') return trial.status === 'SHIPPED';
    if (filter === 'publishable') return trial.status === 'RECEIVED' || trial.status === 'REDEEMED';
    if (filter === 'COMPLETED') return trial.status === 'COMPLETED';
    if (filter === 'closed') return trial.status === 'REJECTED' || trial.status === 'EXPIRED';
    return trial.status === filter;
  }), [filter, trials]);

  if (!user) {
    return <LoginRedirect />;
  }

  const confirmReceived = async (trial: TrialApplicationDto) => {
    setMutatingId(trial.applicationId);
    try {
      replaceTrial(await confirmTrialReceived(trial.applicationId));
      message.success('已确认收货，现在可以自愿发布甄客验');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '确认收货失败');
    } finally {
      setMutatingId(null);
    }
  };

  const openLogistics = async (trial: TrialApplicationDto) => {
    const requestId = ++logisticsRequestRef.current;
    setLogisticsTrial(trial);
    setLogisticsLoading(true);
    setLogistics(null);
    setLogisticsError('');
    try {
      const next = await fetchTrialApplicationLogistics(trial.applicationId);
      if (logisticsRequestRef.current === requestId) setLogistics(next);
    } catch (error) {
      if (logisticsRequestRef.current !== requestId) return;
      const reason = error instanceof Error ? error.message : '物流查询失败';
      setLogisticsError(reason);
      message.error(reason);
    } finally {
      if (logisticsRequestRef.current === requestId) setLogisticsLoading(false);
    }
  };

  const reportPublished = async (report: VerificationReportDto) => {
    replaceReport(report);
    setPublishTrial(null);
    await Promise.all([refreshTrials(), refreshReports()]);
    navigate(`/reports/${report.reportId}`);
  };

  return (
    <>
      <main className={`${styles.profileDetailPage} ${styles.trialsPage}`}>
        <ZkTaskHeader eyebrow="参与服务" title="我的试用" description="查看申请、审核、配送或到店核销以及甄客验发布进度。" backTo="/profile" />
        <ZkRefreshError error={refreshError} onRetry={() => void retry()} />
        <section className={styles.orderPanel}>
          <div className={styles.orderPanelHeading}>
            <div>
              <span className={styles.eyebrow}>试用中心</span>
              <h3>我的试用</h3>
            </div>
            <span>共 {filtered.length} 项</span>
          </div>
          <div className={styles.orderFilterTabs}>
            {([
              ['all', '全部'],
              ['APPLIED', '待审核'],
              ['APPROVED', '已通过'],
              ['SHIPPED', '待收货'],
              ['publishable', '待发布'],
              ['COMPLETED', '已完成'],
              ['closed', '未通过'],
            ] as Array<[TrialFilter, string]>).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={filter === key ? styles.orderFilterActive : ''}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <Spin spinning={trialsLoading}>
            <div className={styles.trialList}>
              {filtered.map((trial) => {
                const publishable = (trial.trialType === 'OFFLINE' && trial.status === 'REDEEMED')
                  || (trial.trialType === 'ONLINE' && trial.status === 'RECEIVED');
                return (
                  <article
                    className={`${styles.orderCard} ${styles.trialCard} ${styles.businessListCard}`}
                    key={trial.applicationId}
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/profile/trials/${trial.applicationId}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/profile/trials/${trial.applicationId}`);
                      }
                    }}
                  >
                    <div className={styles.orderCardHead}>
                      <span className={styles.orderShop}>
                        <span className={styles.orderShopAvatar}>试</span>
                        <strong>{trial.campaignTitle}</strong>
                      </span>
                      <Tag color={statusMeta[trial.status].color}>{statusMeta[trial.status].label}</Tag>
                    </div>
                    <div className={styles.trialCardBody}>
                      {trial.productCoverUrl
                        ? <img className={styles.orderThumb} src={trial.productCoverUrl} alt={trial.productName} />
                        : <span className={styles.trialProductMark}>验</span>}
                      <div className={styles.orderThumbInfo}>
                        <p className={styles.orderThumbTitle}>{trial.productName}</p>
                        <p className={styles.orderThumbNo}>申请时间 {formatDateTime(trial.createTime)}</p>
                        <div className={styles.trialTypeRow}>
                          <Tag color={trial.trialType === 'ONLINE' ? 'green' : 'cyan'}>
                            {trial.trialType === 'ONLINE' ? '线上试用' : '线下试用'}
                          </Tag>
                        </div>
                        {trial.auditRemark && <p className={styles.trialAuditRemark}>{trial.auditRemark}</p>}
                      </div>
                    </div>
                    <div className={styles.orderCardFooter} onClick={(event) => event.stopPropagation()}>
                      <Button size="small" onClick={() => navigate(`/profile/trials/${trial.applicationId}`)}>试用详情</Button>
                      {trial.trialType === 'ONLINE' && trial.trackingNo && ['SHIPPED', 'RECEIVED', 'COMPLETED'].includes(trial.status) && (
                        <Button size="small" onClick={() => void openLogistics(trial)}>查看物流</Button>
                      )}
                      {trial.status === 'SHIPPED' && (
                        <Button
                          size="small"
                          type="primary"
                          loading={mutatingId === trial.applicationId}
                          onClick={() => void confirmReceived(trial)}
                        >
                          确认收货
                        </Button>
                      )}
                      {trial.trialType === 'OFFLINE' && trial.status === 'PENDING_REDEMPTION' && (
                        <Button size="small" onClick={() => setRedeemTrial(trial)}>出示核销码</Button>
                      )}
                      {publishable && (
                        <Button size="small" type="primary" onClick={() => setPublishTrial(trial)}>发布甄客验</Button>
                      )}
                      {trial.verificationReportId && (
                        <Button size="small" type="primary" onClick={() => navigate(`/reports/${trial.verificationReportId}`)}>查看甄客验</Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            {!trialsLoading && filtered.length === 0 && (
              <p className={styles.empty}>{trials.length === 0 ? '还没有试用申请。' : '该分类下暂无试用记录。'}</p>
            )}
          </Spin>
        </section>
      </main>

      <LogisticsModal
        open={Boolean(logisticsTrial)}
        loading={logisticsLoading}
        title="试用物流详情"
        referenceNo={logisticsTrial?.trackingNo}
        trace={logistics}
        error={logisticsError}
        onRetry={logisticsTrial ? () => void openLogistics(logisticsTrial) : undefined}
        onClose={() => {
          logisticsRequestRef.current += 1;
          setLogisticsTrial(null);
          setLogistics(null);
          setLogisticsError('');
        }}
      />

      <PublishReportModal
        open={Boolean(publishTrial)}
        trial={publishTrial}
        onClose={() => setPublishTrial(null)}
        onPublished={(report) => void reportPublished(report)}
      />

      <TrialRedeemCodeModal
        open={Boolean(redeemTrial)}
        trial={redeemTrial}
        onClose={() => setRedeemTrial(null)}
        onRedeemed={() => {
          setRedeemTrial(null);
          void refreshTrials();
        }}
      />
    </>
  );
}
