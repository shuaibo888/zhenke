import { Button, Modal, QRCode, Spin, message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { fetchTrialRedeemCode, type TrialApplicationDto } from '@/services/shopContent';
import styles from '@/styles/commerce.less';

const REDEEM_POLL_INTERVAL_MS = 3000;

export function TrialRedeemCodeModal({
  open,
  trial,
  onClose,
  onRedeemed,
}: {
  open: boolean;
  trial: TrialApplicationDto | null;
  onClose: () => void;
  onRedeemed: () => void;
}) {
  const [application, setApplication] = useState<TrialApplicationDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handledRef = useRef(false);
  const checkingApplicationIdRef = useRef<number | null>(null);
  const activeApplicationIdRef = useRef<number | null>(trial?.applicationId ?? null);
  activeApplicationIdRef.current = trial?.applicationId ?? null;
  useBodyScrollLock(open);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!trial) return;
    const applicationId = trial.applicationId;
    if (checkingApplicationIdRef.current === applicationId) return;
    checkingApplicationIdRef.current = applicationId;
    if (!options?.silent) setLoading(true);
    try {
      const app = await fetchTrialRedeemCode(applicationId);
      if (activeApplicationIdRef.current !== applicationId) return;
      setError('');
      setApplication(app);
      if (app.status === 'REDEEMED' && !handledRef.current) {
        handledRef.current = true;
        message.success('核销成功，现在可以发布甄客验');
        onRedeemed();
      }
    } catch (err) {
      if (options?.silent || activeApplicationIdRef.current !== applicationId) return;
      const reason = err instanceof Error ? err.message : '获取核销码失败';
      setError(reason);
      message.error(reason);
    } finally {
      if (checkingApplicationIdRef.current === applicationId) checkingApplicationIdRef.current = null;
      if (!options?.silent && activeApplicationIdRef.current === applicationId) setLoading(false);
    }
  }, [trial, onRedeemed]);

  useEffect(() => {
    if (!open || !trial) return;
    handledRef.current = false;
    setApplication(null);
    setError('');
    void load();
    const timer = window.setInterval(() => void load({ silent: true }), REDEEM_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, trial?.applicationId]);

  const redeemCode = application?.redeemCode;

  return (
    <Modal
      title="出示核销码"
      open={open}
      onCancel={onClose}
      footer={null}
      width={460}
      rootClassName={styles.responsiveModal}
    >
      <Spin spinning={loading}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            padding: '8px 4px 4px',
            textAlign: 'center',
          }}
        >
          {trial && (
            <div>
              <strong>{trial.campaignTitle}</strong>
              <p style={{ margin: '4px 0 0', color: 'rgba(0,0,0,0.45)' }}>{trial.productName}</p>
            </div>
          )}
          {error ? (
            <div className={styles.empty}>
              <p>{error}</p>
              <Button type="primary" onClick={() => void load()}>重新加载</Button>
            </div>
          ) : redeemCode ? (
            <>
              <QRCode value={redeemCode} size={240} />
              <code
                style={{
                  userSelect: 'all',
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: 'rgba(0,0,0,0.04)',
                  fontSize: 12,
                  letterSpacing: 0.5,
                }}
              >
                {redeemCode}
              </code>
              <p style={{ margin: 0, color: 'rgba(0,0,0,0.45)' }}>
                请向商家出示此核销码，商家扫码核销后即可发布甄客验。
              </p>
            </>
          ) : null}
        </div>
      </Spin>
    </Modal>
  );
}
