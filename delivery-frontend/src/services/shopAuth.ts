import type { Merchant } from '@/types';
import type { AuthUser } from '@/utils/authRules';
import { getToken, storeToken, requestApi, type ApiResponse } from './apiClient';

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

export async function registerShopUser(username: string, password: string) {
  return requestApi<ApiResponse>('/shop/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username: username.trim(), password }),
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

export async function restoreShopSession() {
  if (!getToken()) return null;
  try {
    const result = await requestApi<ApiResponse<AuthUser>>('/shop/users/me', {}, true);
    return result.data ?? null;
  } catch {
    storeToken(null);
    return null;
  }
}

export async function logoutShopUser() {
  try {
    if (getToken()) await requestApi<ApiResponse>('/logout', { method: 'POST' }, true);
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

export async function changeShopPassword(oldPassword: string, newPassword: string) {
  return requestApi<ApiResponse>(
    '/shop/users/me/password',
    { method: 'PUT', body: JSON.stringify({ oldPassword, newPassword }) },
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
  code?: string;
  uuid?: string;
  companyName: string;
  companyAddress: string;
  contactName: string;
  contactPhone: string;
  businessLicense: string;
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

export async function uploadMerchantBusinessLicense(file: File, code?: string, uuid?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (code) formData.append('code', code);
  if (uuid) formData.append('uuid', uuid);
  const result = await requestApi<ApiResponse & { url?: string }>(
    '/shop/merchants/license',
    { method: 'POST', body: formData },
  );
  if (!result.url) throw new Error('营业执照上传失败');
  return result.url;
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
