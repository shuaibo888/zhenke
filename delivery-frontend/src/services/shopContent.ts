import { getToken, requestApi, type ApiResponse, type TableResponse } from './apiClient';
import { extractPlatformMediaPath } from '@/utils/mediaUrl';

export interface PublicMerchantDto {
  merchantId: number;
  shopName: string;
  companyName: string;
  companyCreditCode: string;
  legalPerson: string;
  contactName: string;
  contactPhone: string;
  storeAddress: string;
  latitude: number;
  longitude: number;
}

export interface ProductCategoryDto {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  categorySort: number;
  status: '0' | '1';
}

export interface PublicProductDto {
  productId: number;
  merchantId: number;
  merchantName: string;
  categoryId: number;
  categoryCode: ProductCategoryDto['categoryCode'];
  categoryName: string;
  brandName: string;
  productName: string;
  subtitle?: string;
  packageContent?: string;
  usageNotice?: string;
  validityDescription?: string;
  reservationRequired?: '0' | '1';
  reservationNotice?: string;
  refundExpiryRule?: string;
  coverUrl: string;
  price: number;
  stock: number;
  stockUnlimited: '0' | '1';
  supportsOnline: '0' | '1';
  supportsOffline: '0' | '1';
  salesCount: number;
  status: 'ON_SALE';
  images?: Array<{ imageId: number; imageType: 'MAIN' | 'DETAIL'; imageUrl: string; imageSort: number }>;
  mainImageUrls?: string[];
  detailImageUrls?: string[];
  certificationStatus?: 'PASSED';
  certificationNo?: string;
  certificationSourceType?: string;
  certificationSupplierName?: string;
  certificationOriginPlace?: string;
  certificationShippingPlace?: string;
  certificationMatchType?: string;
  certificationProofType?: string;
  certificationPublicSummary?: string;
  certificationPassedAt?: string;
  certificationExpiresAt?: string;
}

export type MallProductDto = Pick<PublicProductDto,
  | 'productId'
  | 'merchantId'
  | 'merchantName'
  | 'categoryId'
  | 'categoryCode'
  | 'categoryName'
  | 'brandName'
  | 'productName'
  | 'subtitle'
  | 'coverUrl'
  | 'price'
  | 'stock'
  | 'stockUnlimited'
  | 'salesCount'
  | 'status'
  | 'certificationStatus'
  | 'certificationNo'>;

