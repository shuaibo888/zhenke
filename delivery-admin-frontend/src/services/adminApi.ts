import type { AdminSession, ManagedLogisticsTrace, ManagedOrder, ManagedProduct, ManagedReport, ManagedTrialApplication, ManagedTrialRecruitment, MerchantAccount, MerchantAuditLog, ProductCategoryOption, ShopMemberLevel, ShopUserAccount } from '@/types';

const tokenStorageKey = 'zhenke_admin_access_token';

interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

interface CaptchaResponse extends ApiResponse {
  captchaEnabled: boolean;
  img?: string;
  uuid?: string;
}

interface LoginResponse extends ApiResponse {
  token: string;
}

interface AdminInfoResponse extends ApiResponse {
  user: {
    userId: number;
    userName: string;
    nickName: string;
  };
  roles: string[];
  permissions: string[];
}

interface UserListResponse extends ApiResponse {
  rows: ShopUserAccount[];
  total: number;
}

interface MerchantDto {
  merchantId: number;
  applicationNo: string;
  accountUsername: string;
  companyName: string;
  companyAddress?: string;
  contactName: string;
  contactPhone: string;
  businessLicense?: string;
  productIntro?: string;
  originTraceability?: string;
  acceptsVerificationRecruitment: '0' | '1';
  acceptsPublicWelfare: '0' | '1';
  auditStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  auditRemark?: string;
  adminUsername?: string;
  status: '0' | '1';
  auditBy?: string;
  auditTime?: string;
  createTime?: string;
  auditLogs?: MerchantAuditLog[];
}

interface MerchantListResponse extends ApiResponse {
  rows: MerchantDto[];
  total: number;
}

interface ProductDto {
  productId: number;
  merchantId: number;
  merchantName: string;
  categoryId: number;
  categoryCode: ProductCategoryOption['categoryCode'];
  categoryName: string;
  productName: string;
  subtitle?: string;
  detail: string;
  coverUrl: string;
  price: number;
  stock: number;
  salesCount: number;
  status: 'DRAFT' | 'ON_SALE' | 'OFF_SALE';
  images?: Array<{ imageId: number; imageUrl: string; imageSort: number }>;
}

interface ProductListResponse extends ApiResponse {
  rows: ProductDto[];
  total: number;
}

interface TrialCampaignDto {
  campaignId: number;
  merchantId: number;
  merchantName?: string;
  productId: number;
  productName: string;
  trialType: 'ONLINE' | 'OFFLINE';
  campaignTitle: string;
  campaignSummary: string;
  targetCount: number;
  applicantCount: number;
  approvedCount: number;
  applicationDeadline: string;
  status: 'DRAFT' | 'RECRUITING' | 'CLOSED' | 'FINISHED';
  publishedAt?: string;
  createTime?: string;
}

interface TrialCampaignListResponse extends ApiResponse {
  rows: TrialCampaignDto[];
  total: number;
}

interface ShopOrderDto {
  orderId: number;
  orderNo: string;
  userId: number;
  buyerName?: string;
  merchantId: number;
  merchantName?: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'SHIPPED' | 'RECEIVED' | 'CANCELLED' | 'REFUNDING' | 'REFUNDED';
  totalAmount: number;
  itemCount: number;
  payTime?: string;
  carrier?: string;
  trackingNo?: string;
  shipTime?: string;
  receiveTime?: string;
  refundStatus?: 'PENDING' | 'REFUNDING' | 'REFUNDED' | 'REJECTED';
  refundReason?: string;
  refundReviewRequired?: '0' | '1';
  refundAuditRemark?: string;
  refundRequestTime?: string;
  refundAuditTime?: string;
  refundCompleteTime?: string;
  createTime: string;
  items?: Array<{
    productId: number;
    productName: string;
    unitPrice: number;
    quantity: number;
  }>;
  address?: {
    recipient: string;
    phone: string;
    provinceCode?: string;
    cityCode?: string;
    districtCode?: string;
    detail: string;
  };
  logisticsEvents?: Array<{
    eventId: number;
    eventCode: string;
    description: string;
    location?: string;
    eventTime: string;
    source: 'SYSTEM' | 'PROVIDER';
  }>;
}

