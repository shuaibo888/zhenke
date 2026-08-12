import type { Merchant } from '@/types';
import type { AuthUser } from '@/utils/authRules';
import { getToken, storeToken, requestApi, type ApiResponse, type TableResponse } from './apiClient';

const merchantApplicationStorageKey = 'zhenke_merchant_application_phone';

interface CaptchaResponse extends ApiResponse {
  captchaEnabled: boolean;
  img?: string;
  uuid?: string;
}

export interface CaptchaState {
  enabled: boolean;
  image: string;
  uuid: string;
}

interface LoginResponse extends ApiResponse {
  token: string;
  user: AuthUser;
}

let ssoLoginRequest: { ticket: string; promise: Promise<AuthUser> } | null = null;

export type PhoneVerificationScene =
  | 'LOGIN_REGISTER'
  | 'BIND_PHONE'
  | 'CHANGE_PHONE'
  | 'RESET_PASSWORD';

export interface PhoneAuthCapabilities {
  smsEnabled: boolean;
  oneClickEnabled: boolean;
  sdkUrl: string;
}

export interface OneClickTokens {
  accessToken: string;
  jwtToken: string;
}

export async function registerShopUser(
  username: string,
  password: string,
  code?: string,
  uuid?: string,
) {
  return requestApi<ApiResponse>('/shop/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username: username.trim(), password, code, uuid }),
  });
}

export async function fetchShopCaptcha(): Promise<CaptchaState> {
  const result = await requestApi<CaptchaResponse>('/captchaImage');
  if (result.captchaEnabled && (!result.img || !result.uuid)) {
    throw new Error('验证码加载不完整，请重新获取');
  }
  return {
    enabled: result.captchaEnabled,
    image: result.img ? `data:image/gif;base64,${result.img}` : '',
    uuid: result.uuid ?? '',
  };
}

export async function loginShopUser(username: string, password: string, code?: string, uuid?: string) {
  const result = await requestApi<LoginResponse>('/shop/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: username.trim(), password, code, uuid }),
  });
  storeToken(result.token);
  return result.user;
}

export async function fetchPhoneAuthCapabilities() {
  const result = await requestApi<ApiResponse<PhoneAuthCapabilities>>('/shop/auth/phone/capabilities');
  if (!result.data) throw new Error('手机号认证配置加载失败');
  return result.data;
}

export async function sendLoginPhoneCode(phone: string) {
  return requestApi<ApiResponse>('/shop/auth/phone/sms/send', {
    method: 'POST',
    body: JSON.stringify({ phone: phone.trim(), scene: 'LOGIN_REGISTER' }),
  });
}

export async function loginOrRegisterByPhone(phone: string, code: string) {
  const result = await requestApi<LoginResponse>('/shop/auth/phone/login', {
    method: 'POST',
    body: JSON.stringify({ phone: phone.trim(), code: code.trim() }),
  });
  storeToken(result.token);
  return result.user;
}

export async function fetchOneClickTokens() {
  const result = await requestApi<ApiResponse<OneClickTokens>>('/shop/auth/phone/one-click/tokens', {
    method: 'POST',
  });
  if (!result.data?.accessToken || !result.data?.jwtToken) throw new Error('一键认证初始化失败');
  return result.data;
}

export async function loginOrRegisterByOneClick(spToken: string) {
  const result = await requestApi<LoginResponse>('/shop/auth/phone/one-click/login', {
    method: 'POST',
    body: JSON.stringify({ spToken }),
  });
  storeToken(result.token);
  return result.user;
}

export function loginOrRegisterBySsoTicket(rawTicket: string) {
  const ticket = rawTicket.trim();
  if (!ticket || ticket.length > 512) {
    return Promise.reject(new Error('登录票据格式错误，请重新从赛事系统进入'));
  }
  if (ssoLoginRequest?.ticket === ticket) return ssoLoginRequest.promise;

  const promise = requestApi<LoginResponse>('/shop/auth/sso/login', {
    method: 'POST',
    body: JSON.stringify({ ticket }),
  }).then((result) => {
    storeToken(result.token);
    return result.user;
  });
  ssoLoginRequest = { ticket, promise };
  return promise;
}

export async function restoreShopSession() {
  if (!getToken()) return null;
  try {
    const result = await requestApi<ApiResponse<AuthUser>>(
      '/shop/users/me',
      {},
      true,
      { silentAuthExpired: true },
    );
    return result.data ?? null;
  } catch {
    storeToken(null);
    return null;
  }
}

