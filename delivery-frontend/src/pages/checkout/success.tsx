import { CheckCircleFilled, SafetyCertificateOutlined } from '@ant-design/icons';
import { Alert, Button, Space, Spin, message } from 'antd';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'umi';
import { useShop } from '@/app/ShopContext';
import { LoginRedirect } from '@/components/LoginRedirect';
import { fetchShopOrder, type ShopOrderDto } from '@/services/shopContent';
import { formatPrice } from '@/utils/shop';
import styles from '@/styles/commerce.less';

export default function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, orders } = useShop();
  const orderIdValue = Number(searchParams.get('orderId'));
  const orderId = Number.isSafeInteger(orderIdValue) && orderIdValue > 0 ? orderIdValue : undefined;
  const contextOrder = orders.find((order) => order.orderId === orderId);
  const [loadedOrder, setLoadedOrder] = useState<ShopOrderDto | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [loadError, setLoadError] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);
  const order = loadedOrder ?? contextOrder;

  useEffect(() => {
    if (!user || !orderId) {
      setLoading(false);
      setLoadError('');
      return;
    }
    let mounted = true;
    setLoading(true);
    setLoadError('');
    setLoadedOrder(null);
    fetchShopOrder(orderId)
      .then((nextOrder) => {
        if (mounted) setLoadedOrder(nextOrder);
      })
      .catch((error) => {
        if (mounted) {
          const reason = error instanceof Error ? error.message : '支付订单加载失败';
          setLoadError(reason);
          message.error(reason);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [orderId, reloadVersion, user]);

  if (!user) {
    return <LoginRedirect />;
  }
  if (!orderId) {
    return <Navigate to="/profile/orders" replace />;
  }

  return (
    <main className={styles.checkoutSuccessPage}>
      <Spin spinning={loading}>
        {!loading && !loadError && order?.status === 'PAID' ? (
          <section className={styles.checkoutSuccessCard}>
            <span className={styles.checkoutSuccessIcon}><CheckCircleFilled /></span>
            <span className={styles.eyebrow}>PAYMENT SUCCESS</span>
            <h1>支付成功</h1>
            <p>{order.fulfillmentType === 'OFFLINE'
              ? '订单已支付完成，可在订单详情中出示核销码，到店或现场使用。'
              : '订单已支付完成，商家将尽快为你安排发货。'}</p>
            <div className={styles.checkoutSuccessAmount}>
              <span>实付金额</span>
              <strong>{formatPrice(order.totalAmount)}</strong>
            </div>
            <dl className={styles.checkoutSuccessDetails}>
              <div><dt>订单编号</dt><dd>{order.orderNo}</dd></div>
              <div><dt>商家</dt><dd>{order.merchantName || '甄客行'}</dd></div>
              <div><dt>履约方式</dt><dd>{order.fulfillmentType === 'OFFLINE' ? '到店核销' : '快递配送'}</dd></div>
              {order.discountAmount > 0 && (
                <div><dt>优惠金额</dt><dd>-{formatPrice(order.discountAmount)}</dd></div>
              )}
            </dl>
            <Button
              block
              type="primary"
              size="large"
              onClick={() => navigate('/profile/orders')}
            >
              {order.fulfillmentType === 'OFFLINE' ? '查看订单与核销码' : '返回订单列表'}
            </Button>
            <small><SafetyCertificateOutlined /> 支付结果已确认</small>
          </section>
        ) : !loading && loadError ? (
          <Alert
            className={styles.checkoutSuccessError}
            type="error"
            showIcon
            message="支付结果暂时无法查询"
            description={loadError}
            action={(
              <Space wrap>
                <Button danger onClick={() => setReloadVersion((value) => value + 1)}>重新查询</Button>
                <Button onClick={() => navigate('/profile/orders')}>返回订单列表</Button>
              </Space>
            )}
          />
        ) : !loading ? (
          <Alert
            className={styles.checkoutSuccessError}
            type="warning"
            showIcon
            message="支付结果尚未确认"
            description="暂未确认支付成功，请返回订单查看最新状态。"
            action={<Button onClick={() => navigate('/profile/orders')}>返回订单列表</Button>}
          />
        ) : (
          <div className={styles.checkoutSuccessLoading}>正在确认支付结果…</div>
        )}
      </Spin>
    </main>
  );
}
