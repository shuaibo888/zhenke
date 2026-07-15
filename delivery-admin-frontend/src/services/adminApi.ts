import type { AdminSession, ShopMemberLevel, ShopUserAccount } from '@/types';

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

function toSession(result: AdminInfoResponse): AdminSession {
  return {
    id: result.user.userId,
    username: result.user.userName,
    name: result.user.nickName,
    loginType: 'admin',
    permissions: result.permissions,
    roles: result.roles,
  };
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
    return toSession(await requestApi<AdminInfoResponse>('/getInfo', {}, true));
  } catch (error) {
    storeToken(null);
    throw error;
  }
}

export async function restoreAdminSession() {
  if (!getToken()) return null;
  try {
    return toSession(await requestApi<AdminInfoResponse>('/getInfo', {}, true));
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
