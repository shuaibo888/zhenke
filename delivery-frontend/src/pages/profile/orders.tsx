import { Button, Input, Modal, Spin, Tag, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { ZkTaskHeader } from '@/components/ZkPage';
import { LogisticsModal } from '@/components/LogisticsModal';
import { OrderRedeemCodeModal } from '@/components/OrderRedeemCodeModal';
import { PublishReportModal } from '@/components/PublishReportModal';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useRefreshOnRoute } from '@/hooks/useRefreshOnRoute';
import {
  cancelShopOrder,
  confirmShopOrderReceived,
  fetchShopOrderLogistics,
  requestShopOrderRefund,
  type LogisticsTraceDto,
  type ShopOrderDto,
  type VerificationReportDto,
} from '@/services/shopContent';
import { formatPrice, getOrderStatusMeta, paymentRemainingSeconds } from '@/utils/shop';
import styles from '@/styles/commerce.less';

type Filter = 'all' | 'PENDING_PAYMENT' | 'pending_fulfillment' | 'SHIPPED' | 'pending_report' | 'aftersale';
type PurchaseItem = ShopOrderDto['items'][number];

function countdown(expiresAt?: string) {
  const remaining = paymentRemainingSeconds(expiresAt);
  if (!Number.isFinite(remaining)) return '';
  if (remaining <= 0) return '支付已超时，等待系统取消';
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return `支付剩余 ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const {
    user,
    orders,
    ordersLoading,
    replaceOrder,
    replaceReport,
    refreshCoupons,
    refreshOrders,
    refreshReports,
  } = useShop();
  const [filter, setFilter] = useState<Filter>('all');
  const [clock, setClock] = useState(Date.now());
  const [mutatingId, setMutatingId] = useState<number | null>(null);
  const [logistics, setLogistics] = useState<LogisticsTraceDto | null>(null);
  const [logisticsOpen, setLogisticsOpen] = useState(false);
  const [logisticsLoading, setLogisticsLoading] = useState(false);
  const [logisticsOrder, setLogisticsOrder] = useState<ShopOrderDto | null>(null);
  const [refundOrder, setRefundOrder] = useState<ShopOrderDto | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [reportItem, setReportItem] = useState<PurchaseItem | null>(null);
  const [redeemOrder, setRedeemOrder] = useState<ShopOrderDto | null>(null);
  useBodyScrollLock(logisticsOpen || Boolean(refundOrder) || Boolean(reportItem) || Boolean(redeemOrder));
  useRefreshOnRoute('/profile/orders', refreshOrders, '订单记录刷新失败');

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const filtered = useMemo(() => orders.filter((order) => {
    if (filter === 'all') return true;
    if (filter === 'aftersale') return Boolean(order.refundStatus) || ['REFUNDING', 'REFUNDED'].includes(order.status);
    if (filter === 'pending_report') {
      return order.status === 'RECEIVED' && order.items.some((item) => !item.verificationReportId);
    }
    if (filter === 'pending_fulfillment') return order.status === 'PAID';
    return order.status === filter;
  }), [clock, filter, orders]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const cancel = (order: ShopOrderDto) => {
    Modal.confirm({
      title: '取消订单',
      content: '取消后库存会由服务端恢复，确定继续吗？',
      okText: '取消订单',
      cancelText: '保留订单',
      onOk: async () => {
        setMutatingId(order.orderId);
        try {
          replaceOrder(await cancelShopOrder(order.orderId));
          if (order.coupons?.length) await refreshCoupons().catch(() => undefined);
          message.success('订单已取消');
        } catch (error) {
          message.error(error instanceof Error ? error.message : '订单取消失败');
        } finally {
          setMutatingId(null);
        }
      },
    });
  };

  const receive = (order: ShopOrderDto) => {
    Modal.confirm({
      title: '确认收货',
      content: '请确认已经收到商品，确认后可按订单项发布甄客验。',
      okText: '确认收货',
      cancelText: '暂不确认',
      onOk: async () => {
        setMutatingId(order.orderId);
        try {
          replaceOrder(await confirmShopOrderReceived(order.orderId));
          message.success('已确认收货');
        } catch (error) {
          message.error(error instanceof Error ? error.message : '确认收货失败');
        } finally {
          setMutatingId(null);
        }
      },
    });
  };

  const openLogistics = async (order: ShopOrderDto) => {
    setLogisticsOrder(order);
    setLogisticsOpen(true);
    setLogisticsLoading(true);
    try {
      setLogistics(await fetchShopOrderLogistics(order.orderId));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '物流查询失败');
    } finally {
      setLogisticsLoading(false);
    }
  };

  const submitRefund = async () => {
    if (!refundOrder) return;
    const reason = refundReason.trim();
    if (reason.length < 2 || reason.length > 200) {
      message.warning('退款原因需要 2 至 200 个字符');
      return;
    }
    setRefundSubmitting(true);
    try {
      replaceOrder(await requestShopOrderRefund(refundOrder.orderId, reason));
      setRefundOrder(null);
      setRefundReason('');
      message.success('退款申请已提交');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '退款申请提交失败');
    } finally {
      setRefundSubmitting(false);
    }
  };

  const reportPublished = async (report: VerificationReportDto) => {
    replaceReport(report);
    setReportItem(null);
    await Promise.all([refreshOrders(), refreshReports()]);
    navigate(`/reports/${report.reportId}`);
  };

  return (
    <>
      <main className={`${styles.profileDetailPage} ${styles.ordersPage}`}>
        <ZkTaskHeader eyebrow="消费履约" title="我的订单与核销" description="配送、到店核销、支付、退款和甄客验资格都在这里处理。" backTo="/profile" />
        <section className={styles.orderPanel}>
          <div className={styles.orderPanelHeading}>
            <div>
              <span className={styles.eyebrow}>订单中心</span>
              <h3>我的订单</h3>
            </div>
            <span>共 {filtered.length} 笔</span>
          </div>
          <div className={styles.orderFilterTabs}>
            {([
              ['all', '全部订单'],
              ['PENDING_PAYMENT', '待付款'],
              ['pending_fulfillment', '待使用 / 待发货'],
              ['SHIPPED', '待收货'],
              ['pending_report', '待发布'],
              ['aftersale', '售后'],
            ] as Array<[Filter, string]>).map(([key, label]) => (
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
          <Spin spinning={ordersLoading}>
            {filtered.map((order) => (
              <article
                className={`${styles.orderCard} ${styles.businessListCard}`}
                key={order.orderId}
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/profile/orders/${order.orderId}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/profile/orders/${order.orderId}`);
                  }
                }}
              >
                <div className={styles.orderCardHead}>
                  <span className={styles.orderShop}>
                    <span className={styles.orderShopAvatar}>{(order.merchantName || '店').slice(0, 1)}</span>
                    <strong>{order.merchantName || '甄客行'}</strong>
                  </span>
                  <span className={styles.orderStatusText}>{getOrderStatusMeta(order).label}</span>
                </div>
                <div className={styles.orderCardBody}>
                  <img className={styles.orderThumb} src={order.items[0]?.coverUrl} alt={order.items[0]?.productName} />
                  <div className={styles.orderThumbInfo}>
                    <p className={styles.orderThumbTitle}>{order.items.map((item) => item.productName).join('、')}</p>
                    <p className={styles.orderThumbNo}>订单号 {order.orderNo}</p>
                    {order.fulfillmentType === 'OFFLINE' && <Tag color="purple">到店核销</Tag>}
                    {order.refundStatus === 'PENDING' && <Tag color="gold">退款待审核</Tag>}
                    {order.refundStatus === 'REFUNDING' && <Tag color="blue">退款处理中</Tag>}
                    {order.refundStatus === 'REJECTED' && <Tag color="red">退款已驳回</Tag>}
                  </div>
                  <div className={styles.orderPriceCol}>
                    {order.discountAmount > 0 && <del>{formatPrice(order.originalAmount)}</del>}
                    <strong>{formatPrice(order.totalAmount)}</strong>
                    {order.discountAmount > 0 && <small>已优惠 {formatPrice(order.discountAmount)}</small>}
                    <span>共{order.itemCount}件</span>
                  </div>
                </div>
                {['SHIPPED', 'RECEIVED'].includes(order.status) && order.trackingNo && (
                  <p className={styles.orderLogisticsSummary}>物流：{order.carrier ? `${order.carrier} · ` : ''}{order.trackingNo}</p>
                )}
                {order.status === 'PENDING_PAYMENT' && (
                  <p className={styles.paymentCountdown}>{countdown(order.paymentExpireTime)}</p>
                )}
                {order.status === 'RECEIVED' && order.items.map((item) => (
                  <div className={styles.orderReviewLine} key={item.orderItemId} onClick={(event) => event.stopPropagation()}>
                    <span>{item.productName}</span>
                    <Button
                      size="small"
                      onClick={() => item.verificationReportId
                        ? navigate(`/reports/${item.verificationReportId}`)
                        : setReportItem(item)}
                    >
                      {item.verificationReportId ? '查看甄客验' : '发布甄客验'}
                    </Button>
                  </div>
                ))}
                <div className={styles.orderCardFooter} onClick={(event) => event.stopPropagation()}>
                  <Button size="small" onClick={() => navigate(`/profile/orders/${order.orderId}`)}>订单详情</Button>
                  {order.status === 'PAID' && order.fulfillmentType === 'OFFLINE' && (
                    <Button size="small" type="primary" onClick={() => setRedeemOrder(order)}>出示核销码</Button>
                  )}
                  {order.fulfillmentType !== 'OFFLINE'
                    && !['PENDING_PAYMENT', 'CANCELLED'].includes(order.status) && (
                    <Button size="small" onClick={() => void openLogistics(order)}>查看物流</Button>
                  )}
                  {order.status === 'PENDING_PAYMENT' && (
                    <>
                      <Button size="small" onClick={() => cancel(order)}>取消订单</Button>
                      <Button
                        size="small"
                        type="primary"
                        disabled={paymentRemainingSeconds(order.paymentExpireTime) <= 0}
                        onClick={() => navigate(`/checkout?orderId=${order.orderId}`)}
                      >
                        立即支付
                      </Button>
                    </>
                  )}
                  {['PAID', 'SHIPPED', 'RECEIVED'].includes(order.status) && (
                    <Button
                      size="small"
                      danger
                      disabled={order.refundStatus === 'PENDING'}
                      onClick={() => {
                        if (order.status === 'SHIPPED') {
                          message.info('已发货订单请先确认收货，再申请退款');
                          return;
                        }
                        setRefundOrder(order);
                      }}
                    >
                      {order.refundStatus === 'PENDING' ? '退款审核中' : '申请退款'}
                    </Button>
                  )}
                  {order.status === 'SHIPPED' && (
                    <Button
                      size="small"
                      type="primary"
                      loading={mutatingId === order.orderId}
                      onClick={() => receive(order)}
                    >
                      确认收货
                    </Button>
                  )}
                </div>
              </article>
            ))}
            {!ordersLoading && filtered.length === 0 && <p className={styles.empty}>该分类下暂无订单。</p>}
          </Spin>
        </section>
      </main>

      <LogisticsModal
        open={logisticsOpen}
        loading={logisticsLoading}
        title="物流详情"
        referenceNo={logisticsOrder?.orderNo}
        trace={logistics}
        onClose={() => setLogisticsOpen(false)}
      />

      <Modal
        title="申请退款"
        open={Boolean(refundOrder)}
        onCancel={() => setRefundOrder(null)}
        onOk={() => void submitRefund()}
        confirmLoading={refundSubmitting}
        okText="提交申请"
        cancelText="取消"
      >
        <Input.TextArea
          value={refundReason}
          onChange={(event) => setRefundReason(event.target.value)}
          rows={4}
          maxLength={200}
          showCount
          placeholder="请说明退款原因"
        />
      </Modal>

      <PublishReportModal
        open={Boolean(reportItem)}
        purchaseItem={reportItem}
        onClose={() => setReportItem(null)}
        onPublished={(report) => void reportPublished(report)}
      />

      <OrderRedeemCodeModal
        open={Boolean(redeemOrder)}
        order={redeemOrder}
        onClose={() => setRedeemOrder(null)}
        onRedeemed={() => {
          void refreshOrders();
          setRedeemOrder(null);
        }}
      />
    </>
  );
}