export async function logoutShopUser() {
  try {
    if (getToken()) {
      await requestApi<ApiResponse>('/logout', { method: 'POST' }, true, { silentAuthExpired: true });
    }
  } catch {
    // 主动退出以本地清除令牌为准，忽略接口错误
  } finally {
    storeToken(null);
  }
}

export async function updateShopProfile(changes: { nickname?: string }) {
  const result = await requestApi<ApiResponse<AuthUser>>(
    '/shop/users/me',
    { method: 'PUT', body: JSON.stringify(changes) },
    true,
  );
  if (!result.data) throw new Error('用户资料更新失败');
  return result.data;
}

export async function uploadShopAvatar(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const result = await requestApi<ApiResponse<AuthUser>>(
    '/shop/users/me/avatar',
    { method: 'POST', body: formData },
    true,
  );
  if (!result.data) throw new Error('头像上传失败');
  return result.data;
}

export async function changeShopPassword(newPassword: string, oldPassword?: string, smsCode?: string) {
  return requestApi<ApiResponse>(
    '/shop/users/me/password',
    { method: 'PUT', body: JSON.stringify({ oldPassword, newPassword, smsCode }) },
    true,
  );
}

export async function initializeShopUsername(username: string) {
  const result = await requestApi<ApiResponse<AuthUser>>(
    '/shop/users/me/username',
    { method: 'PUT', body: JSON.stringify({ username: username.trim(), permanentConfirmed: true }) },
    true,
  );
  if (!result.data) throw new Error('账号名设置失败');
  return result.data;
}

export async function sendAuthenticatedPhoneCode(
  scene: Exclude<PhoneVerificationScene, 'LOGIN_REGISTER'>,
  phone?: string,
) {
  return requestApi<ApiResponse>(
    '/shop/users/me/phone/sms/send',
    { method: 'POST', body: JSON.stringify({ phone: phone?.trim(), scene }) },
    true,
  );
}

export async function bindShopPhone(phone: string, code: string) {
  const result = await requestApi<ApiResponse<AuthUser>>(
    '/shop/users/me/phone/bind',
    { method: 'PUT', body: JSON.stringify({ phone: phone.trim(), code: code.trim() }) },
    true,
  );
  if (!result.data) throw new Error('手机号绑定失败');
  return result.data;
}

export async function bindShopPhoneByOneClick(spToken: string) {
  const result = await requestApi<ApiResponse<AuthUser>>(
    '/shop/users/me/phone/one-click-bind',
    { method: 'PUT', body: JSON.stringify({ spToken }) },
    true,
  );
  if (!result.data) throw new Error('手机号绑定失败');
  return result.data;
}

export async function changeShopPhone(body: {
  newPhone: string;
  newPhoneCode: string;
}) {
  const result = await requestApi<ApiResponse<AuthUser>>(
    '/shop/users/me/phone',
    { method: 'PUT', body: JSON.stringify(body) },
    true,
  );
  if (!result.data) throw new Error('手机号换绑失败');
  return result.data;
}

export interface ShopUserOverview {
  orderCount: number;
  trialCount: number;
  reportCount: number;
  couponAvailableCount: number;
  pointsBalance: number;
}

export async function fetchMyOverview() {
  const result = await requestApi<ApiResponse<ShopUserOverview>>('/shop/users/me/overview', {}, true);
  const overview = result.data;
  if (!overview
    || !Number.isSafeInteger(overview.orderCount) || overview.orderCount < 0
    || !Number.isSafeInteger(overview.trialCount) || overview.trialCount < 0
    || !Number.isSafeInteger(overview.reportCount) || overview.reportCount < 0
    || !Number.isSafeInteger(overview.couponAvailableCount) || overview.couponAvailableCount < 0
    || !Number.isSafeInteger(overview.pointsBalance) || overview.pointsBalance < 0) {
    throw new Error('个人中心汇总数据异常');
  }
  return overview;
}

export interface ShopPointBalance {
  balance: number;
  totalTransferredIn: number;
  totalConsumed: number;
  lastTransferTime: string | null;
}

