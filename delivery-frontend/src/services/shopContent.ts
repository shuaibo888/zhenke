const tokenStorageKey = 'zhenke_access_token';

interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

interface TableResponse<T> extends ApiResponse {
  rows: T[];
  total: number;
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(tokenStorageKey);
}

async function requestApi<T extends ApiResponse>(path: string, init: RequestInit = {}, authenticated = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (authenticated) {
    const token = getToken();
    if (!token) throw new Error('请先登录后再操作');
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`/api${path}`, { ...init, headers });
  const payload = (await response.json().catch(() => null)) as T | null;
  if (!response.ok || !payload || payload.code !== 200) {
    throw new Error(payload?.msg || '请求失败，请稍后重试');
  }
  return payload;
}

export interface ProductCategoryDto {
  categoryId: number;
  categoryCode: `CATEGORY_${1 | 2 | 3 | 4}`;
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
  productName: string;
  subtitle?: string;
  detail: string;
  coverUrl: string;
  price: number;
  stock: number;
  salesCount: number;
  status: 'ON_SALE';
  images?: Array<{ imageId: number; imageUrl: string; imageSort: number }>;
}

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
    targetCount: number;
    approvedCount: number;
    applicationDeadline: string;
  };
  report?: {
    shopUserId: number;
    userName: string;
    shortcoming: string;
    recommend: '0' | '1';
  };
}

export interface VerificationReportDto {
  reportId: number;
  productId: number;
  productName: string;
  productCoverUrl: string;
  merchantId: number;
  merchantName: string;
  categoryCode: ProductCategoryDto['categoryCode'];
  categoryName: string;
  trialApplicationId: number;
  shopUserId: number;
  userName: string;
  nickName?: string;
  experience: string;
  shortcoming: string;
  fitCrowd: string;
  recommend: '0' | '1';
  status: 'PUBLISHED' | 'HIDDEN';
  publishedAt: string;
  resources?: Array<{
    resourceId: number;
    resourceType: 'IMAGE' | 'VIDEO';
    resourceUrl: string;
    resourceSort: number;
  }>;
}

export interface TrialApplicationDto {
  applicationId: number;
  campaignId: number;
  merchantId: number;
  productId: number;
  productName: string;
  campaignTitle: string;
  shopUserId: number;
  applyReason: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  status: 'APPLIED' | 'APPROVED' | 'REJECTED' | 'SHIPPED' | 'RECEIVED' | 'COMPLETED' | 'EXPIRED';
  auditRemark?: string;
  carrier?: string;
  trackingNo?: string;
  shippedAt?: string;
  receivedAt?: string;
  completedAt?: string;
  createTime?: string;
  applicationDeadline?: string;
}

export interface ShopCartItemDto {
  cartItemId: number;
  userId: number;
  productId: number;
  quantity: number;
  merchantId: number;
  merchantName: string;
  categoryCode: ProductCategoryDto['categoryCode'];
  categoryName: string;
  productName: string;
  coverUrl: string;
  price: number;
  stock: number;
  productStatus: 'DRAFT' | 'ON_SALE' | 'OFF_SALE';
}

export interface ShopOrderDto {
  orderId: number;
  orderNo: string;
  userId: number;
  merchantId: number;
  merchantName: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'SHIPPED' | 'RECEIVED' | 'CANCELLED';
  totalAmount: number;
  itemCount: number;
  payTime?: string;
  carrier?: string;
  trackingNo?: string;
  shipTime?: string;
  receiveTime?: string;
  cancelTime?: string;
  createTime: string;
  updateTime: string;
  items: Array<{
    orderItemId: number;
    productId: number;
    productName: string;
    coverUrl: string;
    unitPrice: number;
    quantity: number;
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
}

export async function fetchHomeFeed(categoryCode?: string, contentType: 'ALL' | 'TRIAL' | 'REPORT' = 'ALL') {
  const params = new URLSearchParams({ pageNum: '1', pageSize: '100', contentType });
  if (categoryCode) params.set('categoryCode', categoryCode);
  const result = await requestApi<TableResponse<HomeFeedItemDto>>(`/shop/home/feed?${params.toString()}`);
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

export async function fetchPublicProduct(productId: number) {
  const result = await requestApi<ApiResponse<PublicProductDto>>(`/shop/products/${productId}`);
  if (!result.data) throw new Error('商品详情加载失败');
  return result.data;
}

export async function fetchPublishedReport(reportId: number) {
  const result = await requestApi<ApiResponse<VerificationReportDto>>(`/shop/reports/${reportId}`);
  if (!result.data) throw new Error('验证报告加载失败');
  return result.data;
}

export async function applyForTrial(campaignId: number, body: {
  applyReason: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
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

export async function fetchShopCart() {
  const result = await requestApi<ApiResponse<ShopCartItemDto[]>>('/shop/users/me/cart', {}, true);
  return Array.isArray(result.data) ? result.data : [];
}

export async function addShopCartItem(productId: number, quantity = 1) {
  const result = await requestApi<ApiResponse<ShopCartItemDto>>(
    '/shop/users/me/cart',
    { method: 'POST', body: JSON.stringify({ productId, quantity }) },
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

export async function createShopOrders(body: {
  addressId: number;
  items: Array<{ productId: number; quantity: number }>;
}) {
  const result = await requestApi<ApiResponse<ShopOrderDto[]>>(
    '/shop/orders',
    { method: 'POST', body: JSON.stringify(body) },
    true,
  );
  return Array.isArray(result.data) ? result.data : [];
}

export async function checkoutShopCart(addressId: number) {
  const result = await requestApi<ApiResponse<ShopOrderDto[]>>(
    '/shop/orders/from-cart',
    { method: 'POST', body: JSON.stringify({ addressId }) },
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

export async function payShopOrder(orderId: number) {
  const result = await requestApi<ApiResponse<ShopOrderDto>>(
    `/shop/orders/${orderId}/pay`,
    { method: 'PUT' },
    true,
  );
  if (!result.data) throw new Error('订单支付失败');
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
  experience: string;
  shortcoming: string;
  fitCrowd: string;
  recommend: boolean;
  resources?: Array<{ resourceType: 'IMAGE' | 'VIDEO'; resourceUrl: string }>;
}) {
  const result = await requestApi<ApiResponse<VerificationReportDto>>(
    '/shop/reports',
    { method: 'POST', body: JSON.stringify(body) },
    true,
  );
  if (!result.data) throw new Error('验证报告发布失败');
  return result.data;
}

export async function fetchMyVerificationReports() {
  const result = await requestApi<ApiResponse<VerificationReportDto[]>>('/shop/reports/me/list', {}, true);
  return result.data ?? [];
}

export async function uploadShopContentFile(file: File) {
  const token = getToken();
  if (!token) throw new Error('请先登录后再上传文件');
  const body = new FormData();
  body.append('file', file);
  const response = await fetch('/api/common/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  const payload = (await response.json().catch(() => null)) as (ApiResponse & { url?: string }) | null;
  if (!response.ok || !payload || payload.code !== 200 || !payload.url) {
    throw new Error(payload?.msg || '文件上传失败');
  }
  return payload.url;
}