interface ShopOrderListResponse extends ApiResponse {
  rows?: ShopOrderDto[];
  total: number;
}

interface VerificationReportDto {
  reportId: number;
  merchantId: number;
  merchantName?: string;
  reportSource: 'TRIAL' | 'PURCHASE';
  trialType?: 'ONLINE' | 'OFFLINE';
  productName: string;
  userName: string;
  nickName?: string;
  status: 'PUBLISHED' | 'DELETED';
  shortcoming: string;
  aiScore?: number;
  aiScoreStatus: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  aiScoreReason?: string;
  aiScoredAt?: string;
  usefulCount: number;
  publishedAt: string;
}

export interface CaptchaState {
  enabled: boolean;
  image: string;
  uuid: string;
}

export interface ShopUserQuery {
  pageNum: number;
  pageSize: number;
  keyword?: string;
  status?: string;
  levelId?: number;
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(tokenStorageKey);
}

function storeToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(tokenStorageKey, token);
  else window.localStorage.removeItem(tokenStorageKey);
}

async function requestApi<T extends ApiResponse>(path: string, init: RequestInit = {}, authenticated = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (authenticated) {
    const token = getToken();
    if (!token) throw new Error('管理端登录已失效，请重新登录');
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`/api${path}`, { ...init, headers });
  const payload = (await response.json().catch(() => null)) as T | null;
  if (!response.ok || !payload || payload.code !== 200) {
    if (payload?.code === 401) storeToken(null);
    throw new Error(payload?.msg || '请求失败，请稍后重试');
  }
  return payload;
}

function formatApiDateTime(value?: string) {
  if (!value) return undefined;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
  return match ? `${match[1]} ${match[2]}` : value;
}

