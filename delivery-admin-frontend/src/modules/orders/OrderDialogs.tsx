import { TruckOutlined } from '@ant-design/icons';
import { Button, Drawer, Form, Input, Modal, Select, Space, Table, Tag } from 'antd';
import type { FormInstance } from 'antd';
import type { ManagedLogisticsTrace, ManagedOrder } from '@/types';
import styles from '@/pages/index.less';

export interface OrderShipFormValues {
  trackingNo: string;
}

export interface RefundAuditFormValues {
  decision: 'APPROVED' | 'REJECTED';
  auditRemark?: string;
}

interface OrderLogisticsDialogState {
  orderNo: string;
  trace: ManagedLogisticsTrace;
}

export interface OrderDialogsProps {
  isAdmin: boolean;
  detailOrder: ManagedOrder | null;
  orderLogisticsDialog: OrderLogisticsDialogState | null;
  orderLogisticsLoading: boolean;
  refundAuditOrder: ManagedOrder | null;
  refundAuditDecision?: RefundAuditFormValues['decision'];
  refundAuditForm: FormInstance<RefundAuditFormValues>;
  refundAuditing: boolean;
  shippingOrder: ManagedOrder | null;
  orderShipForm: FormInstance<OrderShipFormValues>;
  orderShipping: boolean;
  getMerchantName: (merchantId: number) => string;
  onDetailClose: () => void;
  onOpenLogistics: (order: ManagedOrder) => void;
  onLogisticsClose: () => void;
  onOpenRefundAudit: (order: ManagedOrder) => void;
  onRefundAuditClose: () => void;
  onRefundAuditSubmit: (values: RefundAuditFormValues) => void;
  onShipmentClose: () => void;
  onShipmentSubmit: (values: OrderShipFormValues) => void;
}

const responsiveModalProps = { rootClassName: styles.responsiveModal } as const;
const responsiveDrawerProps = { rootClassName: styles.responsiveDrawer } as const;

const orderStatusMeta: Record<ManagedOrder['status'], { label: string; color: string }> = {
  unpaid: { label: '待付款', color: 'default' },
  paid: { label: '待发货', color: 'gold' },
  shipped: { label: '待收货', color: 'blue' },
  completed: { label: '已完成', color: 'green' },
  canceled: { label: '已取消', color: 'red' },
  refunding: { label: '退款中', color: 'blue' },
  refunded: { label: '已退款', color: 'purple' },
};

const logisticsStateMeta: Record<ManagedLogisticsTrace['state'], { label: string; color: string }> = {
  PREPARING: { label: '商家备货中', color: 'default' },
  IN_TRANSIT: { label: '运输中', color: 'processing' },
  DELIVERED: { label: '已签收', color: 'success' },
  EXCEPTION: { label: '物流异常', color: 'error' },
  UNKNOWN: { label: '等待物流更新', color: 'default' },
};

function formatMoney(value: number) {
  return `¥${value.toFixed(2)}`;
}

