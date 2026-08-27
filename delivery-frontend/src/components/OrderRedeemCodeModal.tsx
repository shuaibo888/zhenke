import { Button, Modal, QRCode, Spin, message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { fetchShopOrderRedeemCode, type ShopOrderDto } from '@/services/shopContent';
import styles from '@/styles/commerce.less';

const REDEEM_POLL_INTERVAL_MS = 3000;

export function OrderRedeemCodeModal({
  open,
  order,
  onClose,
  onRedeemed,
}: {
  open: boolean;
  order: ShopOrderDto | null;
  onClose: () => void;
  onRedeemed: () => void;
}) {
  const [current, setCurrent] = useState<ShopOrderDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handledRef = useRef(false);
  const checkingOrderIdRef = useRef<number | null>(null);
  const activeOrderIdRef = useRef<number | null>(order?.orderId ?? null);
  activeOrderIdRef.current = order?.orderId ?? null;
  useBodyScrollLock(open);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!order) return;
    const orderId = order.orderId;
    if (checkingOrderIdRef.current === orderId) return;
    checkingOrderIdRef.current = orderId;
    if (!options?.silent) setLoading(true);
    try {
      const next = await fetchShopOrderRedeemCode(orderId);
      if (activeOrderIdRef.current !== orderId) return;
      setError('');
      setCurrent(next);
      if (next.status === 'RECEIVED' && !handledRef.current) {
        handledRef.current = true;
        message.success('核销成功，现在可以发布购买甄客验');
        onRedeemed();
      }
    } catch (err) {
      if (options?.silent || activeOrderIdRef.current !== orderId) return;
      const reason = err instanceof Error ? err.message : '获取核销码失败';
      setError(reason);
      message.error(reason);
    } finally {
      if (checkingOrderIdRef.current === orderId) checkingOrderIdRef.current = null;
      if (!options?.silent && activeOrderIdRef.current === orderId) setLoading(false);
    }
  }, [order, onRedeemed]);

  useEffect(() => {
    if (!open || !order) return;
    handledRef.current = false;
    setCurrent(null);
    setError('');
    void load();
    const timer = window.setInterval(() => void load({ silent: true }), REDEEM_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order?.orderId]);

  const redeemCode = current?.redeemCode;

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
          {order && (
            <div>
              <strong>{order.merchantName || '商家'}</strong>
              <p style={{ margin: '4px 0 0', color: 'rgba(0,0,0,0.45)' }}>
                {order.items.map((item) => item.productName).join('、')}
              </p>
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
                请向商家出示此核销码，商家扫码核销后即可发布购买甄客验。
              </p>
            </>
          ) : null}
        </div>
      </Spin>
    </Modal>
  );
}
