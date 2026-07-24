import type { Order, Product, TrialRecord } from '@/types';
import type { CartItem } from '@/utils/cart';

const products: Product[] = [
  {
    id: 101, title: '轻量防风露营外套', artisanName: '山野装备店', category: 'CATEGORY_1',
    categoryName: '户外', imageUrl: '/goods/yanzhao.jpg', cover: 'url("/goods/yanzhao.jpg")',
    price: 329, isVerified: true, verifyCount: 1, detail: '适合徒步、露营和通勤。', tags: ['户外'],
    stock: 36, purchasable: true,
  },
  {
    id: 102, title: '高弹速干训练套装', artisanName: '奔跑实验室', category: 'CATEGORY_2',
    categoryName: '运动服装', imageUrl: '/goods/qingbei.jpg', cover: 'url("/goods/qingbei.jpg")',
    price: 259, isVerified: true, verifyCount: 1, detail: '适合训练和慢跑。', tags: ['运动服装'],
    stock: 48, purchasable: true,
  },
];

export const previewCart: CartItem[] = [
  { cartItemId: 701, product: products[0], quantity: 1, attribution: { sourceReportId: 201 } },
  { cartItemId: 702, product: products[1], quantity: 2 },
];

const previewPaymentExpiresAt = new Date(Date.now() + 25 * 60 * 1000)
  .toISOString().slice(0, 19).replace('T', ' ');

function order(id: number, status: Order['status'], product: Product): Order {
  return {
    id, orderNo: `PREVIEW20260723${id}`, productId: product.id, productTitle: product.title,
    status, quantity: 1, amount: product.price, returnDays: 7, merchantName: product.artisanName,
    createdAt: '2026-07-23 10:00:00',
    paymentExpiresAt: status === 'unpaid' ? previewPaymentExpiresAt : undefined,
    paidAt: status === 'unpaid' ? undefined : '2026-07-23 10:05:00',
    carrier: status === 'shipped' || status === 'completed' ? '顺丰速运' : undefined,
    trackingNo: status === 'shipped' || status === 'completed' ? `SF-PREVIEW-${id}` : undefined,
    shippedAt: status === 'shipped' || status === 'completed' ? '2026-07-24 09:00:00' : undefined,
    receivedAt: status === 'completed' ? '2026-07-26 16:00:00' : undefined,
    refundStatus: status === 'refunding' ? 'REFUNDING' : undefined,
    refundReason: status === 'refunding' ? '预览：商品不符合预期' : undefined,
    items: [{
      orderItemId: id * 10, productId: product.id, productTitle: product.title, coverUrl: product.imageUrl,
      unitPrice: product.price, quantity: 1, amount: product.price,
      // 已完成订单关联「与该商品匹配」的甄客验：商品 101 -> 报告 201，商品 102 -> 报告 202。
      verificationReportId: status === 'completed' ? (product.id === 101 ? 201 : 202) : undefined,
    }],
  };
}

export const previewOrders: Order[] = [
  order(601, 'unpaid', products[0]),
  order(602, 'paid', products[1]),
  order(603, 'shipped', products[0]),
  order(604, 'completed', products[1]),
  order(605, 'refunding', products[0]),
];

// campaignId 使用独立编号（非 301/302），使首页两条试用招募保持“未领取/可申请”状态，
// 便于查看申请试用页面；这两条申请记录仍会出现在“我的订单”里。
export const previewTrials: TrialRecord[] = [
  {
    id: 501, applicationId: 501, campaignId: 391, trialType: 'ONLINE', productId: 103,
    productTitle: '家庭健康监测组合', status: 'shipped', claimedAt: '2026-07-21',
    deadline: '2026-08-15', carrier: '顺丰速运', trackingNo: 'SF-TRIAL-PREVIEW',
  },
  {
    id: 502, applicationId: 502, campaignId: 392, trialType: 'OFFLINE', productId: 104,
    productTitle: '手冲咖啡体验礼盒', status: 'pending_report', claimedAt: '2026-07-22',
    deadline: '2026-08-10',
  },
];