export default function OrderDialogs(props: OrderDialogsProps) {
  return (
    <>
      <Drawer
        {...responsiveDrawerProps}
        title="订单详情"
        size="large"
        open={Boolean(props.detailOrder)}
        onClose={props.onDetailClose}
        destroyOnHidden
      >
        {props.detailOrder && (
          <div className={styles.orderDetail}>
            <div className={styles.detailHeader}>
              <div>
                <p className={styles.eyebrow}>订单号</p>
                <h3>{props.detailOrder.orderNo}</h3>
              </div>
              <Tag color={orderStatusMeta[props.detailOrder.status].color}>
                {orderStatusMeta[props.detailOrder.status].label}
              </Tag>
            </div>

            <div className={styles.detailGrid}>
              <div>
                <span>买家</span>
                <strong>{props.detailOrder.buyerName}</strong>
              </div>
              <div>
                <span>商家</span>
                <strong>
                  {props.detailOrder.merchantName || props.getMerchantName(props.detailOrder.merchantId)}
                </strong>
              </div>
              <div>
                <span>订单金额</span>
                <strong>{formatMoney(props.detailOrder.amount)}</strong>
              </div>
              <div>
                <span>售后</span>
                <strong>
                  {props.detailOrder.refundStatus === 'PENDING'
                    ? '退款待审核'
                    : props.detailOrder.refundStatus === 'REFUNDING'
                      ? '退款中'
                      : props.detailOrder.refundStatus === 'REFUNDED'
                        ? '已退款'
                        : props.detailOrder.refundStatus === 'REJECTED'
                          ? '退款已驳回'
                          : '无退款申请'}
                </strong>
              </div>
            </div>

            <section>
              <h4>商品明细</h4>
              <Table
                rowKey={(item) => item.productTitle}
                dataSource={props.detailOrder.items}
                pagination={false}
                columns={[
                  { title: '商品', dataIndex: 'productTitle' },
                  { title: '数量', dataIndex: 'quantity' },
                  {
                    title: '单价',
                    dataIndex: 'unitPrice',
                    render: (unitPrice: number) => formatMoney(unitPrice),
                  },
                  {
                    title: '小计',
                    key: 'subtotal',
                    render: (_, item) => formatMoney(item.quantity * item.unitPrice),
                  },
                ]}
              />
            </section>

            <section>
              <h4>结算金额</h4>
              <div className={styles.feeBreakdown}>
                <div className={styles.feeRow}>
                  <span className={styles.feeLabel}>订单成交额</span>
                  <span className={styles.feeValue}>{formatMoney(props.detailOrder.amount)}</span>
                </div>
                <div className={styles.feeRow}>
                  <span className={styles.feeLabel}>商家实收</span>
                  <span className={styles.feeValue}>{formatMoney(props.detailOrder.amount)}</span>
                </div>
              </div>
              <p className={styles.feeNote}>当前阶段订单金额全部计入商家实收。</p>
            </section>

            <section>
              <h4>收货地址</h4>
              <p className={styles.addressText}>{props.detailOrder.address}</p>
            </section>

            {props.detailOrder.trackingNo && (
              <section>
                <h4>物流信息</h4>
                <div className={styles.logisticsInfoCard}>
                  <div>
                    <span>物流单号</span>
                    <strong>{props.detailOrder.trackingNo}</strong>
                  </div>
                  <Button
                      type="primary"
                      ghost
                      icon={<TruckOutlined />}
                      loading={props.orderLogisticsLoading}
                      onClick={() => props.onOpenLogistics(props.detailOrder!)}
                    >
                      查看物流
                  </Button>
                </div>
              </section>
            )}

            {(props.detailOrder.logisticsEvents ?? []).length > 0 && (
              <section>
                <div className={styles.fulfillmentHeading}>
                  <h4>订单履约记录</h4>
                  <span>记录平台内发货、确认收货等操作，不代表包裹实际运输进度</span>
                </div>
                <div className={styles.logisticsTimeline}>
                  {(props.detailOrder.logisticsEvents ?? []).map((event) => (
                    <div className={styles.logisticsEvent} key={event.eventId}>
                      <i />
                      <div>
                        <strong>{event.description}</strong>
                        {event.location && <span>{event.location}</span>}
                        <span>{event.eventTime}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {props.detailOrder.refundStatus && (
              <div className={styles.refundNotice}>
                <div>
                  <strong>退款原因：{props.detailOrder.refundReason}</strong>
                  {props.detailOrder.refundRequestedAt && <p>申请时间：{props.detailOrder.refundRequestedAt}</p>}
                  {props.detailOrder.refundAuditRemark && <p>审核说明：{props.detailOrder.refundAuditRemark}</p>}
                  {props.detailOrder.refundCompletedAt && <p>退款完成时间：{props.detailOrder.refundCompletedAt}</p>}
                </div>
                {props.detailOrder.refundStatus === 'PENDING' && (
                  <Button type="primary" danger onClick={() => props.onOpenRefundAudit(props.detailOrder!)}>
                    审核退款
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        {...responsiveModalProps}
        title="物流轨迹"
        open={Boolean(props.orderLogisticsDialog)}
        onCancel={props.onLogisticsClose}
        footer={null}
        width={620}
        zIndex={1100}
      >
        {props.orderLogisticsDialog && (
          <div className={styles.merchantLogisticsDialog}>
            <div className={styles.merchantLogisticsSummary}>
              <div className={styles.merchantLogisticsIcon}><TruckOutlined /></div>
              <div>
                <span>当前物流状态</span>
                <strong>{logisticsStateMeta[props.orderLogisticsDialog.trace.state].label}</strong>
                <small>订单号：{props.orderLogisticsDialog.orderNo}</small>
              </div>
              <Tag color={logisticsStateMeta[props.orderLogisticsDialog.trace.state].color}>
                {logisticsStateMeta[props.orderLogisticsDialog.trace.state].label}
              </Tag>
            </div>
            <div className={styles.merchantLogisticsMeta}>
              <div>
                <span>承运公司</span>
                <strong>{props.orderLogisticsDialog.trace.carrier || '自动识别中'}</strong>
              </div>
              <div>
                <span>物流单号</span>
                <strong>{props.orderLogisticsDialog.trace.trackingNo || '-'}</strong>
              </div>
            </div>
            {props.orderLogisticsDialog.trace.providerMessage && (
              <p className={styles.logisticsProviderNotice}>物流信息暂未更新，请稍后查看</p>
            )}
            <div className={styles.fulfillmentHeading}>
              <h4>实时物流轨迹</h4>
            </div>
            <div className={styles.logisticsTimeline}>
              {props.orderLogisticsDialog.trace.events.length === 0 && (
                <p className={styles.logisticsEmpty}>承运信息已登记，暂未查询到物流轨迹。</p>
              )}
              {props.orderLogisticsDialog.trace.events.map((event, index) => (
                <div
                  className={styles.logisticsEvent}
                  key={event.sourceEventId || `${event.eventTime}-${index}`}
                >
                  <i />
                  <div>
                    <strong>{event.description}</strong>
                    {event.location && <span>{event.location}</span>}
                    <span>{event.eventTime || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        {...responsiveModalProps}
        title={`审核退款${props.refundAuditOrder ? ` · ${props.refundAuditOrder.orderNo}` : ''}`}
        open={Boolean(props.refundAuditOrder)}
        onCancel={props.onRefundAuditClose}
        footer={null}
        destroyOnHidden
      >
        {props.refundAuditOrder && (
          <>
            <p>退款原因：{props.refundAuditOrder.refundReason}</p>
            <Form
              form={props.refundAuditForm}
              layout="vertical"
              onFinish={props.onRefundAuditSubmit}
            >
              <Form.Item name="decision" label="审核结果" rules={[{ required: true, message: '请选择审核结果' }]}>
                <Select
                  options={[
                    { label: '同意退款', value: 'APPROVED' },
                    { label: '驳回退款', value: 'REJECTED' },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="auditRemark"
                label="审核说明"
                rules={props.refundAuditDecision === 'REJECTED'
                  ? [{ required: true, message: '驳回退款时必须填写审核说明' }]
                  : []}
              >
                <Input.TextArea rows={4} maxLength={200} showCount placeholder="可填写退款处理说明" />
              </Form.Item>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button disabled={props.refundAuditing} onClick={props.onRefundAuditClose}>取消</Button>
                <Button type="primary" danger htmlType="submit" loading={props.refundAuditing}>确认处理</Button>
              </Space>
            </Form>
          </>
        )}
      </Modal>

      <Modal
        {...responsiveModalProps}
        title={`订单发货${props.shippingOrder ? ` · ${props.shippingOrder.orderNo}` : ''}`}
        open={Boolean(props.shippingOrder)}
        onCancel={props.onShipmentClose}
        footer={null}
        destroyOnHidden
      >
        <Form form={props.orderShipForm} layout="vertical" onFinish={props.onShipmentSubmit}>
          <Form.Item name="trackingNo" label="物流单号" rules={[{ required: true, message: '请输入物流单号' }, { max: 100 }]}>
            <Input placeholder="只需填写物流单号，系统会自动识别快递公司" />
          </Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button disabled={props.orderShipping} onClick={props.onShipmentClose}>取消</Button>
            <Button type="primary" htmlType="submit" loading={props.orderShipping}>确认发货</Button>
          </Space>
        </Form>
      </Modal>
    </>
  );
}
