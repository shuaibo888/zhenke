import type { ShopOrderDto, VerificationReportDto } from '@/services/shopContent';

export function formatPrice(value: number) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

export function getCartCount(items: Array<{ quantity: number }>) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function getCartTotal(items: Array<{ price: number; quantity: number }>) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

function buildPublicShareLink(path: string) {
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).toString();
}

export function buildPostShareLink(postId: number) {
  return buildPublicShareLink(`/posts/${postId}`);
}

export function buildEnjoyShareLink(enjoyId: number) {
  return buildPublicShareLink(`/enjoy/${enjoyId}`);
}

export function buildReportShareLink(reportId: number) {
  return buildPublicShareLink(`/reports/${reportId}`);
}

export function buildProductShareLink(productId: number) {
  return buildPublicShareLink(`/products/${productId}`);
}

export function buildTrialShareLink(productId: number, campaignId: number) {
  if (typeof window === 'undefined') return `/products/${productId}?campaign=${campaignId}`;
  const url = new URL(`/products/${productId}`, window.location.origin);
  url.searchParams.set('campaign', String(campaignId));
  return url.toString();
}

export async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function getReportType(report: Pick<VerificationReportDto, 'reportSource' | 'trialType'>) {
  if (report.reportSource === 'PURCHASE') return { label: '购买评价', color: 'purple' };
  if (report.trialType === 'OFFLINE') return { label: '线下试用报告', color: 'gold' };
  return { label: '线上试用报告', color: 'green' };
}

export const orderStatusMeta: Record<ShopOrderDto['status'], { label: string; color: string }> = {
  PENDING_PAYMENT: { label: '待付款', color: 'warning' },
  PAID: { label: '待发货', color: 'processing' },
  SHIPPED: { label: '待收货', color: 'cyan' },
  RECEIVED: { label: '已收货', color: 'success' },
  CANCELLED: { label: '已取消', color: 'default' },
  REFUNDING: { label: '退款中', color: 'orange' },
  REFUNDED: { label: '已退款', color: 'default' },
};

/**
 * Translate the shared order state into the task the customer can understand.
 * PAID means "wait for shipment" for delivery orders, but means "ready to use"
 * for an offline local-life package. Keeping this distinction here prevents the
 * unified order centre from leaking the old delivery-only wording.
 */
export function getOrderStatusMeta(order: Pick<ShopOrderDto, 'status' | 'fulfillmentType'>) {
  if (order.status === 'PAID' && order.fulfillmentType === 'OFFLINE') {
    return { label: '待使用', color: 'processing' };
  }
  if (order.status === 'RECEIVED' && order.fulfillmentType === 'OFFLINE') {
    return { label: '已核销', color: 'success' };
  }
  return orderStatusMeta[order.status];
}

export function paymentRemainingSeconds(expiresAt?: string) {
  if (!expiresAt) return Number.POSITIVE_INFINITY;
  const milliseconds = Date.parse(expiresAt);
  if (Number.isNaN(milliseconds)) return 0;
  return Math.max(0, Math.ceil((milliseconds - Date.now()) / 1000));
}
