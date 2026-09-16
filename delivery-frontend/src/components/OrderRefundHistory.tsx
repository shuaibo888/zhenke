import { Button, Form, Input, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { LogisticsModal } from './LogisticsModal';
import { fetchOrderReturnLogistics, shipOrderReturn, type LogisticsTraceDto, type ShopOrderDto } from '@/services/shopContent';
import { refundLabels, type RefundRecord } from '@/utils/refund';
import styles from '@/styles/commerce.less';

export function OrderRefundHistory({ order, onUpdate }: { order: ShopOrderDto; onUpdate: (order: ShopOrderDto) => void }) {
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<RefundRecord>();
  const [trace, setTrace] = useState<LogisticsTraceDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  useEffect(() => () => { request.current += 1; }, [order.orderId]);
  const loadLogistics = async (record: RefundRecord) => {
    const version = ++request.current;
    setSelected(record); setLoading(true); setError(''); setTrace(null);
    try {
      const next = await fetchOrderReturnLogistics(order.orderId, record.refundId);
      if (version === request.current) setTrace(next);
    } catch (cause) {
      if (version === request.current) setError(cause instanceof Error ? cause.message : '物流查询失败');
    } finally { if (version === request.current) setLoading(false); }
  };
  const ship = async (record: RefundRecord, trackingNo: string) => {
    if (saving) return;
    setSaving(true);
    try {
      onUpdate(await shipOrderReturn(order.orderId, record.refundId, trackingNo.trim()));
      message.success('退货单号已提交，等待商家收货');
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '提交失败'); }
    finally { setSaving(false); }
  };
  if (!order.refundHistory?.length) return null;
  const render = (record: RefundRecord) => (
    <div style={{ padding: '12px 0', overflowWrap: 'anywhere' }}>
      <strong>{record.refundType === 'RETURN_REFUND' ? '退货退款' : '仅退款（无需退货）'} · {refundLabels[record.refundStatus]}</strong>
      <p>申请时间：{record.requestTime ? new Date(record.requestTime).toLocaleString('zh-CN') : '—'}</p>
      <p>申请原因：{record.refundReason}</p>
      {record.auditRemark && <p>{record.refundStatus === 'REJECTED' ? '拒绝理由' : '审核说明'}：{record.auditRemark}</p>}
      {record.refundStatus === 'REJECTED' && <p>{order.fulfillmentType === 'ONLINE' ? '可重新申请仅退款或退货退款' : '可重新申请退款'}，原申请记录保留。</p>}
      {record.returnAddress && <div>
        <strong>退货收件信息</strong>
        <p>{record.returnRecipient}　{record.returnPhone}</p><p>{record.returnAddress}</p>
      </div>}
      {record.refundStatus === 'WAITING_RETURN' && <Form key={record.refundId} layout="vertical" onFinish={(values) => void ship(record, values.trackingNo)}>
        <p>请寄往以上地址，寄出后填写物流单号。系统将按单号查询承运商及物流轨迹。</p>
        <Form.Item name="trackingNo" label="退货物流单号" rules={[{ required: true, whitespace: true, message: '请填写寄回商品的物流单号' }, { max: 100 }]}>
          <Input maxLength={100} placeholder="填写快递面单上的运单号" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>提交退货单号</Button>
      </Form>}
      {record.returnTrackingNo && <p>退货单号：{record.returnTrackingNo} <Button type="link" onClick={() => void loadLogistics(record)}>查看退货物流</Button></p>}
      {record.returnReceiveTime && <p>商家收货时间：{new Date(record.returnReceiveTime).toLocaleString('zh-CN')}</p>}
      {record.refundTime && <p>退款完成时间：{new Date(record.refundTime).toLocaleString('zh-CN')}</p>}
    </div>
  );
  return <section className={styles.businessInfoCard}>
    <h3>售后记录</h3>
    {render(order.refundHistory[0])}
    {order.refundHistory.length > 1 && <details><summary>查看历史申请（{order.refundHistory.length - 1}）</summary>
      {order.refundHistory.slice(1).map((record) => <div key={record.refundId}>{render(record)}</div>)}
    </details>}
    <LogisticsModal open={Boolean(selected)} title="退货物流" loading={loading} trace={trace} error={error}
      referenceNo={selected?.returnTrackingNo} onRetry={() => { if (selected) void loadLogistics(selected); }}
      onClose={() => { request.current += 1; setSelected(undefined); }} />
  </section>;
}
