import type { AuthUser } from '@/utils/authRules';

const tokenStorageKey = 'zhenke_access_token';

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

export interface CaptchaState {
  enabled: boolean;
  image: string;
  uuid: string;
}

interface LoginResponse extends ApiResponse {
  token: string;
  user: AuthUser;
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
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (authenticated) {
    const token = getToken();
    if (!token) throw new Error('登录状态已失效，请重新登录');
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`/api${path}`, { ...init, headers });
  const payload = (await response.json().catch(() => null)) as T | null;
  if (!response.ok || !payload || payload.code !== 200) {
    throw new Error(payload?.msg || '请求失败，请稍后重试');
  }
  return payload;
}

export async function registerShopUser(username: string, password: string) {
  return requestApi<ApiResponse>('/shop/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username: username.trim(), password }),
  });
}

export async function fetchShopCaptcha(): Promise<CaptchaState> {
  const result = await requestApi<CaptchaResponse>('/captchaImage');
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

export async function updateShopProfile(changes: { nickname?: string; avatar?: string }) {
  const result = await requestApi<ApiResponse<AuthUser>>(
    '/shop/users/me',
    { method: 'PUT', body: JSON.stringify(changes) },
    true,
  );
  if (!result.data) throw new Error('用户资料更新失败');
  return result.data;
}

export async function changeShopPassword(oldPassword: string, newPassword: string) {
  return requestApi<ApiResponse>(
    '/shop/users/me/password',
    { method: 'PUT', body: JSON.stringify({ oldPassword, newPassword }) },
    true,
  );
}