export async function fetchMyPointBalance() {
  const result = await requestApi<ApiResponse<ShopPointBalance>>('/shop/users/me/points', {}, true);
  const summary = result.data;
  const lastTransferTime = summary?.lastTransferTime ?? null;
  if (!summary
    || !Number.isSafeInteger(summary.balance) || summary.balance < 0
    || !Number.isSafeInteger(summary.totalTransferredIn) || summary.totalTransferredIn < 0
    || !Number.isSafeInteger(summary.totalConsumed) || summary.totalConsumed < 0
    || (lastTransferTime !== null && typeof lastTransferTime !== 'string')) {
    throw new Error('积分账户数据异常');
  }
  return { ...summary, lastTransferTime };
}

export interface ShopPointRecord {
  pointRecordId: number;
  changeAmount: number;
  balanceAfter: number;
  changeReason: string;
  createTime: string;
}

export async function fetchMyPointRecords(pageNum = 1, pageSize = 20) {
  const result = await requestApi<TableResponse<ShopPointRecord>>(
    `/shop/users/me/points/records?pageNum=${pageNum}&pageSize=${pageSize}`,
    {},
    true,
  );
  const rows = Array.isArray(result.rows) ? result.rows : [];
  if (rows.some((record) => (
    !Number.isSafeInteger(record.pointRecordId)
    || !Number.isSafeInteger(record.changeAmount)
    || record.changeAmount === 0
    || !Number.isSafeInteger(record.balanceAfter)
    || record.balanceAfter < 0
    || typeof record.changeReason !== 'string'
    || typeof record.createTime !== 'string'
  ))) {
    throw new Error('积分变更记录数据异常');
  }
  return {
    rows,
    total: Number.isSafeInteger(result.total) && result.total >= 0 ? result.total : rows.length,
  };
}

export interface ShopPointCouponOption {
  couponId: number;
  couponName: string;
  description?: string;
  discountAmount: number;
  minimumSpend: number;
  pointsCost: number;
  startTime: string;
  endTime: string;
  remainingStock: number;
  exchanged: boolean;
}

export async function fetchPointCouponOptions() {
  const result = await requestApi<ApiResponse<ShopPointCouponOption[]>>(
    '/shop/users/me/points/coupons',
    {},
    true,
  );
  const rows = Array.isArray(result.data) ? result.data : [];
  if (rows.some((coupon) => (
    !Number.isSafeInteger(coupon.couponId) || coupon.couponId <= 0
    || typeof coupon.couponName !== 'string'
    || !Number.isFinite(coupon.discountAmount) || coupon.discountAmount <= 0
    || !Number.isFinite(coupon.minimumSpend) || coupon.minimumSpend < 0
    || !Number.isSafeInteger(coupon.pointsCost) || coupon.pointsCost <= 0
    || typeof coupon.startTime !== 'string'
    || typeof coupon.endTime !== 'string'
    || !Number.isSafeInteger(coupon.remainingStock) || coupon.remainingStock < 0
    || typeof coupon.exchanged !== 'boolean'
  ))) {
    throw new Error('积分兑换优惠券数据异常');
  }
  return rows;
}

export async function exchangePointCoupon(couponId: number) {
  if (!Number.isSafeInteger(couponId) || couponId <= 0) {
    throw new Error('优惠券参数错误');
  }
  return requestApi<ApiResponse>(
    `/shop/users/me/points/coupons/${couponId}/exchange`,
    { method: 'POST' },
    true,
  );
}

export interface ShopShippingAddress {
  id: number;
  recipient: string;
  phone: string;
  region: string[];
  detail: string;
  isDefault: boolean;
}

export interface ShopShippingAddressBody {
  recipient: string;
  phone: string;
  region: string[];
  detail: string;
  isDefault?: boolean;
}

export async function fetchShopShippingAddresses() {
  const result = await requestApi<ApiResponse<ShopShippingAddress[]>>('/shop/users/me/addresses', {}, true);
  return Array.isArray(result.data) ? result.data : [];
}

export async function createShopShippingAddress(body: ShopShippingAddressBody) {
  const result = await requestApi<ApiResponse<ShopShippingAddress>>(
    '/shop/users/me/addresses',
    { method: 'POST', body: JSON.stringify(body) },
    true,
  );
  if (!result.data) throw new Error('收货地址新增失败');
  return result.data;
}

export async function updateShopShippingAddress(addressId: number, body: ShopShippingAddressBody) {
  const result = await requestApi<ApiResponse<ShopShippingAddress>>(
    `/shop/users/me/addresses/${addressId}`,
    { method: 'PUT', body: JSON.stringify(body) },
    true,
  );
  if (!result.data) throw new Error('收货地址更新失败');
  return result.data;
}

