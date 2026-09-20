import { CheckCircleFilled, ClockCircleOutlined, InfoCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Button, Spin } from 'antd';
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
  const [retryVersion, setRetryVersion] = useState(0);
  const order = loadedOrder ?? contextOrder;
  const resultCopy = order?.status === 'CANCELLED'
    ? { title: '订单已取消', description: '这笔订单已取消，可以返回商城重新选购。' }
    : order?.status === 'REFUNDING'
      ? { title: '订单退款处理中', description: '这笔订单已申请退款，请在订单详情中查看处理进度。' }
      : order?.status === 'REFUNDED'
        ? { title: '订单已退款', description: '这笔订单已完成退款，请在订单详情中查看退款记录。' }
        : { title: '支付结果尚未确认', description: '请先查看订单状态。如果已经付款，可稍后重新查询，避免重复付款。' };

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
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [orderId, user, retryVersion]);

  if (!user) {
    return <LoginRedirect />;
  }
  if (!orderId) {
    return <Navigate to="/profile/orders" replace />;
  }

  return (
    <main className={styles.checkoutSuccessPage}>
      <Spin spinning={loading}>
        {!loading && !loadError && order && ['PAID', 'SHIPPED', 'RECEIVED'].includes(order.status) ? (
          <section className={styles.checkoutSuccessCard}>
            <span className={styles.checkoutSuccessIcon}><CheckCircleFilled /></span>
            <h1>支付成功</h1>
            <p>{order.status === 'RECEIVED'
              ? '订单已完成，可在订单详情中查看消费记录。'
              : order.status === 'SHIPPED'
                ? '订单已支付，商品正在配送中，可在订单详情中查看物流。'
                : order.fulfillmentType === 'OFFLINE'
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
              onClick={() => navigate(`/profile/orders/${orderId}`)}
            >
              {order.fulfillmentType === 'OFFLINE' ? '查看订单与核销码' : '查看订单详情'}
            </Button>
            <small><SafetyCertificateOutlined /> 支付结果已确认</small>
          </section>
        ) : !loading && loadError ? (
          <section className={styles.checkoutSuccessCard} role="alert">
            <h1>暂时无法确认支付结果</h1>
            <p>{loadError}</p>
            <p>请先查看订单状态，避免重复付款。</p>
            <Button block type="primary" size="large" onClick={() => setRetryVersion((value) => value + 1)}>重新查询</Button>
            <Button block size="large" onClick={() => navigate(`/profile/orders/${orderId}`)}>查看订单详情</Button>
          </section>
        ) : !loading ? (
          <section className={styles.checkoutSuccessCard}>
            <span className={styles.checkoutResultIcon}>{order?.status === 'REFUNDING' ? <ClockCircleOutlined /> : <InfoCircleOutlined />}</span>
            <h1>{resultCopy.title}</h1>
            <p>{resultCopy.description}</p>
            <Button block type="primary" size="large" onClick={() => navigate(`/profile/orders/${orderId}`)}>查看订单详情</Button>
            {(!order || order.status === 'PENDING_PAYMENT') && <Button block size="large" onClick={() => setRetryVersion((value) => value + 1)}>重新查询</Button>}
          </section>
        ) : loading ? (
          <div className={styles.checkoutSuccessLoading}>正在确认支付结果…</div>
        ) : null}
      </Spin>
    </main>
  );
}
