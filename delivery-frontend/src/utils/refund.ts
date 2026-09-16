export interface RefundRecord {
  refundId: number;
  refundType: 'REFUND_ONLY' | 'RETURN_REFUND';
  refundStatus: 'PENDING' | 'WAITING_RETURN' | 'RETURN_SHIPPED' | 'REFUNDING' | 'REFUNDED' | 'REJECTED';
  refundReason: string;
  auditRemark?: string;
  requestTime?: string;
  auditTime?: string;
  refundTime?: string;
  returnRecipient?: string;
  returnPhone?: string;
  returnAddress?: string;
  returnTrackingNo?: string;
  returnShipTime?: string;
  returnReceiveTime?: string;
}
export const refundLabels: Record<string, string> = {
  PENDING: '待商家审核', WAITING_RETURN: '待寄回商品', RETURN_SHIPPED: '待商家收货',
  REFUNDING: '退款处理中', REFUNDED: '退款成功', REJECTED: '申请已拒绝',
};
export const refundInProgress = (status?: string) => Boolean(status && status !== 'REJECTED');
