import { TruckOutlined } from '@ant-design/icons';
import { Modal, Spin, Tag } from 'antd';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import type { LogisticsTraceDto } from '@/services/shopContent';
import styles from '@/styles/commerce.less';

const stateMeta: Record<LogisticsTraceDto['state'], { label: string; color: string }> = {
  PREPARING: { label: '商家备货中', color: 'default' },
  IN_TRANSIT: { label: '运输中', color: 'processing' },
  DELIVERED: { label: '已签收', color: 'success' },
  EXCEPTION: { label: '物流异常', color: 'error' },
  UNKNOWN: { label: '等待物流更新', color: 'default' },
};

export function LogisticsModal({
  open,
  loading,
  title,
  referenceNo,
  trace,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  title: string;
  referenceNo?: string;
  trace: LogisticsTraceDto | null;
  error?: string;
  onRetry?: () => void;
  onClose: () => void;
}) {
  useBodyScrollLock(open);
  return (
    <Modal title={title} open={open} onCancel={onClose} footer={null} width={560} rootClassName={styles.responsiveModal}>
      <Spin spinning={loading}>
        {trace ? (
          <div className={styles.logisticsOverview}>
            <section className={styles.logisticsSummaryCard}>
              <div className={styles.logisticsSummaryHeader}>
                <div className={styles.logisticsCarrierMark}><TruckOutlined /></div>
                <div className={styles.logisticsStatusCopy}>
                  <span>当前物流状态</span>
                  <strong>{stateMeta[trace.state].label}</strong>
                </div>
                <Tag color={stateMeta[trace.state].color}>{stateMeta[trace.state].label}</Tag>
              </div>
              <div className={styles.logisticsOrderBrief}>
                <strong>{title}</strong>
                <span>{referenceNo ? `业务编号 ${referenceNo}` : '物流信息'}</span>
              </div>
              <div className={styles.logisticsMeta}>
                <span>{trace.carrier || '平台物流'}</span>
                <span>{trace.trackingNo || '暂无运单号'}</span>
              </div>
              <p className={styles.logisticsNotice}>物流信息可能存在短暂延迟，请以最新轨迹和实际签收状态为准。</p>
            </section>
            <div className={styles.logisticsTimeline}>
              {trace.events.map((event, index) => (
                <article className={styles.logisticsTimelineItem} key={`${event.sourceEventId || index}`}>
                  <i />
                  <div>
                    <strong>{event.description}</strong>
                    {event.location && <span>{event.location}</span>}
                    {event.eventTime && <time>{event.eventTime}</time>}
                  </div>
                </article>
              ))}
              {trace.events.length === 0 && <p className={styles.empty}>物流轨迹正在更新，请稍后再查看。</p>}
            </div>
          </div>
        ) : !loading ? <p className={styles.empty}>暂无可展示的物流信息。</p> : null}
      </Spin>
    </Modal>
  );
}
