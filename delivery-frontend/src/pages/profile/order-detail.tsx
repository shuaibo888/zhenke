import {
  EnvironmentOutlined,
  FileTextOutlined,
  RightOutlined,
  ShopOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import { Button, Input, Modal, Result, Space, Spin, Tag, message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'umi';
import { useShop } from '@/app/ShopContext';
import { LoginRedirect } from '@/components/LoginRedirect';
import { ZkTaskHeader } from '@/components/ZkPage';
import { LogisticsModal } from '@/components/LogisticsModal';
import { OrderRedeemCodeModal } from '@/components/OrderRedeemCodeModal';
import { PublishReportModal } from '@/components/PublishReportModal';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import {
  cancelShopOrder,
  confirmShopOrderReceived,
  fetchShopOrder,
  fetchShopOrderLogistics,
  requestShopOrderRefund,
  type LogisticsTraceDto,
  type ShopOrderDto,
  type VerificationReportDto,
} from '@/services/shopContent';
import {
  formatPrice,
  getOrderStatusMeta,
  orderStatusMeta,
  paymentRemainingSeconds,
} from '@/utils/shop';
import styles from '@/styles/commerce.less';

type PurchaseItem = ShopOrderDto['items'][number];

function statusLabel(status?: string, fulfillmentType?: ShopOrderDto['fulfillmentType']) {
  if (!status) return '创建订单';
  if (status === 'PAID' && fulfillmentType === 'OFFLINE') return '待使用';
  if (status === 'RECEIVED' && fulfillmentType === 'OFFLINE') return '已核销';
  return orderStatusMeta[status as ShopOrderDto['status']]?.label || status;
}

function countdown(expiresAt?: string) {
  const remaining = paymentRemainingSeconds(expiresAt);
  if (!Number.isFinite(remaining)) return '';
  if (remaining <= 0) return '支付已超时，等待系统取消';
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return `支付剩余 ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const {
    user,
    replaceOrder,
    replaceReport,
    refreshCoupons,
    refreshOrders,
    refreshReports,
  } = useShop();
  const numericOrderId = Number(orderId);
  const [order, setOrder] = useState<ShopOrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [, setClock] = useState(Date.now());
  const [mutating, setMutating] = useState(false);
  const [logistics, setLogistics] = useState<LogisticsTraceDto | null>(null);
  const [logisticsOpen, setLogisticsOpen] = useState(false);
  const [logisticsLoading, setLogisticsLoading] = useState(false);
  const [logisticsError, setLogisticsError] = useState('');
  const logisticsRequestRef = useRef(0);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [reportItem, setReportItem] = useState<PurchaseItem | null>(null);
  const [redeemOpen, setRedeemOpen] = useState(false);
  useBodyScrollLock(refundOpen || Boolean(reportItem) || redeemOpen || logisticsOpen);

  const load = useCallback(async () => {
    if (!Number.isSafeInteger(numericOrderId) || numericOrderId <= 0) {
      setError('订单编号无效');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setOrder(await fetchShopOrder(numericOrderId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '订单加载失败');
    } finally {
      setLoading(false);
    }
  }, [numericOrderId]);

  useEffect(() => {
    if (user) void load();
  }, [load, user]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!user) return <LoginRedirect />;

  const updateOrder = (next: ShopOrderDto) => {
    setOrder(next);
    replaceOrder(next);
  };

  const cancel = () => {
    if (!order) return;
    Modal.confirm({
      title: '取消订单',
      content: '取消后商品库存将恢复，确定继续吗？',
      okText: '取消订单',
      cancelText: '保留订单',
      onOk: async () => {
        setMutating(true);
        try {
          updateOrder(await cancelShopOrder(order.orderId));
          if (order.coupons?.length) await refreshCoupons().catch(() => undefined);
          message.success('订单已取消');
        } catch (err) {
          message.error(err instanceof Error ? err.message : '订单取消失败');
        } finally {
          setMutating(false);
        }
      },
    });
  };

  const receive = () => {
    if (!order) return;
    Modal.confirm({
      title: '确认收货',
      content: '请确认已经收到商品，确认后可按订单项发布甄客验。',
      okText: '确认收货',
      cancelText: '暂不确认',
      onOk: async () => {
        setMutating(true);
        try {
          updateOrder(await confirmShopOrderReceived(order.orderId));
          message.success('已确认收货');
        } catch (err) {
          message.error(err instanceof Error ? err.message : '确认收货失败');
        } finally {
          setMutating(false);
        }
      },
    });
  };

  const openLogistics = async () => {
    if (!order) return;
    const requestId = ++logisticsRequestRef.current;
    setLogisticsOpen(true);
    setLogisticsLoading(true);
    setLogistics(null);
    setLogisticsError('');
    try {
      const next = await fetchShopOrderLogistics(order.orderId);
      if (logisticsRequestRef.current === requestId) setLogistics(next);
    } catch (err) {
      if (logisticsRequestRef.current !== requestId) return;
      const reason = err instanceof Error ? err.message : '物流查询失败';
      setLogisticsError(reason);
      message.error(reason);
    } finally {
      if (logisticsRequestRef.current === requestId) setLogisticsLoading(false);
    }
  };

  const submitRefund = async () => {
    if (!order) return;
    const reason = refundReason.trim();
    if (reason.length < 2 || reason.length > 200) {
      message.warning('退款原因需要 2 至 200 个字符');
      return;
    }
    setRefundSubmitting(true);
    try {
      updateOrder(await requestShopOrderRefund(order.orderId, reason));
      setRefundOpen(false);
      setRefundReason('');
      message.success('退款申请已提交');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '退款申请提交失败');
    } finally {
      setRefundSubmitting(false);
    }
  };

  const reportPublished = async (report: VerificationReportDto) => {
    replaceReport(report);
    setReportItem(null);
    await Promise.all([load(), refreshOrders(), refreshReports()]);
    navigate(`/reports/${report.reportId}`);
  };

  if (loading) {
    return <main className={`${styles.profileDetailPage} ${styles.businessDetailPage}`}><Spin size="large" /></main>;
  }

  if (error || !order) {
    return (
      <main className={`${styles.profileDetailPage} ${styles.businessDetailPage}`}>
        <Result
          status="warning"
          title={error || '订单不存在'}
          extra={(
            <Space wrap>
              {Number.isSafeInteger(numericOrderId) && numericOrderId > 0 && (
                <Button type="primary" onClick={() => void load()}>重新加载</Button>
              )}
              <Button onClick={() => navigate('/profile/orders')}>返回我的订单</Button>
            </Space>
          )}
        />
      </main>
    );
  }

  const status = getOrderStatusMeta(order);
  const canRefund = ['PAID', 'SHIPPED', 'RECEIVED'].includes(order.status);

  return (
    <>
      <main className={`${styles.profileDetailPage} ${styles.businessDetailPage}`}>
        <ZkTaskHeader eyebrow="消费履约" title="订单详情" description="查看付款、配送或到店核销进度。" backTo="/profile/orders" />
        <section className={styles.businessStatusHero}>
          <div>
            <span className={styles.eyebrow}>订单详情</span>
            <h2>{status.label}</h2>
            <p>{order.status === 'PENDING_PAYMENT' ? countdown(order.paymentExpireTime) : `订单号 ${order.orderNo}`}</p>
          </div>
          <Tag color={status.color}>{status.label}</Tag>
        </section>

        {order.fulfillmentType === 'ONLINE' && order.address && (
          <section className={styles.businessInfoCard}>
            <div className={styles.businessSectionTitle}><EnvironmentOutlined /><h3>收货信息</h3></div>
            <div className={styles.businessAddress}>
              <strong>{order.address.recipient} <span>{order.address.phone}</span></strong>
              <p>{order.address.provinceCode}{order.address.cityCode}{order.address.districtCode}{order.address.detail}</p>
            </div>
          </section>
        )}

        <section className={styles.businessInfoCard}>
          <div className={styles.businessSectionTitle}><ShopOutlined /><h3>{order.merchantName || '甄客行'}</h3></div>
          <div className={styles.businessProductList}>
            {order.items.map((item) => (
              <button key={item.orderItemId} type="button" className={styles.businessProductRow} onClick={() => navigate(`/products/${item.productId}`)}>
                <img src={item.coverUrl} alt={item.productName} />
                <span className={styles.businessProductCopy}>
                  <strong>{item.productName}</strong>
                  <small>{formatPrice(item.unitPrice)} × {item.quantity}</small>
                </span>
                <b>{formatPrice(item.lineAmount)}</b>
                <RightOutlined />
              </button>
            ))}
          </div>
          {order.status === 'RECEIVED' && order.items.map((item) => (
            <div className={styles.businessInlineAction} key={item.orderItemId}>
              <span>{item.productName}</span>
              <Button onClick={() => item.verificationReportId
                ? navigate(`/reports/${item.verificationReportId}`)
                : setReportItem(item)}>
                {item.verificationReportId ? '查看甄客验' : '发布甄客验'}
              </Button>
            </div>
          ))}
        </section>

        <section className={styles.businessInfoCard}>
          <div className={styles.businessSectionTitle}><FileTextOutlined /><h3>金额明细</h3></div>
          <dl className={styles.businessDefinitionList}>
            <div><dt>商品金额</dt><dd>{formatPrice(order.originalAmount)}</dd></div>
            {order.discountAmount > 0 && <div><dt>优惠金额</dt><dd className={styles.businessDiscount}>-{formatPrice(order.discountAmount)}</dd></div>}
            {order.coupons?.map((coupon) => <div key={coupon.orderCouponId}><dt>{coupon.couponName}</dt><dd>-{formatPrice(coupon.appliedDiscountAmount)}</dd></div>)}
            <div className={styles.businessTotalRow}><dt>实付款</dt><dd>{formatPrice(order.totalAmount)}</dd></div>
          </dl>
        </section>

        <section className={styles.businessInfoCard}>
          <div className={styles.businessSectionTitle}><TruckOutlined /><h3>订单进度</h3></div>
          <div className={styles.businessTimeline}>
            {(order.statusLogs?.length ? order.statusLogs : [{ logId: 0, toStatus: order.status, remark: '', createTime: order.updateTime }]).map((log, index, logs) => (
              <div className={index === logs.length - 1 ? styles.businessTimelineCurrent : ''} key={log.logId}>
                <i />
                <span><strong>{statusLabel(log.toStatus, order.fulfillmentType)}</strong><small>{log.remark}</small></span>
                <time>{log.createTime}</time>
              </div>
            ))}
          </div>
          <dl className={styles.businessDefinitionList}>
            <div><dt>下单时间</dt><dd>{order.createTime}</dd></div>
            <div><dt>配送方式</dt><dd>{order.fulfillmentType === 'OFFLINE' ? '到店核销' : '快递配送'}</dd></div>
            {order.payTime && <div><dt>支付时间</dt><dd>{order.payTime}</dd></div>}
            {order.trackingNo && <div><dt>物流单号</dt><dd>{order.carrier ? `${order.carrier} · ` : ''}{order.trackingNo}</dd></div>}
            {order.refundReason && <div><dt>退款原因</dt><dd>{order.refundReason}</dd></div>}
            {order.refundAuditRemark && <div><dt>售后说明</dt><dd>{order.refundAuditRemark}</dd></div>}
          </dl>
        </section>

        <div className={styles.businessActionBar}>
          <Button onClick={() => navigate('/profile/orders')}>返回列表</Button>
          {order.status === 'PENDING_PAYMENT' && <Button onClick={cancel} loading={mutating}>取消订单</Button>}
          {order.status === 'PENDING_PAYMENT' && (
            <Button type="primary" disabled={paymentRemainingSeconds(order.paymentExpireTime) <= 0} onClick={() => navigate(`/checkout?orderId=${order.orderId}`)}>立即支付</Button>
          )}
          {order.status === 'PAID' && order.fulfillmentType === 'OFFLINE' && <Button type="primary" onClick={() => setRedeemOpen(true)}>出示核销码</Button>}
          {order.fulfillmentType === 'ONLINE' && !['PENDING_PAYMENT', 'CANCELLED'].includes(order.status) && <Button onClick={() => void openLogistics()}>查看物流</Button>}
          {canRefund && (
            <Button danger disabled={order.refundStatus === 'PENDING'} onClick={() => {
              if (order.status === 'SHIPPED') {
                message.info('已发货订单请先确认收货，再申请退款');
                return;
              }
              setRefundOpen(true);
            }}>{order.refundStatus === 'PENDING' ? '退款审核中' : '申请退款'}</Button>
          )}
          {order.status === 'SHIPPED' && <Button type="primary" loading={mutating} onClick={receive}>确认收货</Button>}
        </div>
      </main>

      <LogisticsModal
        open={logisticsOpen}
        loading={logisticsLoading}
        title="物流详情"
        referenceNo={order.orderNo}
        trace={logistics}
        error={logisticsError}
        onRetry={() => void openLogistics()}
        onClose={() => {
          logisticsRequestRef.current += 1;
          setLogisticsOpen(false);
          setLogistics(null);
          setLogisticsError('');
        }}
      />
      <Modal title="申请退款" open={refundOpen} onCancel={() => setRefundOpen(false)} onOk={() => void submitRefund()} confirmLoading={refundSubmitting} okText="提交申请" cancelText="取消">
        <Input.TextArea value={refundReason} onChange={(event) => setRefundReason(event.target.value)} rows={4} maxLength={200} showCount placeholder="请说明退款原因" />
      </Modal>
      <PublishReportModal open={Boolean(reportItem)} purchaseItem={reportItem} onClose={() => setReportItem(null)} onPublished={(report) => void reportPublished(report)} />
      <OrderRedeemCodeModal open={redeemOpen} order={order} onClose={() => setRedeemOpen(false)} onRedeemed={() => { setRedeemOpen(false); void load(); void refreshOrders(); }} />
    </>
  );
}