function toMerchantAccount(dto: MerchantDto): MerchantAccount {
  return {
    id: dto.merchantId,
    merchantId: dto.merchantId,
    applicationNo: dto.applicationNo,
    username: dto.accountUsername,
    name: dto.companyName,
    ownerName: dto.contactName,
    phone: dto.contactPhone,
    companyAddress: dto.companyAddress,
    businessLicense: dto.businessLicense,
    productIntro: dto.productIntro,
    originTraceability: dto.originTraceability,
    acceptsVerificationRecruitment: dto.acceptsVerificationRecruitment === '0',
    acceptsPublicWelfare: dto.acceptsPublicWelfare === '0',
    registeredAt: dto.createTime,
    productCount: 0,
    orderCount: 0,
    auditStatus: ({ PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' } as const)[dto.auditStatus],
    auditRemark: dto.auditRemark,
    auditBy: dto.auditBy,
    auditTime: dto.auditTime,
    status: dto.status === '0' ? 'active' : 'disabled',
    auditLogs: dto.auditLogs,
  };
}

function toManagedProduct(dto: ProductDto): ManagedProduct {
  return {
    id: dto.productId,
    merchantId: dto.merchantId,
    title: dto.productName,
    subtitle: dto.subtitle,
    artisanName: dto.merchantName,
    category: dto.categoryCode,
    categoryId: dto.categoryId,
    categoryName: dto.categoryName,
    status: ({ DRAFT: 'draft', ON_SALE: 'onSale', OFF_SALE: 'offSale' } as const)[dto.status],
    imageUrl: dto.coverUrl,
    detail: dto.detail,
    price: Number(dto.price),
    cost: 0,
    stock: dto.stock,
    sales: dto.salesCount,
    verifyCount: 0,
  };
}

function toManagedOrder(dto: ShopOrderDto): ManagedOrder {
  const items = Array.isArray(dto.items) ? dto.items : [];
  const address = dto.address;
  return {
    id: dto.orderId,
    merchantId: dto.merchantId,
    merchantName: dto.merchantName,
    orderNo: dto.orderNo,
    buyerName: dto.buyerName || `用户${dto.userId}`,
    status: ({
      PENDING_PAYMENT: 'unpaid',
      PAID: 'paid',
      SHIPPED: 'shipped',
      RECEIVED: 'completed',
      CANCELLED: 'canceled',
      REFUNDING: 'refunding',
      REFUNDED: 'refunded',
    } as const)[dto.status],
    amount: Number(dto.totalAmount),
    itemCount: dto.itemCount,
    productTitles: items.map((item) => item.productName),
    items: items.map((item) => ({
      productTitle: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })),
    address: address ? [address.recipient, address.phone, address.provinceCode, address.cityCode,
      address.districtCode, address.detail].filter(Boolean).join(' ') : '-',
    returnDays: 0,
    refundRequested: dto.refundStatus === 'PENDING',
    refundStatus: dto.refundStatus,
    refundReason: dto.refundReason,
    refundReviewRequired: dto.refundReviewRequired === '1',
    refundAuditRemark: dto.refundAuditRemark,
    refundRequestedAt: formatApiDateTime(dto.refundRequestTime),
    refundAuditedAt: formatApiDateTime(dto.refundAuditTime),
    refundCompletedAt: formatApiDateTime(dto.refundCompleteTime),
    createdAt: formatApiDateTime(dto.createTime) ?? '',
    paidAt: formatApiDateTime(dto.payTime),
    carrier: dto.carrier,
    trackingNo: dto.trackingNo,
    shippedAt: formatApiDateTime(dto.shipTime),
    receivedAt: formatApiDateTime(dto.receiveTime),
    logisticsEvents: (Array.isArray(dto.logisticsEvents) ? dto.logisticsEvents : []).map((event) => ({
      eventId: event.eventId,
      eventCode: event.eventCode,
      description: event.description,
      location: event.location,
      eventTime: formatApiDateTime(event.eventTime) ?? event.eventTime,
      source: event.source,
    })),
  };
}

async function toSession(result: AdminInfoResponse): Promise<AdminSession> {
  const isMerchant = result.roles.includes('merchant') && !result.roles.includes('admin');
  const session: AdminSession = {
    id: result.user.userId,
    username: result.user.userName,
    name: result.user.nickName,
    loginType: isMerchant ? 'merchant' : 'admin',
    permissions: result.permissions,
    roles: result.roles,
  };
  if (isMerchant) {
    const account = await requestApi<ApiResponse<MerchantDto>>('/shop/merchant/account/me', {}, true);
    session.merchantId = account.data?.merchantId;
  }
  return session;
}

export async function fetchAdminCaptcha(): Promise<CaptchaState> {
  const result = await requestApi<CaptchaResponse>('/captchaImage');
  return {
    enabled: result.captchaEnabled,
    image: result.img ? `data:image/gif;base64,${result.img}` : '',
    uuid: result.uuid ?? '',
  };
}

export async function loginAdmin(values: { username: string; password: string; code?: string; uuid?: string }) {
  const result = await requestApi<LoginResponse>('/login', {
    method: 'POST',
    body: JSON.stringify(values),
  });
  storeToken(result.token);
  try {
    return await toSession(await requestApi<AdminInfoResponse>('/getInfo', {}, true));
  } catch (error) {
    storeToken(null);
    throw error;
  }
}

export async function restoreAdminSession() {
  if (!getToken()) return null;
  try {
    return await toSession(await requestApi<AdminInfoResponse>('/getInfo', {}, true));
  } catch {
    storeToken(null);
    return null;
  }
}

export async function logoutAdmin() {
  try {
    if (getToken()) await requestApi<ApiResponse>('/logout', { method: 'POST' }, true);
  } finally {
    storeToken(null);
  }
}

export async function fetchShopUsers(query: ShopUserQuery) {
  const params = new URLSearchParams({ pageNum: String(query.pageNum), pageSize: String(query.pageSize) });
  if (query.keyword) params.set('userName', query.keyword);
  if (query.status) params.set('status', query.status);
  if (query.levelId) params.set('levelId', String(query.levelId));
  return requestApi<UserListResponse>(`/shop/admin/users?${params.toString()}`, {}, true);
}

export async function fetchShopMemberLevels() {
  const result = await requestApi<ApiResponse<ShopMemberLevel[]>>('/shop/admin/users/levels', {}, true);
  return result.data ?? [];
}

export async function updateShopUserStatus(userId: number, status: '0' | '1') {
  return requestApi<ApiResponse>(
    `/shop/admin/users/${userId}/status`,
    { method: 'PUT', body: JSON.stringify({ status }) },
    true,
  );
}

export async function updateShopUserLevel(userId: number, levelId: number) {
  return requestApi<ApiResponse>(
    `/shop/admin/users/${userId}/level`,
    { method: 'PUT', body: JSON.stringify({ levelId }) },
    true,
  );
}

export async function fetchMerchants(query: { pageNum?: number; pageSize?: number; auditStatus?: string } = {}) {
  const params = new URLSearchParams({
    pageNum: String(query.pageNum ?? 1),
    pageSize: String(query.pageSize ?? 100),
  });
  if (query.auditStatus) params.set('auditStatus', query.auditStatus);
  const result = await requestApi<MerchantListResponse>(`/shop/admin/merchants?${params.toString()}`, {}, true);
  return { rows: result.rows.map(toMerchantAccount), total: result.total };
}

export async function fetchMerchantDetail(merchantId: number) {
  const result = await requestApi<ApiResponse<MerchantDto>>(`/shop/admin/merchants/${merchantId}`, {}, true);
  if (!result.data) throw new Error('商家详情加载失败');
  return toMerchantAccount(result.data);
}

export async function auditMerchant(
  merchantId: number,
  body: { decision: 'APPROVED' | 'REJECTED'; auditRemark?: string },
) {
  const result = await requestApi<ApiResponse<MerchantDto>>(
    `/shop/admin/merchants/${merchantId}/audit`,
    { method: 'PUT', body: JSON.stringify(body) },
    true,
  );
  if (!result.data) throw new Error('商家审核失败');
  return toMerchantAccount(result.data);
}

export async function updateMerchantStatus(merchantId: number, status: '0' | '1') {
  return requestApi<ApiResponse>(
    `/shop/admin/merchants/${merchantId}/status`,
    { method: 'PUT', body: JSON.stringify({ status }) },
    true,
  );
}

export async function fetchProductCategories() {
  const result = await requestApi<ApiResponse<ProductCategoryOption[]>>('/shop/products/categories');
  return result.data ?? [];
}

export async function fetchAllProductCategories() {
  const result = await requestApi<ApiResponse<ProductCategoryOption[]>>('/shop/admin/products/categories/all', {}, true);
  return result.data ?? [];
}

export async function updateProductCategory(
  categoryId: number,
  body: { categoryName: string; categorySort: number; status: '0' | '1' },
) {
  return requestApi<ApiResponse>(
    `/shop/admin/products/categories/${categoryId}`,
    { method: 'PUT', body: JSON.stringify(body) },
    true,
  );
}

export async function fetchManagedProducts(session: AdminSession) {
  const path = session.loginType === 'merchant' ? '/shop/merchant/products' : '/shop/admin/products';
  const result = await requestApi<ProductListResponse>(`${path}?pageNum=1&pageSize=100`, {}, true);
  return { rows: result.rows.map(toManagedProduct), total: result.total };
}

export interface ProductWriteBody {
  categoryId: number;
  productName: string;
  subtitle?: string;
  detail: string;
  coverUrl: string;
  price: number;
  stock: number;
  imageUrls?: string[];
}

export async function createMerchantProduct(body: ProductWriteBody) {
  const result = await requestApi<ApiResponse<ProductDto>>(
    '/shop/merchant/products',
    { method: 'POST', body: JSON.stringify(body) },
    true,
  );
  if (!result.data) throw new Error('商品保存失败');
  return toManagedProduct(result.data);
}

export async function updateMerchantProduct(productId: number, body: ProductWriteBody) {
  const result = await requestApi<ApiResponse<ProductDto>>(
    `/shop/merchant/products/${productId}`,
    { method: 'PUT', body: JSON.stringify(body) },
    true,
  );
  if (!result.data) throw new Error('商品更新失败');
  return toManagedProduct(result.data);
}

export async function updateMerchantProductSaleStatus(productId: number, status: 'ON_SALE' | 'OFF_SALE') {
  const result = await requestApi<ApiResponse<ProductDto>>(
    `/shop/merchant/products/${productId}/status`,
    { method: 'PUT', body: JSON.stringify({ status }) },
    true,
  );
  if (!result.data) throw new Error('商品状态更新失败');
  return toManagedProduct(result.data);
}

export async function fetchMerchantOrders() {
  const result = await requestApi<ShopOrderListResponse>(
    '/shop/merchant/orders?pageNum=1&pageSize=100',
    {},
    true,
  );
  const rows = Array.isArray(result.rows) ? result.rows : [];
  return { rows: rows.map(toManagedOrder), total: typeof result.total === 'number' ? result.total : 0 };
}

export async function fetchAdminOrders() {
  const result = await requestApi<ShopOrderListResponse>(
    '/shop/admin/orders?pageNum=1&pageSize=100',
    {},
    true,
  );
  const rows = Array.isArray(result.rows) ? result.rows : [];
  return { rows: rows.map(toManagedOrder), total: typeof result.total === 'number' ? result.total : 0 };
}

export async function fetchMerchantOrder(orderId: number) {
  const result = await requestApi<ApiResponse<ShopOrderDto>>(`/shop/merchant/orders/${orderId}`, {}, true);
  if (!result.data) throw new Error('订单详情加载失败');
  return toManagedOrder(result.data);
}

export async function fetchMerchantOrderLogistics(orderId: number) {
  const result = await requestApi<ApiResponse<ManagedLogisticsTrace>>(
    `/shop/merchant/orders/${orderId}/logistics`,
    {},
    true,
  );
  if (!result.data) throw new Error('物流查询失败');
  return { ...result.data, events: Array.isArray(result.data.events) ? result.data.events : [] };
}

export async function fetchAdminOrder(orderId: number) {
  const result = await requestApi<ApiResponse<ShopOrderDto>>(`/shop/admin/orders/${orderId}`, {}, true);
  if (!result.data) throw new Error('订单详情加载失败');
  return toManagedOrder(result.data);
}

export async function shipMerchantOrder(orderId: number, trackingNo: string) {
  const result = await requestApi<ApiResponse<ShopOrderDto>>(
    `/shop/merchant/orders/${orderId}/ship`,
    { method: 'PUT', body: JSON.stringify({ trackingNo }) },
    true,
  );
  if (!result.data) throw new Error('订单发货失败');
  return toManagedOrder(result.data);
}

function toManagedTrial(dto: TrialCampaignDto): ManagedTrialRecruitment {
  return {
    id: dto.campaignId,
    merchantId: dto.merchantId,
    merchantName: dto.merchantName,
    productId: dto.productId,
    productTitle: dto.productName,
    trialType: dto.trialType,
    targetCount: dto.targetCount,
    claimedCount: dto.approvedCount,
    deadline: formatApiDateTime(dto.applicationDeadline) ?? dto.applicationDeadline,
    applicantCount: dto.applicantCount,
    status: ({ DRAFT: 'draft', RECRUITING: 'recruiting', CLOSED: 'closed', FINISHED: 'finished' } as const)[dto.status],
    createdAt: formatApiDateTime(dto.publishedAt ?? dto.createTime) ?? '',
  };
}

export async function auditMerchantOrderRefund(
  orderId: number,
  decision: 'APPROVED' | 'REJECTED',
  auditRemark?: string,
) {
  const result = await requestApi<ApiResponse<ShopOrderDto>>(
    `/shop/merchant/orders/${orderId}/refund/audit`,
    { method: 'PUT', body: JSON.stringify({ decision, auditRemark }) },
    true,
  );
  if (!result.data) throw new Error('退款审核失败');
  return toManagedOrder(result.data);
}

function toManagedReport(dto: VerificationReportDto): ManagedReport {
  return {
    id: dto.reportId,
    merchantId: dto.merchantId,
    merchantName: dto.merchantName,
    reportSource: dto.reportSource,
    trialType: dto.trialType,
    productTitle: dto.productName,
    userName: dto.nickName || dto.userName,
    status: dto.status === 'PUBLISHED' ? 'published' : 'deleted',
    shortcoming: dto.shortcoming,
    aiScore: dto.aiScore === undefined || dto.aiScore === null ? undefined : Number(dto.aiScore),
    aiScoreStatus: dto.aiScoreStatus,
    aiScoreReason: dto.aiScoreReason,
    aiScoredAt: formatApiDateTime(dto.aiScoredAt),
    usefulCount: Number(dto.usefulCount ?? 0),
    createdAt: formatApiDateTime(dto.publishedAt) ?? '',
  };
}

export async function fetchManagedTrials(session: AdminSession) {
  const path = session.loginType === 'merchant' ? '/shop/merchant/trials' : '/shop/admin/trials';
  const result = await requestApi<TrialCampaignListResponse>(`${path}?pageNum=1&pageSize=100`, {}, true);
  return { rows: result.rows.map(toManagedTrial), total: result.total };
}

export async function fetchMerchantReports() {
  const result = await requestApi<ApiResponse<VerificationReportDto[]>>('/shop/merchant/reports', {}, true);
  const rows = Array.isArray(result.data) ? result.data : [];
  return rows.map(toManagedReport);
}

export async function createMerchantTrial(body: {
  productId: number;
  trialTypes: Array<'ONLINE' | 'OFFLINE'>;
  campaignTitle: string;
  campaignSummary: string;
  targetCount: number;
  applicationDeadline: string;
}) {
  const result = await requestApi<ApiResponse<TrialCampaignDto[]>>(
    '/shop/merchant/trials',
    { method: 'POST', body: JSON.stringify(body) },
    true,
  );
  if (!Array.isArray(result.data) || result.data.length === 0) throw new Error('试用招募保存失败');
  return result.data;
}

export async function updateMerchantTrialStatus(
  campaignId: number,
  status: 'RECRUITING' | 'CLOSED' | 'FINISHED',
) {
  const result = await requestApi<ApiResponse<TrialCampaignDto>>(
    `/shop/merchant/trials/${campaignId}/status`,
    { method: 'PUT', body: JSON.stringify({ status }) },
    true,
  );
  if (!result.data) throw new Error('试用招募状态更新失败');
  return result.data;
}

interface TrialApplicationListResponse extends ApiResponse {
  rows: ManagedTrialApplication[];
  total: number;
}

export async function fetchMerchantTrialApplications() {
  const result = await requestApi<TrialApplicationListResponse>(
    '/shop/merchant/trials/applications?pageNum=1&pageSize=100',
    {},
    true,
  );
  return { rows: result.rows, total: result.total };
}

export async function auditMerchantTrialApplication(
  applicationId: number,
  decision: 'APPROVED' | 'REJECTED',
  auditRemark?: string,
) {
  return requestApi<ApiResponse<ManagedTrialApplication>>(
    `/shop/merchant/trials/applications/${applicationId}/audit`,
    { method: 'PUT', body: JSON.stringify({ decision, auditRemark }) },
    true,
  );
}

export async function shipMerchantTrialApplication(applicationId: number, trackingNo: string) {
  return requestApi<ApiResponse<ManagedTrialApplication>>(
    `/shop/merchant/trials/applications/${applicationId}/ship`,
    { method: 'PUT', body: JSON.stringify({ trackingNo }) },
    true,
  );
}

export async function uploadAdminFile(file: File) {
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
