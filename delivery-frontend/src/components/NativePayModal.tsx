import { Button, Modal, QRCode, message } from 'antd';
import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { reconcileWechatPayment } from '@/services/shopContent';
import styles from '@/styles/commerce.less';

const NATIVE_POLL_INTERVAL_MS = 2500;

export function NativePayModal() {
  const navigate = useNavigate();
  const { nativePayment, clearNativePayment, refreshOrders } = useShop();
  const timerRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reconcile = useCallback(async () => {
    if (!nativePayment) return;
    try {
      const refreshed = await reconcileWechatPayment(nativePayment.orderId);
      if (refreshed.status === 'PAID') {
        stopPolling();
        clearNativePayment();
        void refreshOrders();
        message.success('微信支付成功，等待商家发货');
        navigate(`/checkout/success?orderId=${nativePayment.orderId}`);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '微信支付状态确认失败');
    }
  }, [nativePayment, clearNativePayment, refreshOrders, navigate, stopPolling]);

  useEffect(() => {
    if (!nativePayment) return;
    void reconcile();
    timerRef.current = window.setInterval(() => void reconcile(), NATIVE_POLL_INTERVAL_MS);
    return stopPolling;
  }, [nativePayment, reconcile, stopPolling]);

  useBodyScrollLock(Boolean(nativePayment));

  if (!nativePayment) return null;

  return (
    <Modal
      title="微信扫码支付"
      open
      onCancel={clearNativePayment}
      footer={null}
      width={420}
      rootClassName={styles.responsiveModal}
    >
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
        <QRCode value={nativePayment.codeUrl} size={220} />
        <p style={{ margin: 0 }}>
          请使用微信扫一扫完成支付，支付成功后本页将自动跳转。
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button onClick={clearNativePayment}>稍后支付</Button>
          <Button type="primary" onClick={() => void reconcile()}>我已完成支付</Button>
        </div>
      </div>
    </Modal>
  );
}
