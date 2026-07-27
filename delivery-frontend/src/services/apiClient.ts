const tokenStorageKey = 'zhenke_access_token';

export interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

export interface TableResponse<T> extends ApiResponse {
  rows: T[];
  total: number;
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(tokenStorageKey);
}

export function storeToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(tokenStorageKey, token);
  else window.localStorage.removeItem(tokenStorageKey);
}

export async function requestApi<T extends ApiResponse>(path: string, init: RequestInit = {}, authenticated = false): Promise<T> {
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