export interface HomeFeedItemDto {
  contentType: 'TRIAL' | 'REPORT';
  contentId: number;
  productId: number;
  merchantId: number;
  merchantName: string;
  categoryCode: ProductCategoryDto['categoryCode'];
  categoryName: string;
  title: string;
  summary: string;
  coverUrl: string;
  publishedAt: string;
  purchasable: boolean;
  trial?: {
    trialType: 'ONLINE' | 'OFFLINE';
    targetCount: number;
    approvedCount: number;
    applicationDeadline: string;
  };
  report?: {
    shopUserId: number;
    userName: string;
    shortcoming: string;
    recommend: '0' | '1';
    usefulCount: number;
    usefulByMe: boolean;
    // 智能评分功能暂时隐藏，恢复时取消注释。
    // aiScore?: number;
    // aiScoreStatus: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  };
}

export interface VerificationReportDto {
  reportId: number;
  productId: number;
  productName: string;
  productBrandName?: string;
  productCoverUrl: string;
  title?: string;
  merchantId: number;
  merchantName: string;
  categoryCode: ProductCategoryDto['categoryCode'];
  categoryName: string;
  trialApplicationId?: number;
  trialType?: 'ONLINE' | 'OFFLINE';
  reportSource?: 'TRIAL' | 'PURCHASE';
  orderItemId?: number;
  sourceReportId?: number;
  shopUserId: number;
  userName: string;
  nickName?: string;
  experience: string;
  shortcoming: string;
  recommend: '0' | '1';
  productQuality?: number;
  logisticsService?: number;
  serviceAttitude?: number;
  // 智能评分功能暂时隐藏，恢复时取消注释。
  // aiScore?: number;
  // aiScoreStatus: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  // aiScoreReason?: string;
  // aiScoredAt?: string;
  usefulCount: number;
  usefulByMe: boolean;
  status: 'PUBLISHED' | 'HIDDEN';
  publishedAt: string;
  resources?: Array<{
    resourceId: number;
    resourceType: 'IMAGE' | 'VIDEO';
    resourceUrl: string;
    resourceSort: number;
  }>;
}

export interface ReportCommentDto {
  commentId: number;
  reportId: number;
  parentCommentId?: number;
  replyToCommentId?: number;
  shopUserId: number;
  userName: string;
  nickName?: string;
  avatar?: string;
  reportAuthor: boolean;
  replyToUserName?: string;
  replyToNickName?: string;
  content: string;
  createTime: string;
  replies?: ReportCommentDto[];
}

export interface TrialApplicationDto {
  applicationId: number;
  campaignId: number;
  merchantId: number;
  merchantName: string;
  productId: number;
  productName: string;
  productCoverUrl: string;
  trialType: 'ONLINE' | 'OFFLINE';
  campaignTitle: string;
  campaignSummary?: string;
  shopUserId: number;
  applyReason: string;
  recipientName?: string;
  recipientPhone?: string;
  shippingAddress?: string;
  status: 'APPLIED' | 'APPROVED' | 'REJECTED' | 'SHIPPED' | 'RECEIVED' | 'COMPLETED' | 'EXPIRED'
    | 'PENDING_REDEMPTION' | 'REDEEMED';
  auditRemark?: string;
  carrier?: string;
  trackingNo?: string;
  shippedAt?: string;
  receivedAt?: string;
  completedAt?: string;
  redeemCode?: string;
  redeemedAt?: string;
  createTime?: string;
  applicationDeadline?: string;
  auditTime?: string;
  verificationReportId?: number;
}

export interface PublicTrialCampaignDto {
  campaignId: number;
  merchantId: number;
  merchantName: string;
  productId: number;
  productName: string;
  productCoverUrl: string;
  categoryCode: ProductCategoryDto['categoryCode'];
  categoryName: string;
  trialType: 'ONLINE' | 'OFFLINE';
  campaignTitle: string;
  campaignSummary?: string;
  targetCount: number;
  applicantCount: number;
  approvedCount: number;
  applicationDeadline: string;
  status: 'RECRUITING';
  publishedAt: string;
}

export interface ShopCartItemDto {
  cartItemId: number;
  userId: number;
  productId: number;
  sourceReportId?: number;
  quantity: number;
  merchantId: number;
  merchantName: string;
  categoryCode: ProductCategoryDto['categoryCode'];
  categoryName: string;
  productName: string;
  coverUrl: string;
  price: number;
  stock: number;
  stockUnlimited: '0' | '1';
  productStatus: 'DRAFT' | 'ON_SALE' | 'OFF_SALE';
  supportsOnline: '0' | '1';
  supportsOffline: '0' | '1';
}

export interface ShopCouponDto {
  userCouponId: number;
  couponId: number;
  shopUserId: number;
  couponCode: string;
  status: 'UNUSED' | 'USED';
  usedOrderId?: number;
  usedTime?: string;
  createTime: string;
  couponName: string;
  description?: string;
  usageMode: 'ORDER' | 'OFFLINE' | 'BOTH';
  redeemInstructions?: string;
  discountAmount: number;
  minimumSpend: number;
  startTime: string;
  endTime: string;
  couponStatus: 'ENABLED' | 'DISABLED';
  scopeType: 'MERCHANT_SPECIFIC' | 'PLATFORM_WIDE';
  availabilityStatus: 'AVAILABLE' | 'PENDING' | 'USED' | 'EXPIRED' | 'DISABLED';
  redeemedMerchantId?: number;
  redeemedMerchantName?: string;
  consumptionAmount?: number;
  actualAmount?: number;
  merchants: Array<{
    couponId: number;
    merchantId: number;
    merchantName: string;
    storeAddress?: string;
    contactPhone?: string;
    latitude?: number;
    longitude?: number;
  }>;
}

export interface ShopOrderDto {
  orderId: number;
  orderNo: string;
  userId: number;
  merchantId: number;
  merchantName: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'SHIPPED' | 'RECEIVED' | 'CANCELLED' | 'REFUNDING' | 'REFUNDED';
  fulfillmentType: 'ONLINE' | 'OFFLINE';
  redeemCode?: string;
  redeemedAt?: string;
  originalAmount: number;
  discountAmount: number;
  totalAmount: number;
  itemCount: number;
  paymentExpireTime?: string;
  paymentChannel?: 'WECHAT' | 'MOCK' | 'COUPON';
  paymentTradeType?: 'JSAPI' | 'H5';
  payTime?: string;
  carrier?: string;
  trackingNo?: string;
  shipTime?: string;
  receiveTime?: string;
  cancelTime?: string;
  refundStatus?: 'PENDING' | 'REFUNDING' | 'REFUNDED' | 'REJECTED';
  refundReason?: string;
  refundReviewRequired?: '0' | '1';
  refundAuditRemark?: string;
  refundRequestTime?: string;
  refundAuditTime?: string;
  refundCompleteTime?: string;
  createTime: string;
  updateTime: string;
  coupons: Array<{
    orderCouponId: number;
    orderId: number;
    userCouponId: number;
    couponId: number;
    couponName: string;
    couponCode: string;
    scopeType: 'MERCHANT_SPECIFIC' | 'PLATFORM_WIDE';
    faceDiscountAmount: number;
    appliedDiscountAmount: number;
    createTime: string;
  }>;
  items: Array<{
    orderItemId: number;
    productId: number;
    sourceReportId?: number;
    verificationReportId?: number;
    productName: string;
    coverUrl: string;
    unitPrice: number;
    quantity: number;
    fulfillmentType?: 'ONLINE' | 'OFFLINE';
    lineAmount: number;
  }>;
  address?: {
    recipient: string;
    phone: string;
    provinceCode: string;
    cityCode: string;
    districtCode: string;
    detail: string;
  };
  statusLogs?: Array<{
    logId: number;
    fromStatus?: string;
    toStatus: string;
    remark: string;
    createTime: string;
  }>;
  logisticsEvents?: Array<{
    eventId: number;
    eventCode: string;
    description: string;
    location?: string;
    eventTime: string;
    source: 'SYSTEM' | 'PROVIDER';
    sourceEventId?: string;
  }>;
}

export interface LogisticsTraceDto {
  carrier?: string;
  trackingNo?: string;
  state: 'PREPARING' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION' | 'UNKNOWN';
  providerMessage?: string;
  events: Array<{
    eventCode?: string;
    description: string;
    location?: string;
    eventTime?: string;
    source: 'SYSTEM' | 'PROVIDER';
    sourceEventId?: string;
  }>;
}

export interface HomeFeedQuery {
  productId?: number;
  categoryCode?: string;
  businessModule?: 'MALL';
  keyword?: string;
  contentType?: 'ALL' | 'TRIAL' | 'REPORT';
  trialType?: 'ALL' | 'ONLINE' | 'OFFLINE';
  pageNum?: number;
  pageSize?: number;
}

export interface HomeSearchQuery {
  keyword: string;
  pageNum?: number;
  pageSize?: number;
}

export interface MallProductsQuery {
  categoryId?: number;
  merchantId?: number;
  businessModule?: 'MALL';
  keyword?: string;
  pageNum?: number;
  pageSize?: number;
}

export async function fetchHomeFeed(query: HomeFeedQuery = {}) {
  const pageNum = Math.max(1, Math.trunc(query.pageNum ?? 1));
  const pageSize = Math.max(1, Math.min(24, Math.trunc(query.pageSize ?? 12)));
  const contentType = query.contentType ?? 'ALL';
  const trialType = query.trialType ?? 'ALL';
  const params = new URLSearchParams({
    pageNum: String(pageNum),
    pageSize: String(pageSize),
    contentType,
  });
  if (query.productId) params.set('productId', String(query.productId));
  if (query.categoryCode) params.set('categoryCode', query.categoryCode);
  if (query.businessModule) params.set('businessModule', query.businessModule);
  if (query.keyword?.trim()) params.set('keyword', query.keyword.trim());
  if (trialType !== 'ALL') params.set('trialType', trialType);
  const result = await requestApi<TableResponse<HomeFeedItemDto>>(
    `/shop/home/feed?${params.toString()}`,
    {},
    Boolean(getToken()),
  );
  return {
    ...result,
    rows: Array.isArray(result.rows) ? result.rows : [],
    total: typeof result.total === 'number' ? result.total : 0,
  };
}

export async function searchHomeFeed(query: HomeSearchQuery) {
  const keyword = query.keyword.trim();
  const pageNum = Math.max(1, Math.trunc(query.pageNum ?? 1));
  const pageSize = Math.max(1, Math.min(24, Math.trunc(query.pageSize ?? 12)));
  const params = new URLSearchParams({
    keyword,
    pageNum: String(pageNum),
    pageSize: String(pageSize),
  });
  const result = await requestApi<TableResponse<HomeFeedItemDto>>(
    `/shop/home/search?${params.toString()}`,
    {},
    Boolean(getToken()),
  );
  return {
    ...result,
    rows: Array.isArray(result.rows) ? result.rows : [],
    total: typeof result.total === 'number' ? result.total : 0,
  };
}

export async function fetchProductCategories() {
  const result = await requestApi<ApiResponse<ProductCategoryDto[]>>('/shop/products/categories');
  return result.data ?? [];
}

export async function fetchMallProducts(query: MallProductsQuery = {}) {
  const pageNum = Math.max(1, Math.trunc(query.pageNum ?? 1));
  const pageSize = Math.max(1, Math.min(24, Math.trunc(query.pageSize ?? 12)));
  const params = new URLSearchParams({
    pageNum: String(pageNum),
    pageSize: String(pageSize),
  });
  if (query.categoryId) params.set('categoryId', String(query.categoryId));
  if (query.merchantId) params.set('merchantId', String(query.merchantId));
  if (query.businessModule) params.set('businessModule', query.businessModule);
  const keyword = query.keyword?.trim();
  if (keyword) params.set('keyword', keyword);
  const result = await requestApi<TableResponse<MallProductDto>>(
    `/shop/mall/products?${params.toString()}`,
  );
  return {
    ...result,
    rows: Array.isArray(result.rows) ? result.rows : [],
    total: typeof result.total === 'number' ? result.total : 0,
  };
}

export async function fetchPublicProduct(productId: number) {
  const result = await requestApi<ApiResponse<PublicProductDto>>(`/shop/products/${productId}`);
  if (!result.data) throw new Error('商品详情加载失败');
  return result.data;
}

export async function fetchPublicMerchant(merchantId: number) {
  const result = await requestApi<ApiResponse<PublicMerchantDto>>(`/shop/merchants/public/${merchantId}`);
  if (!result.data) throw new Error('商家详情加载失败');
  return result.data;
}

export function merchantNavigationUrl(merchantId: number) {
  return `/api/shop/merchants/public/${merchantId}/navigation`;
}

export async function fetchPublishedReport(reportId: number) {
  const token = getToken();
  const result = await requestApi<ApiResponse<VerificationReportDto>>(
    `/shop/reports/${reportId}`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : {},
  );
  if (!result.data) throw new Error('验证报告加载失败');
  return result.data;
}

export async function toggleReportUseful(reportId: number) {
  const result = await requestApi<ApiResponse<{ reportId: number; usefulCount: number; usefulByMe: boolean }>>(
    `/shop/reports/${reportId}/useful`,
    { method: 'POST' },
    true,
  );
  if (!result.data) throw new Error('操作失败');
  return result.data;
}

export async function fetchReportComments(reportId: number) {
  const result = await requestApi<ApiResponse<ReportCommentDto[]>>(`/shop/reports/${reportId}/comments`);
  return Array.isArray(result.data) ? result.data : [];
}

export async function createReportComment(reportId: number, content: string, replyToCommentId?: number) {
  const result = await requestApi<ApiResponse<ReportCommentDto>>(
    `/shop/reports/${reportId}/comments`,
    { method: 'POST', body: JSON.stringify({ content, replyToCommentId }) },
    true,
  );
  if (!result.data) throw new Error('评论发布失败');
  return result.data;
}

export async function deleteReportComment(reportId: number, commentId: number) {
  await requestApi<ApiResponse>(
    `/shop/reports/${reportId}/comments/${commentId}`,
    { method: 'DELETE' },
    true,
  );
}

export async function applyForTrial(campaignId: number, body: {
  applyReason: string;
  recipientName?: string;
  recipientPhone?: string;
  shippingAddress?: string;
}) {
  const result = await requestApi<ApiResponse<TrialApplicationDto>>(
    `/shop/trials/${campaignId}/apply`,
    { method: 'POST', body: JSON.stringify(body) },
    true,
  );
  if (!result.data) throw new Error('试用申请提交失败');
  return result.data;
}

export async function fetchMyTrialApplications() {
  const result = await requestApi<ApiResponse<TrialApplicationDto[]>>('/shop/trials/me/applications', {}, true);
  return result.data ?? [];
}

export async function fetchMyTrialApplication(applicationId: number) {
  const result = await requestApi<ApiResponse<TrialApplicationDto>>(
    `/shop/trials/me/applications/${applicationId}`,
    {},
    true,
  );
  if (!result.data) throw new Error('试用申请不存在');
  return result.data;
}

export async function fetchTrialRedeemCode(applicationId: number) {
  const result = await requestApi<ApiResponse<TrialApplicationDto>>(
    `/shop/trials/me/applications/${applicationId}/redeem-code`,
    {},
    true,
  );
  if (!result.data?.redeemCode) throw new Error('获取核销码失败');
  return result.data;
}

export async function fetchShopCart() {
  const result = await requestApi<ApiResponse<ShopCartItemDto[]>>('/shop/users/me/cart', {}, true);
  return Array.isArray(result.data) ? result.data : [];
}

export async function addShopCartItem(productId: number, quantity = 1, sourceReportId?: number) {
  const result = await requestApi<ApiResponse<ShopCartItemDto>>(
    '/shop/users/me/cart',
    { method: 'POST', body: JSON.stringify({ productId, quantity, sourceReportId }) },
    true,
  );
  if (!result.data) throw new Error('加入购物车失败');
  return result.data;
}

export async function updateShopCartItem(cartItemId: number, quantity: number) {
  const result = await requestApi<ApiResponse<ShopCartItemDto>>(
    `/shop/users/me/cart/${cartItemId}`,
    { method: 'PUT', body: JSON.stringify({ quantity }) },
    true,
  );
  if (!result.data) throw new Error('购物车更新失败');
  return result.data;
}

export async function deleteShopCartItem(cartItemId: number) {
  await requestApi<ApiResponse>(`/shop/users/me/cart/${cartItemId}`, { method: 'DELETE' }, true);
}

export async function fetchShopOrders() {
  const result = await requestApi<ApiResponse<ShopOrderDto[]>>('/shop/orders', {}, true);
  return Array.isArray(result.data) ? result.data : [];
}

export async function fetchShopOrder(orderId: number) {
  const result = await requestApi<ApiResponse<ShopOrderDto>>(`/shop/orders/${orderId}`, {}, true);
  if (!result.data) throw new Error('订单不存在');
  return result.data;
}

export async function fetchMyCoupons() {
  const result = await requestApi<ApiResponse<ShopCouponDto[]>>('/shop/coupons', {}, true);
  return Array.isArray(result.data) ? result.data : [];
}

export async function fetchMyCoupon(userCouponId: number) {
  const result = await requestApi<ApiResponse<ShopCouponDto>>(`/shop/coupons/${userCouponId}`, {}, true);
  if (!result.data) throw new Error('优惠券不存在');
  return result.data;
}

export async function fetchAvailableCoupons(merchantId: number, subtotal: number) {
  const params = new URLSearchParams({
    merchantId: String(merchantId),
    subtotal: subtotal.toFixed(2),
  });
  const result = await requestApi<ApiResponse<ShopCouponDto[]>>(
    `/shop/coupons/available?${params.toString()}`,
    {},
    true,
  );
  return Array.isArray(result.data) ? result.data : [];
}

export async function createShopOrders(body: {
  addressId?: number | null;
  items: Array<{ productId: number; quantity: number; sourceReportId?: number; fulfillmentType?: 'ONLINE' | 'OFFLINE' }>;
  userCouponIds?: number[];
  couponAssignments?: ShopCouponAssignment[];
}) {
  const result = await requestApi<ApiResponse<ShopOrderDto[]>>(
    '/shop/orders',
    { method: 'POST', body: JSON.stringify(body) },
    true,
  );
  return Array.isArray(result.data) ? result.data : [];
}

export type ShopCouponAssignment = {
  userCouponId: number;
  merchantId: number;
  fulfillmentType: 'ONLINE' | 'OFFLINE';
  localLifeProductId?: number;
};

export async function checkoutShopCart(
  addressId: number | null,
  userCouponIds?: number[],
  couponAssignments?: ShopCouponAssignment[],
) {
  const result = await requestApi<ApiResponse<ShopOrderDto[]>>(
    '/shop/orders/from-cart',
    { method: 'POST', body: JSON.stringify({ addressId, userCouponIds, couponAssignments }) },
    true,
  );
  return Array.isArray(result.data) ? result.data : [];
}

export async function cancelShopOrder(orderId: number) {
  const result = await requestApi<ApiResponse<ShopOrderDto>>(
    `/shop/orders/${orderId}/cancel`,
    { method: 'PUT' },
    true,
  );
  if (!result.data) throw new Error('订单取消失败');
  return result.data;
}

export type WechatPaymentPrepareResult = {
  type: 'OAUTH' | 'JSAPI' | 'H5' | 'NATIVE';
  oauthUrl?: string;
  h5Url?: string;
  codeUrl?: string;
  appId?: string;
  timeStamp?: string;
  nonceStr?: string;
  packageValue?: string;
  signType?: string;
  paySign?: string;
};

export async function prepareWechatPayment(orderId: number, body: {
  code?: string;
  state?: string;
  returnUrl?: string;
}) {
  const result = await requestApi<ApiResponse<WechatPaymentPrepareResult>>(
    `/shop/payments/wechat/${orderId}/prepare`,
    { method: 'POST', body: JSON.stringify(body) },
    true,
  );
  if (!result.data) throw new Error('微信支付下单失败');
  return result.data;
}

export async function reconcileWechatPayment(orderId: number) {
  const result = await requestApi<ApiResponse<ShopOrderDto>>(
    `/shop/payments/wechat/${orderId}/status`,
    {},
    true,
  );
  if (!result.data) throw new Error('微信支付查单失败');
  return result.data;
}

export async function fetchShopOrderRedeemCode(orderId: number) {
  const result = await requestApi<ApiResponse<ShopOrderDto>>(
    `/shop/orders/${orderId}/redeem-code`,
    {},
    true,
  );
  if (!result.data) throw new Error('获取核销码失败');
  return result.data;
}

export async function confirmShopOrderReceived(orderId: number) {
  const result = await requestApi<ApiResponse<ShopOrderDto>>(
    `/shop/orders/${orderId}/received`,
    { method: 'PUT' },
    true,
  );
  if (!result.data) throw new Error('确认收货失败');
  return result.data;
}

export async function confirmTrialReceived(applicationId: number) {
  const result = await requestApi<ApiResponse<TrialApplicationDto>>(
    `/shop/trials/me/applications/${applicationId}/received`,
    { method: 'PUT' },
    true,
  );
  if (!result.data) throw new Error('确认收货失败');
  return result.data;
}

export async function publishVerificationReport(body: {
  trialApplicationId: number;
  title: string;
  experience: string;
  shortcoming: string;
  recommend: boolean;
  resources: Array<{ resourceType: 'IMAGE' | 'VIDEO'; resourceUrl: string }>;
}) {
  const resources = body.resources.map((resource) => {
    const resourceUrl = extractPlatformMediaPath(resource.resourceUrl);
    if (!resourceUrl) throw new Error('甄客验媒体地址无效，请重新上传');
    return { ...resource, resourceUrl };
  });
  const result = await requestApi<ApiResponse<VerificationReportDto>>(
    '/shop/reports',
    { method: 'POST', body: JSON.stringify({ ...body, resources }) },
    true,
  );
  if (!result.data) throw new Error('验证报告发布失败');
  return result.data;
}

export async function requestShopOrderRefund(orderId: number, reason: string) {
  const result = await requestApi<ApiResponse<ShopOrderDto>>(
    `/shop/orders/${orderId}/refund`,
    { method: 'POST', body: JSON.stringify({ reason }) },
    true,
  );
  if (!result.data) throw new Error('退款申请提交失败');
  return result.data;
}

export async function publishPurchaseVerificationReport(body: {
  orderItemId: number;
  title: string;
  experience: string;
  shortcoming: string;
  recommend: boolean;
  productQuality: number;
  logisticsService: number;
  serviceAttitude: number;
  resources: Array<{ resourceType: 'IMAGE' | 'VIDEO'; resourceUrl: string }>;
}) {
  const resources = body.resources.map((resource) => {
    const resourceUrl = extractPlatformMediaPath(resource.resourceUrl);
    if (!resourceUrl) throw new Error('甄客验媒体地址无效，请重新上传');
    return { ...resource, resourceUrl };
  });
  const result = await requestApi<ApiResponse<VerificationReportDto>>(
    '/shop/reports/purchase',
    { method: 'POST', body: JSON.stringify({ ...body, resources }) },
    true,
  );
  if (!result.data) throw new Error('购买甄客验发布失败');
  return result.data;
}

export async function fetchMyVerificationReports() {
  const result = await requestApi<ApiResponse<VerificationReportDto[]>>('/shop/reports/me/list', {}, true);
  return Array.isArray(result.data) ? result.data : [];
}

export async function fetchShopOrderLogistics(orderId: number) {
  const result = await requestApi<ApiResponse<LogisticsTraceDto>>(
    `/shop/orders/${orderId}/logistics`,
    {},
    true,
  );
  if (!result.data) throw new Error('物流查询失败');
  return result.data;
}

export async function fetchTrialApplicationLogistics(applicationId: number) {
  const result = await requestApi<ApiResponse<LogisticsTraceDto>>(
    `/shop/trials/me/applications/${applicationId}/logistics`,
    {},
    true,
  );
  if (!result.data) throw new Error('试用物流查询失败');
  return result.data;
}

export async function uploadShopContentFile(file: File) {
  const body = new FormData();
  body.append('file', file);
  const result = await requestApi<ApiResponse<string>>(
    '/shop/reports/resources',
    { method: 'POST', body },
    true,
  );
  const path = extractPlatformMediaPath(result.data);
  if (!path) throw new Error('甄客验资源上传结果无效，请重试');
  return path;
}

export async function fetchPublicTrialCampaign(campaignId: number) {
  const result = await requestApi<ApiResponse<PublicTrialCampaignDto>>(`/shop/trials/${campaignId}`);
  if (!result.data) throw new Error('试用活动不存在或已结束');
  return result.data;
}