export async function setDefaultShopShippingAddress(addressId: number) {
  const result = await requestApi<ApiResponse<ShopShippingAddress>>(
    `/shop/users/me/addresses/${addressId}/default`,
    { method: 'PUT' },
    true,
  );
  if (!result.data) throw new Error('默认地址设置失败');
  return result.data;
}

export async function deleteShopShippingAddress(addressId: number) {
  return requestApi<ApiResponse>(
    `/shop/users/me/addresses/${addressId}`,
    { method: 'DELETE' },
    true,
  );
}

export interface MerchantApplicationBody {
  accountUsername: string;
  password: string;
  companyName: string;
  companyAddress: string;
  legalPerson: string;
  contactName: string;
  contactPhone: string;
  businessLicense: string;
  companyCreditCode: string;
  productIntro: string;
  originTraceability: string;
  acceptsVerificationRecruitment: boolean;
  acceptsPublicWelfare: boolean;
  agreeProtocol: boolean;
}

export interface MerchantApplicationLookup {
  contactPhone: string;
}

function storeMerchantApplicationLookup(lookup: MerchantApplicationLookup) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(merchantApplicationStorageKey, JSON.stringify(lookup));
  }
}

export function getStoredMerchantApplicationLookup() {
  if (typeof window === 'undefined') return null;
  const saved = window.localStorage.getItem(merchantApplicationStorageKey);
  if (!saved) return null;
  try {
    const lookup = JSON.parse(saved) as Partial<MerchantApplicationLookup>;
    if (typeof lookup.contactPhone === 'string' && /^1\d{10}$/.test(lookup.contactPhone)) {
      return { contactPhone: lookup.contactPhone };
    }
  } catch {
    // Invalid data is removed below.
  }
  window.localStorage.removeItem(merchantApplicationStorageKey);
  return null;
}

export async function fetchMerchantApplication(lookup: MerchantApplicationLookup) {
  const result = await requestApi<ApiResponse<Merchant>>(
    '/shop/merchants/status',
    { method: 'POST', body: JSON.stringify(lookup) },
  );
  if (!result.data) throw new Error('商家入驻申请查询失败');
  storeMerchantApplicationLookup(lookup);
  return result.data;
}

export async function fetchMyMerchantApplication() {
  const lookup = getStoredMerchantApplicationLookup();
  if (!lookup) return null;
  return fetchMerchantApplication(lookup);
}

export interface MerchantLicenseRecognized {
  creditCode: string;
  companyName: string;
  businessAddress: string;
  legalPerson: string;
}

export interface MerchantLicenseUploadResult {
  url: string;
  recognized: MerchantLicenseRecognized | null;
  verifyMessage?: string;
}

export async function uploadMerchantBusinessLicense(file: File, code?: string, uuid?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (code) formData.append('code', code);
  if (uuid) formData.append('uuid', uuid);
  const result = await requestApi<ApiResponse & { url?: string; recognized?: MerchantLicenseRecognized; verifyMessage?: string }>(
    '/shop/merchants/license',
    { method: 'POST', body: formData },
  );
  if (!result.url) throw new Error('营业执照上传失败');
  return {
    url: result.url,
    recognized: result.recognized ?? null,
    verifyMessage: result.verifyMessage,
  } satisfies MerchantLicenseUploadResult;
}

export interface MerchantLicenseVerifyResult {
  verified: boolean;
  verifyMessage?: string;
}

export async function verifyMerchantBusinessLicense(
  url: string,
  creditCode: string,
  companyName: string,
  legalPerson: string,
) {
  const result = await requestApi<ApiResponse & { verified?: boolean; verifyMessage?: string }>(
    '/shop/merchants/license/verify',
    { method: 'POST', body: JSON.stringify({ url, creditCode, companyName, legalPerson }) },
  );
  return { verified: result.verified === true, verifyMessage: result.verifyMessage } satisfies MerchantLicenseVerifyResult;
}

export async function submitMerchantApplication(body: MerchantApplicationBody) {
  const { agreeProtocol, ...application } = body;
  const result = await requestApi<ApiResponse<{ merchant: Merchant }>>(
    '/shop/merchants/apply',
    { method: 'POST', body: JSON.stringify({ ...application, protocolAgreed: agreeProtocol }) },
  );
  if (!result.data?.merchant) throw new Error('商家入驻申请提交失败');
  const lookup = { contactPhone: body.contactPhone.trim() };
  storeMerchantApplicationLookup(lookup);
  return { merchant: result.data.merchant, lookup };
}
